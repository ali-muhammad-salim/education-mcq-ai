import os
import json
import uuid
import fitz
from sqlalchemy import create_engine, text

DB_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/mcqs")
engine = create_engine(DB_URL)
DATA_DIR = r"data\physics"
os.makedirs(DATA_DIR, exist_ok=True)

def export_curriculum():
    with engine.connect() as conn:
        for level, filename in [(9, "ssc1_curriculum.json"), (10, "ssc2_curriculum.json")]:
            q = """
                SELECT 
                    t.id as topic_id, t.name as topic_name, t."topicNumber" as topic_num,
                    sub.id as subtopic_id, sub.name as subtopic_name, sub."subtopicNum" as subtopic_num,
                    slo.id as slo_id, slo.code as slo_code, slo.description as slo_desc, 
                    slo."cognitiveLevel" as cog_level, slo."isPractical" as is_practical
                FROM "Topic" t
                JOIN "SyllabusVersion" sv ON t."syllabusVersionId" = sv.id
                JOIN "Subject" s ON sv."subjectId" = s.id
                JOIN "Class" c ON s."classId" = c.id
                LEFT JOIN "Subtopic" sub ON sub."topicId" = t.id
                LEFT JOIN "SLO" slo ON slo."subtopicId" = sub.id
                WHERE c.level = :lvl AND sv."versionName" = '2026-2029'
                ORDER BY t."topicNumber", sub."subtopicNum", slo.code
            """
            rows = conn.execute(text(q), {"lvl": level}).fetchall()
            
            topics_map = {}
            for r in rows:
                tid = r.topic_id
                if tid not in topics_map:
                    topics_map[tid] = {
                        "id": tid,
                        "name": r.topic_name,
                        "topicNumber": r.topic_num,
                        "subtopics": {}
                    }
                if r.subtopic_id:
                    sub_id = r.subtopic_id
                    if sub_id not in topics_map[tid]["subtopics"]:
                        topics_map[tid]["subtopics"][sub_id] = {
                            "id": sub_id,
                            "name": r.subtopic_name,
                            "subtopicNum": r.subtopic_num,
                            "slos": []
                        }
                    if r.slo_id:
                        topics_map[tid]["subtopics"][sub_id]["slos"].append({
                            "id": r.slo_id,
                            "code": r.slo_code,
                            "description": r.slo_desc,
                            "cognitiveLevel": r.cog_level,
                            "isPractical": r.is_practical
                        })
            
            # Format as list
            result = []
            for tid, tdata in topics_map.items():
                tdata["subtopics"] = list(tdata["subtopics"].values())
                result.append(tdata)
                
            out_path = os.path.join(DATA_DIR, filename)
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(result, f, indent=2)
            print(f"Exported {len(result)} topics to {out_path}")

