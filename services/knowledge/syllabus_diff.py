"""
Syllabus diff engine.

Compares two parsed syllabus versions of the same subject and classifies each
SLO as UNCHANGED / MODIFIED / MOVED / ADDED / REMOVED so downstream content
(notes, MCQs, past-paper links) can be flagged stale when its SLO changed.

Matching strategy (no LLM, deterministic):
1. same code + near-identical text           -> UNCHANGED
2. same code + different text                -> MODIFIED (if similar) / REMOVED+ADDED
3. different code, same normalised text      -> MOVED  (renumbered)
4. different code, highly similar text       -> MOVED  (confidence = similarity)
5. leftovers                                 -> REMOVED (old) / ADDED (new)
"""

from __future__ import annotations

import re
from difflib import SequenceMatcher
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel

from services.knowledge.syllabus_parser import ParsedSyllabus

UNCHANGED_THRESHOLD = 0.97
MODIFIED_THRESHOLD = 0.60
MOVED_THRESHOLD = 0.85


class ChangeType(str, Enum):
    UNCHANGED = "UNCHANGED"
    MODIFIED = "MODIFIED"
    MOVED = "MOVED"
    ADDED = "ADDED"
    REMOVED = "REMOVED"


class SLOChange(BaseModel):
    type: ChangeType
    old_code: Optional[str] = None
    new_code: Optional[str] = None
    old_text: Optional[str] = None
    new_text: Optional[str] = None
    similarity: float = 0.0

    @property
    def invalidates_content(self) -> bool:
        """True when notes/MCQs tied to the old SLO must be re-reviewed."""
        return self.type in (ChangeType.MODIFIED, ChangeType.REMOVED)


class SyllabusDiff(BaseModel):
    changes: list[SLOChange]

    def by_type(self, t: ChangeType) -> list[SLOChange]:
        return [c for c in self.changes if c.type == t]

    def summary(self) -> dict[str, int]:
        return {t.value: len(self.by_type(t)) for t in ChangeType}

    def stale_old_codes(self) -> set[str]:
        return {c.old_code for c in self.changes if c.invalidates_content and c.old_code}


def normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", re.sub(r"\s+", " ", text.lower())).strip()


def _sim(a: str, b: str) -> float:
    return SequenceMatcher(None, normalize(a), normalize(b)).ratio()


def diff_syllabi(old: ParsedSyllabus, new: ParsedSyllabus) -> SyllabusDiff:
    old_slos = {s.code: s for _, _, s in old.all_slos()}
    new_slos = {s.code: s for _, _, s in new.all_slos()}
    changes: list[SLOChange] = []
    matched_old: set[str] = set()
    matched_new: set[str] = set()

    # Pass 1: same code
    for code, o in old_slos.items():
        n = new_slos.get(code)
        if n is None:
            continue
        sim = _sim(o.text, n.text)
        if sim >= UNCHANGED_THRESHOLD:
            ctype = ChangeType.UNCHANGED
        elif sim >= MODIFIED_THRESHOLD:
            ctype = ChangeType.MODIFIED
        else:
            continue  # same number but different content: handled as remove + add
        changes.append(SLOChange(type=ctype, old_code=code, new_code=code,
                                 old_text=o.text, new_text=n.text, similarity=round(sim, 3)))
        matched_old.add(code)
        matched_new.add(code)

    # Pass 2: renumbered / moved SLOs (best-match greedy by similarity)
    cand: list[tuple[float, str, str]] = []
    for oc, o in old_slos.items():
        if oc in matched_old:
            continue
        for nc, n in new_slos.items():
            if nc in matched_new:
                continue
            s = _sim(o.text, n.text)
            if s >= MOVED_THRESHOLD:
                cand.append((s, oc, nc))
    for s, oc, nc in sorted(cand, reverse=True):
        if oc in matched_old or nc in matched_new:
            continue
        changes.append(SLOChange(type=ChangeType.MOVED, old_code=oc, new_code=nc,
                                 old_text=old_slos[oc].text, new_text=new_slos[nc].text,
                                 similarity=round(s, 3)))
        matched_old.add(oc)
        matched_new.add(nc)

    # Pass 3: leftovers
    for oc, o in old_slos.items():
        if oc not in matched_old:
            changes.append(SLOChange(type=ChangeType.REMOVED, old_code=oc, old_text=o.text))
    for nc, n in new_slos.items():
        if nc not in matched_new:
            changes.append(SLOChange(type=ChangeType.ADDED, new_code=nc, new_text=n.text))
    return SyllabusDiff(changes=changes)


