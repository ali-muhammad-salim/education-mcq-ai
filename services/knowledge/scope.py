"""Fail-closed curriculum boundaries shared by retrieval strategies."""
import re

def canonical(value):
    return re.sub(r"[^a-z0-9]", "", str(value or "").lower())

def grade(value):
    value = canonical(value).replace("grade", "").replace("class", "")
    return {"ix":"9", "x":"10", "xi":"11", "xii":"12"}.get(value, value)

def matches_scope(record, board, class_level, subject):
    return (canonical(record.get("board") or record.get("board_short_code")) == canonical(board)
            and grade(record.get("class_level") or record.get("classLevel")) == grade(class_level)
            and canonical(record.get("subject")) == canonical(subject))