def parse_pacing_and_resources():
    # SSC-I Pacing Summary
    ssc1_pacing = [
        {"week": "Weeks 1-3", "topic": "1. Measurements", "periods": 12, "sloRange": "1.1.1 - 1.7.2", "assessment": "Practical measurement with vernier callipers and screw gauge, error analysis.", "resources": "PCTB Physics 9 (Unit 1), Cantab Model Textbook"},
        {"week": "Weeks 4-7", "topic": "2. Kinematics", "periods": 16, "sloRange": "2.1.1 - 2.5.4", "assessment": "Distance-time and velocity-time graphs analysis, equation of motions derivation.", "resources": "PCTB Unit 2, PhET Motion Simulation"},
        {"week": "Weeks 8-11", "topic": "3. Dynamics", "periods": 16, "sloRange": "3.1.1 - 3.7.2", "assessment": "Newton's Laws problem solving, friction experiment, Atwood's machine lab.", "resources": "PCTB Unit 3, Heinemann Physics"},
        {"week": "Weeks 12-14", "topic": "4. Turning Effect of Forces", "periods": 12, "sloRange": "4.1.1 - 4.6.2", "assessment": "Torque and principle of moments experiment using metre rule, centre of gravity tests.", "resources": "PCTB Unit 4, O-Level Physics by Charles Chew"},
        {"week": "Weeks 15-17", "topic": "5. Gravitation", "periods": 12, "sloRange": "5.1.1 - 5.4.3", "assessment": "Law of universal gravitation calculations, mass of Earth estimation, satellite orbital speed.", "resources": "PCTB Unit 5, STBB Physics 9"},
        {"week": "Weeks 18-21", "topic": "6. Work and Energy", "periods": 16, "sloRange": "6.1.1 - 6.6.3", "assessment": "Kinetic vs Potential energy lab, efficiency calculations, renewable energy sources study.", "resources": "PCTB Unit 6, Physics Classroom"},
        {"week": "Weeks 22-25", "topic": "7. Properties of Matter", "periods": 16, "sloRange": "7.1.1 - 7.7.3", "assessment": "Density determination of irregular solids, Hooke's Law spring experiment, atmospheric pressure.", "resources": "PCTB Unit 7, John Avison"},
        {"week": "Weeks 26-28", "topic": "8. Thermal Properties of Matter", "periods": 12, "sloRange": "8.1.1 - 8.6.2", "assessment": "Specific heat capacity calculations, latent heat of fusion of ice graph experiment.", "resources": "PCTB Unit 8, Practical Paper III Guide"}
    ]
    with open(os.path.join(DATA_DIR, "ssc1_pacing.json"), "w", encoding="utf-8") as f:
        json.dump(ssc1_pacing, f, indent=2)

    # SSC-II Pacing Summary
    ssc2_pacing = [
        {"week": "Weeks 1-3", "topic": "10. Simple Harmonic Motion and Waves", "periods": 12, "sloRange": "10.1.1 - 10.5.2", "assessment": "Simple pendulum time-period experiment, ripple tank demonstration of reflection/refraction.", "resources": "PCTB Physics 10 (Unit 10), STBB Unit 10"},
        {"week": "Weeks 4-6", "topic": "11. Sound", "periods": 12, "sloRange": "11.1.1 - 11.5.3", "assessment": "Speed of sound resonance tube experiment, echo calculation, ultrasound applications in medicine.", "resources": "PCTB Unit 11, PhET Sound Simulation"},
        {"week": "Weeks 7-10", "topic": "12. Geometrical Optics", "periods": 16, "sloRange": "12.1.1 - 12.8.3", "assessment": "Focal length of concave mirror and convex lens lab, Snell's law refraction, critical angle.", "resources": "PCTB Unit 12, Heinemann Physics"},
        {"week": "Weeks 11-14", "topic": "13. Electrostatics", "periods": 16, "sloRange": "13.1.1 - 13.6.4", "assessment": "Coulomb's Law problems, electric field lines mapping, capacitor combinations in series/parallel.", "resources": "PCTB Unit 13, STBB Unit 13"},
        {"week": "Weeks 15-18", "topic": "14. Current Electricity", "periods": 16, "sloRange": "14.1.1 - 14.8.2", "assessment": "Ohm's Law verification with voltmeter and ammeter, resistors combination, electric power and kWh.", "resources": "PCTB Unit 14, Physics Classroom"},
        {"week": "Weeks 19-22", "topic": "15. Electromagnetism", "periods": 16, "sloRange": "15.1.1 - 15.7.3", "assessment": "Right-hand grip rule, Fleming's left-hand rule, DC motor principle, mutual induction and transformer.", "resources": "PCTB Unit 15, Charles Chew"},
        {"week": "Weeks 23-25", "topic": "16. Basic Electronics", "periods": 12, "sloRange": "16.1.1 - 16.5.3", "assessment": "Thermionic emission, cathode-ray oscilloscope (CRO), logic gates (AND, OR, NOT, NAND, NOR) truth tables.", "resources": "PCTB Unit 16, PhET Circuits"},
        {"week": "Weeks 26-28", "topic": "17. Atomic and Nuclear Physics", "periods": 12, "sloRange": "17.1.1 - 17.6.2", "assessment": "Rutherford atomic model, isotopes, radioactive decay equations (alpha, beta, gamma), half-life graphs.", "resources": "PCTB Unit 18, STBB Unit 18"}
    ]
    with open(os.path.join(DATA_DIR, "ssc2_pacing.json"), "w", encoding="utf-8") as f:
        json.dump(ssc2_pacing, f, indent=2)

    # Practical Experiments List
    ssc1_practicals = [
        {"expNo": 1, "topic": "Measurements", "title": "Determine volume of a solid cylinder using Vernier Callipers.", "apparatus": "Vernier Callipers, Solid cylinder", "stage": "Stage I & II"},
        {"expNo": 2, "topic": "Measurements", "title": "Determine cross-sectional area of a wire using Micrometer Screw Gauge.", "apparatus": "Micrometer Screw Gauge, thin wire", "stage": "Stage I & II"},
        {"expNo": 3, "topic": "Dynamics", "title": "Determine value of acceleration due to gravity (g) using Free Fall apparatus.", "apparatus": "Free fall apparatus, electronic timer / stop watch", "stage": "Stage I, II & III"},
        {"expNo": 4, "topic": "Forces", "title": "Verify Principle of Moments using a metre rule and hanging weights.", "apparatus": "Metre rule, knife-edge wedge, slotted weights, thread", "stage": "Stage I & II"},
        {"expNo": 5, "topic": "Matter", "title": "Determine density of an irregular solid using measuring cylinder and water displacement.", "apparatus": "Measuring cylinder, irregular stone/pebble, water, balance", "stage": "Stage I & II"},
        {"expNo": 6, "topic": "Thermal", "title": "Draw graph between temperature and time when ice is converted into water and then steam (Model Paper III Official Task).", "apparatus": "Beaker, thermometer (-10°C to 110°C), crushed ice, tripod stand, Bunsen burner/spirit lamp, stop watch", "stage": "Stage I (Apparatus), Stage II (Observations), Stage III (Graph)"}
    ]
    with open(os.path.join(DATA_DIR, "ssc1_practicals.json"), "w", encoding="utf-8") as f:
        json.dump(ssc1_practicals, f, indent=2)

    print("Generated Pacing and Practical datasets successfully.")

