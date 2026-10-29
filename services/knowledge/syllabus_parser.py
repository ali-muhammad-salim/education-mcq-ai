"""
Deterministic AKU-EB syllabus parser (v2).

Parses the ``*_tables.json`` output (list of ``{"page": int, "data": [[cell,...],...]}``)
of an AKU-EB syllabus PDF into Chapter -> Sub-topic -> SLO records with:

* the official SLO code (e.g. ``2.4.3``)
* the command word (first word of the SLO)
* a cognitive level (R / U / A / An / E / C)
* page provenance

Why deterministic?  The AKU tables pack all SLO codes of a sub-topic into one cell
("1.1.1 1.1.2 1.1.3") and all SLO statements into another, separated by ``;``.
The cognitive-level marks (``*``, ``FA``, ``An``) are positional per column and
cannot be reliably assigned to a single SLO, so the level is *inferred from the
command word* and tagged ``cognitive_source="command_word"``.  A low-confidence
or count-mismatched sub-topic is flagged ``needs_review`` instead of guessed.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Iterable, Optional

from pydantic import BaseModel, Field

_CHAPTER_RE = re.compile(r"^(\d{1,2})\.\s+(\S.*)$")
_SUBTOPIC_RE = re.compile(r"^(\d{1,2}\.\d{1,2})\s+(\S.*)$")
_CODES_RE = re.compile(r"^\s*(?:\d{1,2}\.\d{1,2}\.\d{1,2}(?:\s+|$))+$")
_CODE_RE = re.compile(r"\d{1,2}\.\d{1,2}\.\d{1,2}")

# Command word -> cognitive level (AKU-EB command word guide, simplified).
COMMAND_WORD_LEVEL: dict[str, str] = {
    # Remember
    "define": "R", "state": "R", "name": "R", "list": "R", "identify": "R",
    "recall": "R", "label": "R", "outline": "R",
    # Understand
    "describe": "U", "explain": "U", "discuss": "U", "differentiate": "U",
    "distinguish": "U", "compare": "U", "classify": "U", "illustrate": "U",
    "summarise": "U", "summarize": "U", "relate": "U", "interpret": "U",
    # Apply and beyond
    "calculate": "A", "apply": "A", "use": "A", "determine": "A", "solve": "A",
    "demonstrate": "A", "construct": "A", "perform": "A", "investigate": "A",
    "analyse": "An", "analyze": "An", "examine": "An", "infer": "An",
    "evaluate": "E", "justify": "E", "assess": "E", "critique": "E",
    "design": "C", "create": "C", "develop": "C", "formulate": "C", "propose": "C",
    "elaborate": "U", "exemplify": "U", "categorise": "U", "categorize": "U",
    "trace": "U", "derive": "A", "predict": "An", "suggest": "E",
    "recommend": "E", "draw": "A", "sketch": "A", "measure": "A", "plan": "C", "locate": "R",
}


class ParsedSLO(BaseModel):
    code: str
    text: str
    command_word: str = ""
    cognitive_level: Optional[str] = None
    cognitive_source: str = "command_word"  # command_word | unknown
    page: int


class ParsedSubtopic(BaseModel):
    number: str
    name: str
    slos: list[ParsedSLO] = Field(default_factory=list)
    needs_review: bool = False
    review_reason: str = ""
    formative_only_hint: bool = False  # "FA" marks seen in this row


class ParsedChapter(BaseModel):
    number: str
    name: str
    subtopics: list[ParsedSubtopic] = Field(default_factory=list)


class ParsedSyllabus(BaseModel):
    source: str = ""
    chapters: list[ParsedChapter] = Field(default_factory=list)

    @property
    def slo_count(self) -> int:
        return sum(len(s.slos) for c in self.chapters for s in c.subtopics)

    def all_slos(self) -> Iterable[tuple[ParsedChapter, ParsedSubtopic, ParsedSLO]]:
        for c in self.chapters:
            for s in c.subtopics:
                for slo in s.slos:
                    yield c, s, slo

    def review_items(self) -> list[ParsedSubtopic]:
        return [s for c in self.chapters for s in c.subtopics if s.needs_review]


def _clean(cell: object) -> str:
    return re.sub(r"\s+", " ", str(cell or "")).strip()


def infer_level(text: str) -> tuple[str, Optional[str]]:
    """Return (command_word, level) for an SLO statement."""
    m = re.match(r"[A-Za-z]+", text.strip())
    word = m.group(0).lower() if m else ""
    return word, COMMAND_WORD_LEVEL.get(word)


def _split_slo_texts(text: str, expected: int) -> list[str]:
    parts = [p.strip() for p in text.split(";") if p.strip()]
    if len(parts) == expected:
        return parts
    # Some statements contain ';' internally -> try to re-merge parts that do not
    # start with a known command word until the count matches.
    merged: list[str] = []
    for p in parts:
        first = re.match(r"[A-Za-z]+", p)
        starts_cmd = bool(first and first.group(0).lower() in COMMAND_WORD_LEVEL)
        if merged and not starts_cmd:
            merged[-1] += "; " + p
        else:
            merged.append(p)
    return merged


def parse_tables(tables: list[dict], source: str = "") -> ParsedSyllabus:
    syllabus = ParsedSyllabus(source=source)
    chapter: Optional[ParsedChapter] = None
    subtopic: Optional[ParsedSubtopic] = None

    for table in tables:
        page = int(table.get("page", 0))
        for raw in table.get("data", []):
            row = [_clean(c) for c in raw]
            if not any(row):
                continue
            head = row[0]

            # Chapter heading row: "3. The Cell"
            cm = _CHAPTER_RE.match(head)
            if cm and not _SUBTOPIC_RE.match(head) and len(re.findall(r"[A-Za-z]", cm.group(2))) >= 3:
                chapter = ParsedChapter(number=cm.group(1), name=cm.group(2))
                syllabus.chapters.append(chapter)
                subtopic = None
                continue

            # Locate the code cell and text cell among cells 1..3
            code_idx = next((i for i in range(1, min(4, len(row)))
                             if row[i] and _CODES_RE.match(row[i])), None)
            if code_idx is None:
                continue
            text_cell = next((row[i] for i in range(code_idx + 1, len(row))
                              if len(row[i]) > 12 and re.match(r"[A-Za-z]", row[i])), "")
            if not text_cell or chapter is None:
                continue

            sm = _SUBTOPIC_RE.match(head)
            if sm:
                subtopic = ParsedSubtopic(number=sm.group(1), name=sm.group(2))
                chapter.subtopics.append(subtopic)
            elif subtopic is None:
                continue  # continuation row with nothing to continue

            codes = _CODE_RE.findall(row[code_idx])
            texts = _split_slo_texts(text_cell, len(codes))
            marks = " ".join(row[code_idx + 2:]) if len(row) > code_idx + 2 else ""
            if "FA" in marks:
                subtopic.formative_only_hint = True

            if len(texts) != len(codes):
                subtopic.needs_review = True
                subtopic.review_reason = (
                    f"{len(codes)} SLO codes but {len(texts)} statements on page {page}"
                )
                texts = [text_cell]
                codes = [codes[0]] if codes else []
                if not codes:
                    continue
            for code, text in zip(codes, texts):
                word, level = infer_level(text)
                subtopic.slos.append(ParsedSLO(
                    code=code, text=text.rstrip(";").strip(),
                    command_word=word, cognitive_level=level,
                    cognitive_source="command_word" if level else "unknown",
                    page=page,
                ))
                if level is None:
                    subtopic.needs_review = True
                    subtopic.review_reason = (subtopic.review_reason + "; " if subtopic.review_reason else "") \
                        + f"unknown command word '{word}' for {code}"
    # Drop chapters with no parsed sub-topics (table-of-contents noise); keep the
    # richest entry when a chapter number appears more than once.
    best: dict[str, ParsedChapter] = {}
    for c in syllabus.chapters:
        cur = best.get(c.number)
        if cur is None or len(c.subtopics) > len(cur.subtopics):
            best[c.number] = c
    syllabus.chapters = [c for c in best.values() if c.subtopics]
    syllabus.chapters.sort(key=lambda c: int(c.number))
    return syllabus


def parse_tables_file(path: str | Path) -> ParsedSyllabus:
    p = Path(path)
    with p.open(encoding="utf-8") as fh:
        tables = json.load(fh)
    return parse_tables(tables, source=p.name)
