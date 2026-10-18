
import os
import re
import glob
import logging
from datetime import datetime, timezone
import pymupdf
from prisma import Prisma

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

def parse_pdf_title(filename: str):
    """Extract Year, Subject, and Class ranges from the filename."""
    # E.g. 2025_SSC-I_Biology-IX-X-Syllabus-2025.pdf
    year_match = re.search(r'20\d{2}', filename)
    year = int(year_match.group(0)) if year_match else datetime.now().year
    
    parts = filename.replace('.pdf', '').split('_')
    
    programme_name = "SSC"
    if "HSSC" in filename:
        programme_name = "HSSC"
        
    subject = "Unknown"
    for p in parts:
        if "Syllabus" not in p and p not in ["2022", "2024", "2025", "2026", "2027"] and "SSC" not in p and "HSSC" not in p and "Examinations" not in p and "ALL" not in p and "EXAMS" not in p:
            subject = p.replace("-IX-X", "").replace("-XI-XII", "").replace("-IX", "").replace("-X", "").replace("-XI", "").replace("-XII", "").replace("-", " ")
            if subject.strip():
                break
                
    return year, programme_name, subject.strip()

def extract_tables_from_pdf(pdf_path: str):
    """Use pymupdf to extract SLO tables, handling Grade IX/X splits."""
    doc = pymupdf.open(pdf_path)
    current_class_name = None
    extracted_data = {}
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        
        # Check for class heading in text
        text = page.get_text("text")
        if "Part I (Grade IX)" in text or "Grade IX" in text:
            current_class_name = "Class IX"
        elif "Part II (Grade X)" in text or "Grade X" in text:
            current_class_name = "Class X"
        elif "Part I (Grade XI)" in text or "Grade XI" in text:
            current_class_name = "Class XI"
        elif "Part II (Grade XII)" in text or "Grade XII" in text:
            current_class_name = "Class XII"
            
        if not current_class_name:
            continue
            
        if current_class_name not in extracted_data:
            extracted_data[current_class_name] = []
            
        tables = page.find_tables()
        if not tables or not tables.tables:
            continue
            
        for t in tables.tables:
            extracted_table = t.extract()
            for row in extracted_table:
                # Clean row
                clean_row = [str(x).encode('ascii', 'ignore').decode('ascii').replace('\n', ' ').strip() if x else '' for x in row]
                if not any(clean_row):
                    continue
                    
                # We expect columns: Topic/Subtopic, SLO Code, Description, K/U/A
                if len(clean_row) >= 3:
                    extracted_data[current_class_name].append(clean_row)
                    
    return extracted_data

def process_extracted_rows(rows):
    """Convert raw table rows into structured topics, subtopics, and SLOs."""
    topics = []
    current_topic = None
    current_subtopic = None
    
    for row in rows:
        col0 = row[0]
        col1 = row[1] if len(row) > 1 else ""
        col2 = row[2] if len(row) > 2 else ""
        
        # Check if this is a header row
        if "Topics and Sub-topics" in col0 or "Student Learning Outcomes" in col2:
            continue
            
        # Detect Topic vs Subtopic vs SLO
        # A topic usually starts with a single number (e.g., "1. Introduction to Biology")
        topic_match = re.match(r'^(\d+)\.\s*(.+)', col0)
        subtopic_match = re.match(r'^(\d+\.\d+)\s*(.+)', col0)
        
        if topic_match and not subtopic_match:
            current_topic = {
                "name": topic_match.group(2).strip(),
                "topicNumber": topic_match.group(1),
                "subtopics": []
            }
            topics.append(current_topic)
            current_subtopic = None
        elif subtopic_match:
            if current_topic:
                current_subtopic = {
                    "name": subtopic_match.group(2).strip(),
                    "subtopicNum": subtopic_match.group(1),
                    "slos": []
                }
                current_topic["subtopics"].append(current_subtopic)
        
        # SLOs are in col1 and col2
        slo_codes = re.findall(r'\d+\.\d+\.\d+', col1)
        if slo_codes and current_subtopic:
            desc = col2
            
            # Determine cognitive level from the remaining columns
            cog_level = None
            if len(row) >= 6:
                if '*' in row[3] or 'FA' in row[3]: cog_level = 'K' # Remember
                elif '*' in row[4] or 'FA' in row[4]: cog_level = 'U' # Understand
                elif '*' in row[5] or 'FA' in row[5]: cog_level = 'A' # Apply
            elif len(row) >= 4:
                # Some tables might have K U A compressed
                pass
                
            is_practical = False
            
            for code in slo_codes:
                current_subtopic["slos"].append({
                    "code": code,
                    "description": desc,
                    "cognitiveLevel": cog_level,
                    "isPractical": is_practical
                })
                
    return topics

