"""Tests for the syllabus parser, diff engine and version resolver."""

from pathlib import Path

import pytest

from services.knowledge.syllabus_parser import (
    ParsedChapter, ParsedSLO, ParsedSubtopic, ParsedSyllabus, parse_tables, infer_level,
)
from services.knowledge.syllabus_diff import ChangeType, diff_syllabi
from services.knowledge.version_resolver import VersionWindow, resolve_version

BIO_JSON = Path(__file__).resolve().parents[3] / "Biology HSSC I Syllabus 2025_tables.json"

TABLES = [{"page": 10, "data": [
    ["Topics and Sub-topics", "Student Learning Outcomes", "", "", "Cognitive Level"],
    ["1. Biological Molecules", "", "", "", ""],
    ["1.1 Introduction to Molecular Biology", "1.1.1 1.1.2", "",
     "define molecular biology; differentiate between organic and inorganic compounds;", "*", "FA *"],
    ["", "1.1.3", "", "calculate magnification of a specimen;", "", "*"],
    ["TOC", "x"],
    ["1  2.", "", "", ""],
]}]


def _syl(slos: dict[str, str]) -> ParsedSyllabus:
    st = ParsedSubtopic(number="1.1", name="x", slos=[
        ParsedSLO(code=c, text=t, page=1) for c, t in slos.items()])
    return ParsedSyllabus(chapters=[ParsedChapter(number="1", name="Chap", subtopics=[st])])


def test_parse_splits_codes_and_levels():
    s = parse_tables(TABLES)
    assert [c.number for c in s.chapters] == ["1"]  # TOC noise ignored
    slos = list(s.all_slos())
    assert [x[2].code for x in slos] == ["1.1.1", "1.1.2", "1.1.3"]
    assert slos[0][2].cognitive_level == "R"
    assert slos[1][2].cognitive_level == "U"
    assert slos[2][2].cognitive_level == "A"  # continuation row
    assert slos[0][1].formative_only_hint


def test_infer_level_unknown():
    assert infer_level("zzz something") == ("zzz", None)


@pytest.mark.skipif(not BIO_JSON.exists(), reason="pilot syllabus file not present")
def test_biology_golden():
    from services.knowledge.syllabus_parser import parse_tables_file
    s = parse_tables_file(BIO_JSON)
    assert len(s.chapters) == 27
    assert s.slo_count > 650
    codes = [x[2].code for x in s.all_slos()]
    assert len(codes) == len(set(codes)), "duplicate SLO codes"


def test_diff_all_change_types():
    old = _syl({
        "1.1.1": "define molecular biology and biological molecules",
        "1.1.2": "describe properties of carbon including tetravalency",
        "1.1.3": "explain the structure of water molecule in detail",
        "1.1.4": "state the role of lipids in membranes",
    })
    new = _syl({
        "1.1.1": "define molecular biology and biological molecules",
        "1.1.2": "describe properties of carbon including tetravalency and catenation",
        "1.2.1": "explain the structure of water molecule in detail",
        "1.1.9": "calculate the pH of a buffer solution",
    })
    d = diff_syllabi(old, new)
    kinds = {(c.old_code, c.new_code): c.type for c in d.changes}
    assert kinds[("1.1.1", "1.1.1")] == ChangeType.UNCHANGED
    assert kinds[("1.1.2", "1.1.2")] == ChangeType.MODIFIED
    assert kinds[("1.1.3", "1.2.1")] == ChangeType.MOVED
    assert kinds[("1.1.4", None)] == ChangeType.REMOVED
    assert kinds[(None, "1.1.9")] == ChangeType.ADDED
    assert d.stale_old_codes() == {"1.1.2", "1.1.4"}


def test_version_resolver():
    v = [VersionWindow("v2017", 2017, 2021), VersionWindow("v2022", 2022, 2025),
         VersionWindow("v2026", 2025, None)]
    assert resolve_version(2019, v).version_id == "v2017"
    r = resolve_version(2025, v)
    assert r.version_id == "v2026" and "overlap" in r.reason
    assert resolve_version(2010, v).legacy
