import asyncio
import json
import logging
from prisma import Prisma
import sys
import os
import re

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

def sync_past_papers():
    prisma = Prisma()
    prisma.connect()

    logger.info("Starting Past Paper Sync and Reference Tagging...")

    # 1. Base Hierarchy
    board = prisma.board.upsert(
        where={'shortCode': 'AKU-EB'},
        data={
            'create': {'name': 'Aga Khan University Examination Board', 'shortCode': 'AKU-EB', 'country': 'Pakistan'},
            'update': {}
        }
    )

    programme = prisma.programme.find_first(where={'boardId': board.id, 'name': 'SSC / HSSC'})
    if not programme:
        programme = prisma.programme.create(
            data={'boardId': board.id, 'name': 'SSC / HSSC'}
        )

    docs = prisma.ingest_documents.find_many(
        where={
            'document_type': 'PAST_PAPER'
        },
        include={
            'ingest_document_pages': {
                'include': {
                    'ingest_page_questions': True
                }
            }
        }
    )

    if not docs:
        logger.info("No past paper documents found to process.")
        prisma.disconnect()
        return

    logger.info(f"Found {len(docs)} past paper documents.")

    for doc in docs:
        metadata = doc.metadata_json if doc.metadata_json else {}
        if isinstance(metadata, str):
            try:
                metadata = json.loads(metadata)
            except:
                metadata = {}

        title = doc.title
        
        # Simple extraction for demo from title (e.g., "Physics Paper I 2023")
        exam_year = 2023
        match_year = re.search(r'\b(20\d{2})\b', title)
        if match_year:
            exam_year = int(match_year.group(1))
            
        subject_name = metadata.get('subject', 'Unknown Subject')
        if subject_name == 'Unknown Subject':
            # naive inference
            if 'physics' in title.lower(): subject_name = 'Physics'
            elif 'math' in title.lower(): subject_name = 'Mathematics'
            elif 'chemistry' in title.lower(): subject_name = 'Chemistry'

        class_name = metadata.get('class_level', 'IX')

        academic_class = prisma.academicclass.find_first(where={'name': class_name, 'programmeId': programme.id})
        if not academic_class:
            academic_class = prisma.academicclass.create(
                data={
                    'programmeId': programme.id,
                    'name': class_name,
                    'level': 9
                }
            )
            
        subject = prisma.subject.find_first(where={'name': subject_name, 'classId': academic_class.id})
        if not subject:
            subject = prisma.subject.create(
                data={
                    'classId': academic_class.id,
                    'name': subject_name
                }
            )

        paper_type = 'MCQ'
        if 'Paper II' in title or 'Paper 2' in title:
            paper_type = 'CRQ_ERQ'
        
        # Create PastPaper
        past_paper = prisma.pastpaper.create(
            data={
                'boardId': board.id,
                'classId': academic_class.id,
                'subjectId': subject.id,
                'examYear': exam_year,
                'title': title,
                'examSession': 'ANNUAL',
                'sourceFile': doc.file_path,
                'sourceHash': doc.file_hash_sha256,
                'pageCount': doc.total_pages
            }
        )

        for page in doc.ingest_document_pages:
            for pq in page.ingest_page_questions:
                # 1. Create Universal Question
                # Handle Options
                options_data = []
                if pq.options:
                    raw_opts = pq.options
                    if isinstance(raw_opts, str):
                        raw_opts = json.loads(raw_opts)
                    for idx, opt in enumerate(raw_opts):
                        options_data.append({
                            'text': opt.get('text', ''),
                            'isCorrect': False # Needs AI to solve
                        })

                q_type = 'MCQ_SINGLE'
                if pq.question_type == 'CRQ': q_type = 'CRQ'
                elif pq.question_type == 'ERQ': q_type = 'ERQ'
                
                universal_question = prisma.question.create(
                    data={
                        'questionType': q_type,
                        'difficulty': 'MEDIUM',
                        'stemText': pq.question_text,
                        'options': {
                            'create': options_data
                        },
                    }
                )

                # 2. EXACT REFERENCE TAGGING
                # Construct exact reference string
                paper_name = f"{board.shortCode} {exam_year} {subject_name} Paper {1 if paper_type == 'MCQ' else 2}"
                reference_text = f"{paper_name}, Page {page.page_number}"
                
                prisma.questionsource.create(
                    data={
                        'questionId': universal_question.id,
                        'sourceType': 'PAST_PAPER',
                        'sourceId': past_paper.id,
                        'pageNumber': page.page_number,
                        'evidenceText': reference_text,
                        'region': json.dumps({
                            'x0': pq.bbox_x0,
                            'y0': pq.bbox_y0,
                            'x1': pq.bbox_x1,
                            'y1': pq.bbox_y1
                        })
                    }
                )

                # 3. Create PastPaperQuestion
                prisma.pastpaperquestion.create(
                    data={
                        'pastPaperId': past_paper.id,
                        'questionNumber': pq.question_number or "1",
                        'subQuestionNumber': pq.sub_question_number,
                        'section': pq.section,
                        'questionText': pq.question_text,
                        'normalizedQuestionText': pq.question_text.lower(),
                        'questionType': q_type,
                        'marks': pq.marks,
                        'pageNumber': page.page_number,
                        'syllabusVersionId': pq.syllabus_version_id
                    }
                )
                
    logger.info("Past Paper Sync and Reference Tagging completed successfully.")
    prisma.disconnect()

if __name__ == "__main__":
    sync_past_papers()