def run_ingestion():
    prisma = Prisma()
    prisma.connect()
    
    pdf_dir = r"C:\Users\Mak Tech\OneDrive\Desktop\MCQS PROJECT\data\raw_pdfs\AKU-EB\Syllabus\Biology"
    pdfs = glob.glob(os.path.join(pdf_dir, "*.pdf"))
    
    if not pdfs:
        logger.error("No PDFs found!")
        return

    # 1. Ensure Board and Programme exist
    board = prisma.board.upsert(
        where={'shortCode': 'AKU-EB'},
        data={
            'create': {'name': 'Aga Khan University Examination Board', 'shortCode': 'AKU-EB', 'country': 'Pakistan'},
            'update': {}
        }
    )
    
    for pdf_path in pdfs:
        filename = os.path.basename(pdf_path)
        year, prog_name, subject_name = parse_pdf_title(filename)
        logger.info(f"Processing: {filename} -> {year} {prog_name} {subject_name}")
        
        programme = prisma.programme.find_first(where={'boardId': board.id, 'name': f"{prog_name} (AKU-EB)"})
        if not programme:
            programme = prisma.programme.create(data={'boardId': board.id, 'name': f"{prog_name} (AKU-EB)"})
            
        extracted_data = extract_tables_from_pdf(pdf_path)
        
        for class_name, rows in extracted_data.items():
            level = 9
            if "IX" in class_name: level = 9
            elif "X" in class_name and "IX" not in class_name: level = 10
            elif "XI" in class_name: level = 11
            elif "XII" in class_name: level = 12
            
            academic_class = prisma.academicclass.find_first(where={'programmeId': programme.id, 'name': class_name})
            if not academic_class:
                academic_class = prisma.academicclass.create(data={'programmeId': programme.id, 'name': class_name, 'level': level})
                
            subject = prisma.subject.find_first(where={'classId': academic_class.id, 'name': subject_name})
            if not subject:
                subject = prisma.subject.create(data={'classId': academic_class.id, 'name': subject_name})
                
            version_name = f"{year}-{year+3}"
            valid_from = datetime(year, 1, 1, tzinfo=timezone.utc)
            valid_to = datetime(year+3, 12, 31, tzinfo=timezone.utc)
            
            syllabus_version = prisma.syllabusversion.find_first(where={'subjectId': subject.id, 'versionName': version_name})
            if not syllabus_version:
                syllabus_version = prisma.syllabusversion.create(data={
                    'subjectId': subject.id,
                    'versionName': version_name,
                    'validFrom': valid_from,
                    'validTo': valid_to,
                    'isLatest': True
                })
                
            topics = process_extracted_rows(rows)
            for t in topics:
                topic = prisma.topic.find_first(where={'syllabusVersionId': syllabus_version.id, 'topicNumber': t["topicNumber"]})
                if not topic:
                    topic = prisma.topic.create(data={'syllabusVersionId': syllabus_version.id, 'name': t["name"], 'topicNumber': t["topicNumber"]})
                    
                for st in t["subtopics"]:
                    subtopic = prisma.subtopic.find_first(where={'topicId': topic.id, 'subtopicNum': st["subtopicNum"]})
                    if not subtopic:
                        subtopic = prisma.subtopic.create(data={'topicId': topic.id, 'name': st["name"], 'subtopicNum': st["subtopicNum"]})
                        
                    for slo_data in st["slos"]:
                        existing_slo = prisma.slo.find_first(where={'subtopicId': subtopic.id, 'code': slo_data["code"]})
                        if existing_slo:
                            prisma.slo.update(where={'id': existing_slo.id}, data={
                                'description': slo_data["description"],
                                'cognitiveLevel': slo_data["cognitiveLevel"]
                            })
                        else:
                            prisma.slo.create(data={
                                'subtopicId': subtopic.id,
                                'code': slo_data["code"],
                                'description': slo_data["description"],
                                'cognitiveLevel': slo_data["cognitiveLevel"],
                                'isPractical': slo_data["isPractical"]
                            })
            logger.info(f"Ingested {len(topics)} topics for {class_name} {subject_name} {version_name}")

    prisma.disconnect()
    logger.info("Ingestion completed successfully.")

if __name__ == "__main__":
    run_ingestion()
