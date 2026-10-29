import asyncio
import json
import logging
from prisma import Prisma
import sys
import os
import re
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

def parse_title(title: str):
    """Attempt to derive subject, class, and year from title."""
    # E.g. Biology HSSC I Syllabus 2025
    year_match = re.search(r'20\d{2}', title)
    year = int(year_match.group(0)) if year_match else datetime.now().year
    
    parts = title.split()
    subject_name = parts[0] if parts else "Unknown Subject"
    class_name = "Unknown Class"
    level = 9
    
    if "HSSC" in title:
        class_name = "HSSC"
        level = 11 if " I " in title or " XI" in title else 12
    elif "SSC" in title:
        class_name = "SSC"
        level = 9 if " I " in title or " IX" in title else 10
    
    return subject_name, class_name, level, year

def build_graph():
    prisma = Prisma()
    prisma.connect()

    logger.info("Building AKU-EB Curriculum Knowledge Graph...")

    board = prisma.board.upsert(
        where={'shortCode': 'AKU-EB'},
        data={
            'create': {'name': 'Aga Khan University Examination Board', 'shortCode': 'AKU-EB', 'country': 'Pakistan'},
            'update': {}
        }
    )

    prog_name = 'SSC / HSSC'
    programme = prisma.programme.find_first(where={'boardId': board.id, 'name': prog_name})
    if not programme:
        programme = prisma.programme.create(data={'boardId': board.id, 'name': prog_name})
    
    docs = prisma.ingest_documents.find_many(
        where={'document_type': 'CURRICULUM'}
    )

    if not docs:
        logger.info("No curriculum documents found to process.")
        prisma.disconnect()
        return

    logger.info(f"Found {len(docs)} curriculum documents.")

    created_slos = 0
    updated_slos = 0

    for doc in docs:
        metadata = doc.metadata_json
        if not metadata or not isinstance(metadata, dict):
            continue
            
        curriculum_data = metadata.get('curriculum_data')
        if not curriculum_data:
            continue
            
        title = doc.title or "Unknown"
        subject_name, class_name, level, year = parse_title(title)
        
        academic_class = prisma.academicclass.find_first(where={'programmeId': programme.id, 'name': class_name})
        if not academic_class:
            academic_class = prisma.academicclass.create(data={'programmeId': programme.id, 'name': class_name, 'level': level})
        
        subject = prisma.subject.find_first(where={'classId': academic_class.id, 'name': subject_name})
        if not subject:
            subject = prisma.subject.create(data={'classId': academic_class.id, 'name': subject_name})
        
        version_name = f"{title} Version"
        valid_from = datetime(year, 1, 1, tzinfo=timezone.utc)
        
        syllabus_version = prisma.syllabusversion.find_first(where={'subjectId': subject.id, 'versionName': version_name})
        if not syllabus_version:
            syllabus_version = prisma.syllabusversion.create(data={
                'subjectId': subject.id,
                'versionName': version_name,
                'validFrom': valid_from
            })
        
        topics = curriculum_data.get('topics', [])
        for t in topics:
            t_name = t.get('name', 'Unknown Topic')
            t_num = str(t.get('topicNumber', ''))
            
            topic = prisma.topic.find_first(where={'syllabusVersionId': syllabus_version.id, 'topicNumber': t_num})
            if not topic:
                topic = prisma.topic.create(data={'syllabusVersionId': syllabus_version.id, 'name': t_name, 'topicNumber': t_num})
            
            subtopics = t.get('subtopics', [])
            for st in subtopics:
                st_name = st.get('name', 'Unknown Subtopic')
                st_num = str(st.get('subtopicNumber', ''))
                
                subtopic = prisma.subtopic.find_first(where={'topicId': topic.id, 'subtopicNum': st_num})
                if not subtopic:
                    subtopic = prisma.subtopic.create(data={'topicId': topic.id, 'name': st_name, 'subtopicNum': st_num})
                
                slos = st.get('slos', [])
                for slo_data in slos:
                    slo_code = slo_data.get('code') or slo_data.get('sloCode')
                    slo_desc = slo_data.get('description', 'No description')
                    cog_level = slo_data.get('cognitiveLevel')
                    is_practical = bool(slo_data.get('practical') or slo_data.get('isPractical', False))
                    
                    data = {
                        'description': slo_desc,
                        'cognitiveLevel': cog_level,
                        'isPractical': is_practical
                    }
                    
                    existing_slo = prisma.slo.find_first(where={'subtopicId': subtopic.id, 'code': slo_code}) if slo_code else None
                    if not existing_slo and not slo_code:
                        # Fallback to description if no code
                        existing_slo = prisma.slo.find_first(where={'subtopicId': subtopic.id, 'description': slo_desc})

                    if existing_slo:
                        slo = prisma.slo.update(where={'id': existing_slo.id}, data=data)
                        updated_slos += 1
                    else:
                        slo = prisma.slo.create(data={
                            'subtopicId': subtopic.id,
                            'code': slo_code,
                            'description': slo_desc,
                            'cognitiveLevel': cog_level,
                            'isPractical': is_practical
                        })
                        created_slos += 1
                    
                    # Process Command Words
                    cmd_words = slo_data.get('commandWords', [])
                    if isinstance(cmd_words, str):
                        cmd_words = [cmd_words]
                    
                    for cw in cmd_words:
                        if not cw:
                            continue
                        command_word = prisma.commandword.upsert(
                            where={'word': cw.strip()},
                            data={'create': {'word': cw.strip()}, 'update': {}}
                        )
                        prisma.slo.update(
                            where={'id': slo.id},
                            data={'commandWords': {'connect': [{'id': command_word.id}]}}
                        )
                        
    logger.info(f"Knowledge Graph built successfully. {created_slos} SLOs created, {updated_slos} SLOs updated.")
    prisma.disconnect()

if __name__ == "__main__":
    build_graph()
