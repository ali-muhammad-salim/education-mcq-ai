from fastapi import APIRouter, Query
from typing import List, Optional
from services.api.database import prisma

router = APIRouter(prefix="/api/search", tags=["Search"])

@router.get("/")
def global_search(
    q: str = Query(..., min_length=1, max_length=200, description="The search query"),
    limit: int = Query(20, ge=1, le=100, description="Max results per category")
):
    """
    Search across multiple entities: PastPaperQuestion, BookContent, Topic, SLO
    """

    # 1. Search Past Paper Questions
    questions = prisma.pastpaperquestion.find_many(
        where={
            "OR": [
                {"questionText": {"contains": q, "mode": "insensitive"}},
                {"normalizedQuestionText": {"contains": q, "mode": "insensitive"}},
            ]
        },
        take=limit,
        include={
            "pastPaper": True,
            "slos": {
                "include": {
                    "slo": True
                }
            }
        }
    )

    # 2. Search Book Contents (Study Notes/Textbooks)
    contents = prisma.bookcontent.find_many(
        where={
            "content": {"contains": q, "mode": "insensitive"}
        },
        take=limit,
        include={
            "book": True,
            "slos": {
                "include": {
                    "slo": True
                }
            }
        }
    )

    # 3. Search Topics
    topics = prisma.topic.find_many(
        where={
            "name": {"contains": q, "mode": "insensitive"}
        },
        take=limit,
        include={
            "syllabusVersion": {
                "include": {
                    "subject": True
                }
            }
        }
    )

    # 4. Search SLOs
    slos = prisma.slo.find_many(
        where={
            "description": {"contains": q, "mode": "insensitive"}
        },
        take=limit,
        include={
            "subtopic": {
                "include": {
                    "topic": True
                }
            }
        }
    )

    return {
        "query": q,
        "results": {
            "questions": [q.model_dump() for q in questions],
            "book_contents": [c.model_dump() for c in contents],
            "topics": [t.model_dump() for t in topics],
            "slos": [s.model_dump() for s in slos],
        }
    }
