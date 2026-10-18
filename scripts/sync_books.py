import asyncio
import json
import logging
from prisma import Prisma
import sys
import os
import re

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

def sync_books():
    prisma = Prisma()
    prisma.connect()

    logger.info("Starting Books Sync...")

    docs = prisma.ingest_documents.find_many(
        where={
            'document_type': 'BOOK'
        },
        include={
            'ingest_document_pages': {
                'include': {
                    'ingest_page_regions': True
                }
            }
        }
    )

    if not docs:
        logger.info("No book documents found to process.")
        prisma.disconnect()
        return

    logger.info(f"Found {len(docs)} book documents.")

    for doc in docs:
        metadata = doc.metadata_json if doc.metadata_json else {}
        if isinstance(metadata, str):
            try:
                metadata = json.loads(metadata)
            except:
                metadata = {}

        title = doc.title
        
        subject_name = metadata.get('subject', 'Unknown Subject')
        class_name = metadata.get('class_level', 'IX')

        # Create Book
        book = prisma.book.find_first(where={'sourceHash': doc.file_hash_sha256})
        if not book:
            book = prisma.book.create(
                data={
                    'title': title,
                    'subject': subject_name,
                    'className': class_name,
                    'sourceFile': doc.file_path,
                    'sourceHash': doc.file_hash_sha256,
                    'metadata': json.dumps(metadata) if metadata else None
                }
            )

        for page in doc.ingest_document_pages:
            # Create BookPage
            book_page = prisma.bookpage.find_first(where={'bookId': book.id, 'pageNumber': page.page_number})
            if not book_page:
                book_page = prisma.bookpage.create(
                    data={
                        'bookId': book.id,
                        'pageNumber': page.page_number,
                        'imagePath': page.image_path,
                        'width': page.width,
                        'height': page.height,
                        'ocrStatus': page.ocr_status,
                        'sourceHash': doc.file_hash_sha256
                    }
                )

            # Sort regions by reading order if available, else by y0
            regions = page.ingest_page_regions
            if regions:
                regions = sorted(regions, key=lambda r: r.reading_order if r.reading_order is not None else r.bbox_y0)

                # We can group contiguous text into paragraphs, or store each region as a BookContent
                current_section = "General"
                for region in regions:
                    if region.region_type in ['TITLE', 'SECTION_HEADING']:
                        current_section = region.text[:60] # limit length
                    
                    if region.region_type in ['TEXT', 'PARAGRAPH', 'LIST', 'TITLE', 'SECTION_HEADING']:
                        # Save content
                        prisma.bookcontent.create(
                            data={
                                'bookId': book.id,
                                'content': region.text,
                                'pageNumber': page.page_number,
                                'section': current_section
                            }
                        )

    logger.info("Books Sync completed successfully.")
    prisma.disconnect()

if __name__ == "__main__":
    sync_books()
