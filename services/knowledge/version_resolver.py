"""
Syllabus version resolver.

Maps an exam year onto the syllabus version that was in force, so a 2018 paper is
never silently aligned to 2025 SLOs.  Papers outside every known version are
reported as ``legacy`` - usable for style/pattern learning only.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Sequence, Any


@dataclass(frozen=True)
class VersionWindow:
    version_id: str
    first_exam_year: int            # first year examined under this syllabus
    last_exam_year: Optional[int]   # None = still current


@dataclass(frozen=True)
class Resolution:
    version_id: Optional[str]
    legacy: bool
    reason: str


def resolve_version(exam_year: int, versions: Sequence[VersionWindow]) -> Resolution:
    matches = [
        v for v in versions
        if v.first_exam_year <= exam_year and (v.last_exam_year is None or exam_year <= v.last_exam_year)
    ]
    if len(matches) == 1:
        return Resolution(matches[0].version_id, False, "in-window")
    if len(matches) > 1:
        # Overlap (transition years): choose the newest syllabus but say so.
        newest = max(matches, key=lambda v: v.first_exam_year)
        return Resolution(newest.version_id, False, "overlap: newest version chosen; review recommended")
    return Resolution(None, True, "exam year outside all known syllabus windows")


def resolve_from_db(repo: Any, board_name: str, subject_name: str, class_level: int, exam_year: int) -> Resolution:
    """
    Fetches available syllabus versions for a given board, subject, and class from the DB,
    then resolves which version was active during the specified exam year.
    """
    from sqlalchemy import text
    
    with repo._SessionFactory() as session:
        # Fetch matching versions
        query = text("""
            SELECT sv.id, EXTRACT(YEAR FROM sv."validFrom") as start_year, EXTRACT(YEAR FROM sv."validTo") as end_year
            FROM "SyllabusVersion" sv
            JOIN "Subject" s ON sv."subjectId" = s.id
            JOIN "Class" c ON s."classId" = c.id
            JOIN "Programme" p ON c."programmeId" = p.id
            JOIN "Board" b ON p."boardId" = b.id
            WHERE b.name = :board AND s.name = :subject AND c.level = :class_lvl
        """)
        
        rows = session.execute(query, {
            "board": board_name, 
            "subject": subject_name, 
            "class_lvl": class_level
        }).fetchall()
        
        if not rows:
            return Resolution(None, True, "no syllabus versions found for this subject/class/board")
            
        windows = []
        for row in rows:
            version_id = row[0]
            start_year = int(row[1]) if row[1] else 0
            end_year = int(row[2]) if row[2] else None
            windows.append(VersionWindow(version_id, start_year, end_year))
            
        return resolve_version(exam_year, windows)