def ingest_books():
    books = [
        {
            "title": "Physics SSC-I Syllabus 2025 (Grade IX Dedicated)",
            "className": "Class IX",
            "subject": "Physics",
            "publisher": "Aga Khan University Examination Board",
            "publicationYear": 2025,
            "sourceFile": "/materials/ssc/physics/ssc-1/physics-ssc-i-syllabus-grade-9-dedicated.pdf"
        },
        {
            "title": "Physics SSC-II Syllabus 2025 (Grade X Dedicated)",
            "className": "Class X",
            "subject": "Physics",
            "publisher": "Aga Khan University Examination Board",
            "publicationYear": 2025,
            "sourceFile": "/materials/ssc/physics/ssc-2/physics-ssc-ii-syllabus-grade-10-dedicated.pdf"
        },
        {
            "title": "Physics Grade IX Pacing Guide for Teachers (2025)",
            "className": "Class IX",
            "subject": "Physics",
            "publisher": "AKU-EB Teacher Developer Team",
            "publicationYear": 2025,
            "sourceFile": "/materials/ssc/physics/ssc-1/pacing-guide-2025-for-ssc-i-physics.pdf"
        },
        {
            "title": "Physics Grade X Pacing Guide for Teachers (2025)",
            "className": "Class X",
            "subject": "Physics",
            "publisher": "AKU-EB Teacher Developer Team",
            "publicationYear": 2025,
            "sourceFile": "/materials/ssc/physics/ssc-2/pacing-guide-for-ssc-ii-physics.pdf"
        },
        {
            "title": "Resource Guide SSC Physics 2025 (Teaching & Learning Resources)",
            "className": "Classes IX & X",
            "subject": "Physics",
            "publisher": "Aga Khan University Examination Board",
            "publicationYear": 2025,
            "sourceFile": "/materials/ssc/physics/ssc-1/resources-guide-2025-ssc-physics-full.pdf"
        },
        {
            "title": "Physics SSC-I Sample Practical Paper III (Model Examination 2026)",
            "className": "Class IX",
            "subject": "Physics",
            "publisher": "Aga Khan University Examination Board",
            "publicationYear": 2026,
            "sourceFile": "/materials/ssc/physics/ssc-1/ssc-i-physics-sample-practical.pdf"
        }
    ]
    with engine.begin() as conn:
        for b in books:
            existing = conn.execute(text('SELECT id FROM "Book" WHERE title = :t'), {"t": b["title"]}).fetchone()
            if not existing:
                bid = str(uuid.uuid4())
                conn.execute(text("""
                    INSERT INTO "Book" (id, title, publisher, subject, "className", "boardAssociation", "publicationYear", "sourceFile", "createdAt")
                    VALUES (:id, :t, :pub, :sub, :cls, 'AKU-EB', :yr, :sfile, NOW())
                """), {
                    "id": bid,
                    "t": b["title"],
                    "pub": b["publisher"],
                    "sub": b["subject"],
                    "cls": b["className"],
                    "yr": b["publicationYear"],
                    "sfile": b["sourceFile"]
                })
                print(f"Created Book: {b['title']}")

if __name__ == "__main__":
    export_curriculum()
    parse_pacing_and_resources()
    ingest_books()
