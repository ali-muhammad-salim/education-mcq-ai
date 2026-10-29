import os
import re
import glob
import logging
import uuid
from datetime import datetime, timezone
import psycopg2
import psycopg2.extras
import pymupdf
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

def get_db_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

def parse_pdf_title(pdf_path: str):
    filename = os.path.basename(pdf_path)
    year_match = re.search(r'20\d{2}', filename)
    year = int(year_match.group(0)) if year_match else datetime.now().year
    
    programme_name = "SSC"
    if "HSSC" in filename:
        programme_name = "HSSC"
        
    subject = os.path.basename(os.path.dirname(pdf_path))
                
    return year, programme_name, subject

def extract_tables_from_pdf(pdf_path: str):
    try:
        doc = pymupdf.open(pdf_path)
        _ = len(doc)
    except Exception as e:
        logger.error(f"Failed to open or read {pdf_path}: {e}")
        return {}

    current_class_name = None
    extracted_data = {}
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text")
        if re.search(r'\bPart I \(Grade IX\)\b', text) or re.search(r'\bGrade IX\b', text):
            current_class_name = "Class IX"
        elif re.search(r'\bPart II \(Grade X\)\b', text) or re.search(r'\bGrade X\b', text):
            current_class_name = "Class X"
        elif re.search(r'\bPart I \(Grade XI\)\b', text) or re.search(r'\bGrade XI\b', text):
            current_class_name = "Class XI"
        elif re.search(r'\bPart II \(Grade XII\)\b', text) or re.search(r'\bGrade XII\b', text):
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
                clean_row = [str(x).encode('ascii', 'ignore').decode('ascii').replace('\n', ' ').strip() if x else '' for x in row]
                if not any(clean_row):
                    continue
                if len(clean_row) >= 3:
                    extracted_data[current_class_name].append(clean_row)
                    
    return extracted_data