def apply_diff_to_db(repo: Any, old_version_id: str, new_version_id: str, diff: SyllabusDiff) -> None:
    """
    Persists the diff to the database:
    1. Creates/updates SyllabusDiffRecord.
    2. Writes SLOMapping records for UNCHANGED, MODIFIED, and MOVED SLOs.
    3. Flags downstream content (Questions, Notes) tied to REMOVED or MODIFIED SLOs as stale.
    """
    import json
    from sqlalchemy import text
    import logging

    logger = logging.getLogger(__name__)

    # 1. Fetch SLO IDs for old and new versions
    old_slo_map = {}
    new_slo_map = {}
    
    with repo._SessionFactory() as session:
        res_old = session.execute(
            text("SELECT id, code FROM \"SLO\" WHERE \"subtopicId\" IN (SELECT id FROM \"Subtopic\" WHERE \"topicId\" IN (SELECT id FROM \"Topic\" WHERE \"syllabusVersionId\" = :vid))"),
            {"vid": old_version_id}
        ).fetchall()
        for r in res_old:
            if r[1]:
                old_slo_map[r[1]] = r[0]

        res_new = session.execute(
            text("SELECT id, code FROM \"SLO\" WHERE \"subtopicId\" IN (SELECT id FROM \"Subtopic\" WHERE \"topicId\" IN (SELECT id FROM \"Topic\" WHERE \"syllabusVersionId\" = :vid))"),
            {"vid": new_version_id}
        ).fetchall()
        for r in res_new:
            if r[1]:
                new_slo_map[r[1]] = r[0]

        # 2. Write SyllabusDiffRecord
        changes_json = json.dumps([c.model_dump() for c in diff.changes])
        summary_json = json.dumps(diff.summary())

        session.execute(
            text("""
                INSERT INTO "SyllabusDiffRecord" ("id", "fromVersionId", "toVersionId", "summary", "changes", "createdAt")
                VALUES (gen_random_uuid(), :from, :to, :summary, :changes, NOW())
                ON CONFLICT ("fromVersionId", "toVersionId") DO UPDATE SET
                    "summary" = EXCLUDED."summary",
                    "changes" = EXCLUDED."changes",
                    "createdAt" = NOW()
            """),
            {"from": old_version_id, "to": new_version_id, "summary": summary_json, "changes": changes_json}
        )

        # 3. Write SLOMapping
        for change in diff.changes:
            if change.type in (ChangeType.UNCHANGED, ChangeType.MODIFIED, ChangeType.MOVED):
                source_id = old_slo_map.get(change.old_code)
                target_id = new_slo_map.get(change.new_code)
                
                if source_id and target_id:
                    mapping_type = "EQUIVALENT" if change.type == ChangeType.UNCHANGED else "PARTIAL"
                    session.execute(
                        text("""
                            INSERT INTO "SLOMapping" ("id", "sourceSloId", "targetSloId", "mappingType", "confidenceScore", "createdAt")
                            VALUES (gen_random_uuid(), :source, :target, :mtype, :conf, NOW())
                            ON CONFLICT ("sourceSloId", "targetSloId") DO UPDATE SET
                                "mappingType" = EXCLUDED."mappingType",
                                "confidenceScore" = EXCLUDED."confidenceScore"
                        """),
                        {"source": source_id, "target": target_id, "mtype": mapping_type, "conf": change.similarity}
                    )
        
        # 4. Flag stale content
        stale_old_codes = diff.stale_old_codes()
        stale_old_ids = [old_slo_map[code] for code in stale_old_codes if code in old_slo_map]
        
        if stale_old_ids:
            logger.info(f"Flagging content for {len(stale_old_ids)} stale SLOs...")
            
            # Stale Questions via QuestionTag (mock for now, depending on actual implementation)
            # Question table has 'status'
            session.execute(
                text("""
                    UPDATE "Question" SET status = 'STALE_NEEDS_REVIEW'
                    WHERE id IN (
                        SELECT "questionId" FROM "QuestionTag" WHERE "tag" IN :stale_codes
                    )
                """),
                {"stale_codes": tuple(stale_old_codes)}
            )
            
            # Stale PastPaperQuestions
            session.execute(
                text("""
                    UPDATE "PastPaperQuestion" SET verified = false
                    WHERE "sloId" IN :stale_ids
                """),
                {"stale_ids": tuple(stale_old_ids)}
            )

        session.commit()
    logger.info("Diff successfully applied to the database.")
