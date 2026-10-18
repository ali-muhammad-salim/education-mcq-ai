"""
Idempotent syllabus loader (replaces the duplicate-prone parts of build_knowledge_graph.py
for syllabi that have a ``*_tables.json`` extraction).

Usage (dry-run is the default and never touches the database):

    python scripts/load_syllabus.py "Biology HSSC I Syllabus 2025_tables.json" \
        --board AKU-EB --programme HSSC --class-name XI --level 11 \
        --subject Biology --version "Syllabus 2025" --valid-from 2025

    # write to the DB (requires `prisma migrate` + `prisma generate` for the new SLO fields)
    python scripts/load_syllabus.py <file> ... --apply

Every record is found-or-created by natural key, so re-running is safe.
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.knowledge.syllabus_parser import parse_tables_file  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("tables_json")
    ap.add_argument("--board", required=True)
    ap.add_argument("--programme", required=True)
    ap.add_argument("--class-name", required=True)
    ap.add_argument("--level", type=int, required=True)
    ap.add_argument("--subject", required=True)
    ap.add_argument("--version", required=True)
    ap.add_argument("--valid-from", type=int, required=True, help="first exam year")
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()

    syl = parse_tables_file(a.tables_json)
    review = syl.review_items()
    print(f"Parsed {len(syl.chapters)} chapters, {syl.slo_count} SLOs, {len(review)} sub-topics need review")
    for s in review[:20]:
        line = f"  REVIEW {s.number} {s.name[:40]}: {s.review_reason}"
        print(line.encode("ascii", "replace").decode("ascii"))
    if not a.apply:
        print("Dry run only. Re-run with --apply to write.")
        return 0

    from prisma import Prisma  # imported lazily so dry-run works without a DB

    db = Prisma()
    db.connect()
    try:
        board = db.board.find_unique(where={"shortCode": a.board}) or db.board.create(
            data={"name": a.board, "shortCode": a.board, "country": "Pakistan"})
        prog = db.programme.find_first(where={"boardId": board.id, "name": a.programme}) or \
            db.programme.create(data={"boardId": board.id, "name": a.programme})
        cls = db.academicclass.find_first(where={"programmeId": prog.id, "name": a.class_name}) or \
            db.academicclass.create(data={"programmeId": prog.id, "name": a.class_name, "level": a.level})
        subj = db.subject.find_first(where={"classId": cls.id, "name": a.subject}) or \
            db.subject.create(data={"classId": cls.id, "name": a.subject})
        ver = db.syllabusversion.find_first(where={"subjectId": subj.id, "versionName": a.version}) or \
            db.syllabusversion.create(data={
                "subjectId": subj.id, "versionName": a.version,
                "validFrom": datetime(a.valid_from, 1, 1, tzinfo=timezone.utc)})

        created = updated = 0
        for ch in syl.chapters:
            topic = db.topic.find_first(where={"syllabusVersionId": ver.id, "topicNumber": ch.number}) or \
                db.topic.create(data={"syllabusVersionId": ver.id, "name": ch.name, "topicNumber": ch.number})
            for st in ch.subtopics:
                sub = db.subtopic.find_first(where={"topicId": topic.id, "subtopicNum": st.number}) or \
                    db.subtopic.create(data={"topicId": topic.id, "name": st.name, "subtopicNum": st.number})
                for s in st.slos:
                    existing = db.slo.find_first(where={"subtopicId": sub.id, "code": s.code})
                    if existing:
                        slo = db.slo.update(
                            where={"id": existing.id},
                            data={
                                "description": s.text,
                                "cognitiveLevel": s.cognitive_level,
                                "sourcePage": s.page,
                                "isFormative": st.formative_only_hint,
                            }
                        )
                        updated += 1
                    else:
                        slo = db.slo.create(
                            data={
                                "subtopicId": sub.id,
                                "code": s.code,
                                "description": s.text,
                                "cognitiveLevel": s.cognitive_level,
                                "sourcePage": s.page,
                                "isFormative": st.formative_only_hint,
                            }
                        )
                        created += 1
                    if s.command_word:
                        cw = db.commandword.upsert(
                            where={"word": s.command_word},
                            data={"create": {"word": s.command_word}, "update": {}})
                        db.slo.update(where={"id": slo.id},
                                      data={"commandWords": {"connect": [{"id": cw.id}]}})
        print(f"Done: {created} SLOs created, {updated} updated.")
    finally:
        db.disconnect()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
