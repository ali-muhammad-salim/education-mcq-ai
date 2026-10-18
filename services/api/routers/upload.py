from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks
from typing import List, Optional
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/documents", tags=["Documents"])

@router.post("/book")
async def upload_book(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(...),
    publisher: Optional[str] = Form(None),
    subject: Optional[str] = Form(None),
    className: Optional[str] = Form(None),
    boardAssociation: Optional[str] = Form(None)
):
    """
    Mock endpoint for uploading a textbook.
    In a real system, this would save the file, create a DB record, and trigger the pipeline.
    """
    # Mocking a DB id
    doc_id = str(uuid.uuid4())
    
    # In a real system we would trigger something like:
    # background_tasks.add_task(run_ingestion_pipeline, doc_id, file)
    
    return {
        "id": doc_id,
        "title": title,
        "filename": file.filename,
        "status": "UPLOADED",
        "message": "File uploaded successfully and processing started."
    }

@router.post("/past-paper")
async def upload_past_paper(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    boardId: str = Form(...),
    classId: str = Form(...),
    subjectId: str = Form(...),
    examYear: int = Form(...)
):
    """
    Mock endpoint for uploading a past paper.
    """
    doc_id = str(uuid.uuid4())
    
    return {
        "id": doc_id,
        "filename": file.filename,
        "examYear": examYear,
        "status": "UPLOADED",
        "message": "Past paper uploaded successfully and processing started."
    }

@router.get("/")
def get_documents():
    """
    Mock endpoint to get uploaded documents and processing status.
    """
    return [
        {
            "id": "mock-doc-1",
            "title": "Physics Grade 11",
            "type": "BOOK",
            "status": "COMPLETED",
            "uploadDate": datetime.now().isoformat()
        },
        {
            "id": "mock-doc-2",
            "title": "Biology 2024 Past Paper",
            "type": "PAST_PAPER",
            "status": "PROCESSING",
            "uploadDate": datetime.now().isoformat()
        }
    ]
