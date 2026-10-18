from fastapi import APIRouter, HTTPException
from typing import List, Optional
from services.api.database import prisma

router = APIRouter(prefix="/api/syllabus", tags=["Syllabus"])

@router.get("/tree")
def get_syllabus_tree(board_id: Optional[str] = None):
    """
    Returns the complete syllabus hierarchy: Boards -> Programmes -> Classes -> Subjects.
    For deeper levels, it's better to fetch by subject/version to avoid massive payloads, 
    but we can provide the high-level tree here.
    """
    query_args = {
        "include": {
            "programmes": {
                "include": {
                    "academicClasses": {
                        "include": {
                            "subjects": {
                                "include": {
                                    "syllabusVersions": {
                                        "where": {"isLatest": True}
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    if board_id:
        query_args["where"] = {"id": board_id}
        
    boards = prisma.board.find_many(**query_args)
    return [board.model_dump() for board in boards]

@router.get("/versions/{version_id}/topics")
def get_topics_for_version(version_id: str):
    """
    Returns the topics, subtopics, and SLOs for a specific syllabus version.
    """
    version = prisma.syllabusversion.find_unique(
        where={"id": version_id},
        include={
            "topics": {
                "include": {
                    "subtopics": {
                        "include": {
                            "slos": {
                                "include": {
                                    "concepts": True,
                                    "commandWords": True
                                }
                            }
                        }
                    }
                },
                "order_by": {"topicNumber": "asc"}
            }
        }
    )
    
    if not version:
        raise HTTPException(status_code=404, detail="Syllabus version not found")
        
    return version.model_dump()

@router.get("/slos/{slo_id}")
def get_slo_details(slo_id: str):
    """
    Get SLO details including related past questions and book content.
    """
    slo = prisma.slo.find_unique(
        where={"id": slo_id},
        include={
            "concepts": True,
            "commandWords": True,
            "pastPaperQuestions": {
                "include": {
                    "question": {
                        "include": {
                            "pastPaper": True
                        }
                    }
                }
            },
            "bookContents": {
                "include": {
                    "bookContent": {
                        "include": {
                            "book": True
                        }
                    }
                }
            }
        }
    )
    
    if not slo:
        raise HTTPException(status_code=404, detail="SLO not found")
        
    return slo.model_dump()