def process_extracted_rows(rows):
    topics = []
    current_topic = None
    current_subtopic = None
    
    for row in rows:
        col0 = row[0]
        col1 = row[1] if len(row) > 1 else ""
        col2 = row[2] if len(row) > 2 else ""
        
        if "Topics and Sub-topics" in col0 or "Student Learning Outcomes" in col2:
            continue
            
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
        
        slo_codes = re.findall(r'\d+\.\d+\.\d+', col1)
        if slo_codes and current_subtopic:
            desc = col2
            cog_level = None
            if len(row) >= 6:
                if '*' in row[3] or 'FA' in row[3]: cog_level = 'K'
                elif '*' in row[4] or 'FA' in row[4]: cog_level = 'U'
                elif '*' in row[5] or 'FA' in row[5]: cog_level = 'A'
                
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
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    pdf_dir = r"C:\Users\Mak Tech\OneDrive\Desktop\MCQS PROJECT\data\raw_pdfs\AKU-EB\Syllabus"
    pdfs = glob.glob(os.path.join(pdf_dir, "**", "*.pdf"), recursive=True)
    
    if not pdfs:
        logger.error("No PDFs found!")
        return

    # Board
    cur.execute("SELECT id FROM \"Board\" WHERE \"shortCode\" = 'AKU-EB'")
    board = cur.fetchone()
    if not board:
        board_id = str(uuid.uuid4())
        cur.execute(
            "INSERT INTO \"Board\" (id, name, \"shortCode\", country, status, \"createdAt\", \"updatedAt\") VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (board_id, 'Aga Khan University Examination Board', 'AKU-EB', 'Pakistan', 'ACTIVE', datetime.now(timezone.utc), datetime.now(timezone.utc))
        )
    else:
        board_id = board['id']

    for pdf_path in pdfs:
        year, prog_name, subject_name = parse_pdf_title(pdf_path)
        filename = os.path.basename(pdf_path)
        logger.info(f"Processing: {filename} -> {year} {prog_name} {subject_name}")
        
        prog_full_name = f"{prog_name} (AKU-EB)"
        cur.execute("SELECT id FROM \"Programme\" WHERE \"boardId\" = %s AND name = %s", (board_id, prog_full_name))
        programme = cur.fetchone()
        if not programme:
            prog_id = str(uuid.uuid4())
            cur.execute("INSERT INTO \"Programme\" (id, \"boardId\", name) VALUES (%s, %s, %s)", (prog_id, board_id, prog_full_name))
        else:
            prog_id = programme['id']
            
        extracted_data = extract_tables_from_pdf(pdf_path)
        
        for class_name, rows in extracted_data.items():
            if "XII" in class_name: 
                level = 12
            elif "XI" in class_name: 
                level = 11
            elif "IX" in class_name: 
                level = 9
            elif "X" in class_name: 
                level = 10
            else:
                continue

            if prog_name == "SSC" and level > 10:
                continue
            if prog_name == "HSSC" and level < 11:
                continue
            
            cur.execute("SELECT id FROM \"Class\" WHERE \"programmeId\" = %s AND name = %s", (prog_id, class_name))
            academic_class = cur.fetchone()
            if not academic_class:
                class_id = str(uuid.uuid4())
                cur.execute("INSERT INTO \"Class\" (id, \"programmeId\", name, level) VALUES (%s, %s, %s, %s)", (class_id, prog_id, class_name, level))
            else:
                class_id = academic_class['id']
                
            cur.execute("SELECT id FROM \"Subject\" WHERE \"classId\" = %s AND name = %s", (class_id, subject_name))
            subject = cur.fetchone()
            if not subject:
                subj_id = str(uuid.uuid4())
                cur.execute("INSERT INTO \"Subject\" (id, \"classId\", name) VALUES (%s, %s, %s)", (subj_id, class_id, subject_name))
            else:
                subj_id = subject['id']
                
            version_name = f"{year}-{year+3}"
            valid_from = datetime(year, 1, 1, tzinfo=timezone.utc)
            valid_to = datetime(year+3, 12, 31, tzinfo=timezone.utc)
            
            cur.execute("SELECT id FROM \"SyllabusVersion\" WHERE \"subjectId\" = %s AND \"versionName\" = %s", (subj_id, version_name))
            syllabus_version = cur.fetchone()
            if not syllabus_version:
                syll_id = str(uuid.uuid4())
                cur.execute("INSERT INTO \"SyllabusVersion\" (id, \"subjectId\", \"versionName\", \"validFrom\", \"validTo\", \"isLatest\", \"createdAt\") VALUES (%s, %s, %s, %s, %s, %s, %s)",
                           (syll_id, subj_id, version_name, valid_from, valid_to, True, datetime.now(timezone.utc)))
            else:
                syll_id = syllabus_version['id']
                
            topics = process_extracted_rows(rows)
            for t in topics:
                cur.execute("SELECT id FROM \"Topic\" WHERE \"syllabusVersionId\" = %s AND \"topicNumber\" = %s", (syll_id, t["topicNumber"]))
                topic = cur.fetchone()
                if not topic:
                    topic_id = str(uuid.uuid4())
                    cur.execute("INSERT INTO \"Topic\" (id, \"syllabusVersionId\", name, \"topicNumber\") VALUES (%s, %s, %s, %s)", (topic_id, syll_id, t["name"], t["topicNumber"]))
                else:
                    topic_id = topic['id']
                    
                for st in t["subtopics"]:
                    cur.execute("SELECT id FROM \"Subtopic\" WHERE \"topicId\" = %s AND \"subtopicNum\" = %s", (topic_id, st["subtopicNum"]))
                    subtopic = cur.fetchone()
                    if not subtopic:
                        subtopic_id = str(uuid.uuid4())
                        cur.execute("INSERT INTO \"Subtopic\" (id, \"topicId\", name, \"subtopicNum\") VALUES (%s, %s, %s, %s)", (subtopic_id, topic_id, st["name"], st["subtopicNum"]))
                    else:
                        subtopic_id = subtopic['id']
                        
                    for slo_data in st["slos"]:
                        cur.execute("SELECT id FROM \"SLO\" WHERE \"subtopicId\" = %s AND code = %s", (subtopic_id, slo_data["code"]))
                        existing_slo = cur.fetchone()
                        if existing_slo:
                            cur.execute("UPDATE \"SLO\" SET description = %s, \"cognitiveLevel\" = %s WHERE id = %s", 
                                       (slo_data["description"], slo_data["cognitiveLevel"], existing_slo['id']))
                        else:
                            slo_id = str(uuid.uuid4())
                            cur.execute("INSERT INTO \"SLO\" (id, \"subtopicId\", code, description, \"cognitiveLevel\", \"isPractical\", \"isFormative\") VALUES (%s, %s, %s, %s, %s, %s, %s)",
                                       (slo_id, subtopic_id, slo_data["code"], slo_data["description"], slo_data["cognitiveLevel"], slo_data["isPractical"], False))
            logger.info(f"Ingested {len(topics)} topics for {class_name} {subject_name} {version_name}")
            
    conn.commit()
    cur.close()
    conn.close()
    logger.info("Ingestion completed successfully.")

if __name__ == "__main__":
    run_ingestion()
