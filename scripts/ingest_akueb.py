import json
import os
import time
import httpx
import argparse
import logging
import sys
from pathlib import Path
from urllib.parse import urlparse

# Setup basic logging for the script
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)
import importlib

# Dynamically add cuDNN and CUDA bin to PATH on Windows so Paddle C++ backend finds them
if os.name == "nt":
    packages = ["nvidia.cudnn", "nvidia.cublas", "nvidia.cuda_nvrtc", "nvidia.cuda_runtime"]
    paths = []
    for pkg in packages:
        try:
            m = importlib.import_module(pkg)
            bin_dir = os.path.join(os.path.dirname(m.__file__), "bin")
            if os.path.exists(bin_dir):
                paths.append(bin_dir)
        except ImportError:
            pass
    if paths:
        os.environ["PATH"] = ";".join(paths) + ";" + os.environ["PATH"]
        logger.info(f"Added NVIDIA DLL directories to PATH: {paths}")

# Add project root to sys.path so 'services' module can be imported natively
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import the existing pipeline
from services.ingestion.pipeline import IngestionPipeline

def download_file(url: str, dest_dir: Path) -> Path | None:
    """Downloads a file from a URL to the destination directory."""
    try:
        parsed_url = urlparse(url)
        filename = os.path.basename(parsed_url.path)
        if not filename:
            filename = "downloaded_file.pdf"
            
        dest_path = dest_dir / filename
        
        # Avoid redownloading if it exists
        if dest_path.exists():
            logger.info(f"File already exists: {dest_path}")
            return dest_path
            
        logger.info(f"Downloading {url} to {dest_path}...")
        with httpx.Client(timeout=30.0, follow_redirects=True) as client:
            response = client.get(url)
            response.raise_for_status()
            with open(dest_path, "wb") as f:
                f.write(response.content)
                
        return dest_path
    except Exception as e:
        logger.error(f"Failed to download {url}: {e}")
        return None

def map_type_to_doc_type(resource_type: str) -> str:
    """Maps AKU-EB resource type to Pipeline DocumentType."""
    rt = resource_type.lower()
    if "past paper" in rt or "model paper" in rt:
        return "PAST_PAPER"
    elif "syllabus" in rt:
        return "CURRICULUM"
    else:
        return "BOOK"

def run_ingestion(manifest_path: str, limit: int = None, test_mode: bool = False, force: bool = False):
    """Reads manifest, downloads files, and runs ingestion pipeline."""
    manifest_file = Path(manifest_path)
    if not manifest_file.exists():
        logger.error(f"Manifest file not found: {manifest_file}")
        return
        
    download_dir = Path("data/downloads")
    download_dir.mkdir(parents=True, exist_ok=True)
    
    # Init Pipeline
    try:
        # We assume the database is configured in the environment
        pipeline = IngestionPipeline(create_db_tables=True)
    except Exception as e:
        logger.error(f"Failed to initialize IngestionPipeline: {e}")
        return

    # Load manifest
    resources = []
    with open(manifest_file, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                resources.append(json.loads(line))
                
    if limit:
        resources = resources[:limit]
        
    logger.info(f"Loaded {len(resources)} resources to process.")
    
    stats = {
        "total_files_downloaded": 0,
        "total_pages_processed": 0,
        "failed_documents": 0,
        "duplicate_documents": 0,
        "extracted_questions": 0,
        "model_papers": 0,
        "answer_keys": 0,
        "emarking_notes": 0,
        "syllabi": 0,
        "total_time_seconds": 0
    }
    
    start_time = time.time()
    
    for resource in resources:
        try:
            url = resource.get("url")
            if not url or "drive.google" in url:
                logger.warning(f"Skipping unsupported URL: {url}")
                stats["failed_documents"] += 1
                continue
                
            rtype = resource.get("type", "")
            
            # Update specific stats based on resource type
            if "Model Paper" in rtype:
                stats["model_papers"] += 1
            elif "Answer Key" in rtype:
                stats["answer_keys"] += 1
            elif "E-marking Notes" in rtype:
                stats["emarking_notes"] += 1
            elif "Syllabus" in rtype:
                stats["syllabi"] += 1
                
            # Download file
            file_path = download_file(url, download_dir)
            if not file_path:
                stats["failed_documents"] += 1
                continue
                
            stats["total_files_downloaded"] += 1
            
            # Map type
            doc_type = map_type_to_doc_type(rtype)
            
            if test_mode:
                logger.info(f"[TEST MODE] Would process {file_path} as {doc_type}")
                continue
                
            # Run Pipeline
            logger.info(f"Running pipeline on {file_path}...")
            result = pipeline.run(
                file_path=file_path,
                doc_type=doc_type,
                title=resource.get("title"),
                force=force,
                metadata=resource,
            )
            
            if getattr(result, 'pages_processed', 0) == 0 and result.total_pages == 0:
                # Typically means it was a duplicate and skipped
                stats["duplicate_documents"] += 1
                
            stats["total_pages_processed"] += getattr(result, 'pages_processed', 0)
            stats["extracted_questions"] += getattr(result, 'total_questions', 0)
            
        except Exception as e:
            logger.error(f"Error processing resource {url}: {e}")
            stats["failed_documents"] += 1

    stats["total_time_seconds"] = time.time() - start_time
    
    # Print and save report
    report_path = Path("docs/INGESTION_REPORT.md")
    report_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# Ingestion Report\n\n")
        for key, value in stats.items():
            f.write(f"- **{key.replace('_', ' ').title()}**: {value}\n")
            logger.info(f"{key}: {value}")
            
    logger.info(f"Ingestion complete. Report saved to {report_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest AKU-EB Resources")
    parser.add_argument("--manifest", type=str, default="data/source_manifest.jsonl", help="Path to manifest JSONL")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of resources to process")
    parser.add_argument("--test", action="store_true", help="Run in test mode (no pipeline execution)")
    parser.add_argument("--force", action="store_true", help="Force reprocess even if already exists")
    args = parser.parse_args()
    
    run_ingestion(args.manifest, limit=args.limit, test_mode=args.test, force=args.force)
