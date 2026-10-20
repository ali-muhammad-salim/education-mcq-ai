from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from pathlib import Path
from uuid import uuid4
from prisma import Json
from services.api.database import prisma
import os

router = APIRouter(prefix="/api/documents", tags=["Documents"])

async def store(file: UploadFile):
    if file.content_type != "application/pdf":
        raise HTTPException(400, "Only PDF files are supported")
    root = os.getenv("ASSET_ROOT")
    if not root:
        raise HTTPException(503, "Configure a shared persistent ASSET_ROOT or use the primary upload API")
    content = await file.read(50 * 1024 * 1024 + 1)
    if len(content) > 50 * 1024 * 1024 or not content.startswith(b"%PDF-"):
        raise HTTPException(400, "Invalid PDF or file exceeds 50 MB")
    key = "private/resources/" + str(uuid4()) + "-document.pdf"
    target = Path(root).resolve() / key
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)
    return key

def owner_id():
    identifier = os.getenv("INTERNAL_SERVICE_USER_ID")
    user = prisma.user.find_unique(where={"id": identifier}) if identifier else None
    if not user or user.role != "ADMIN" or user.status != "ACTIVE":
        raise HTTPException(503, "Configure an active INTERNAL_SERVICE_USER_ID administrator")
    return user.id

@router.post("/book", status_code=202)
async def upload_book(file: UploadFile = File(...), title: str = Form(...), publisher: Optional[str] = Form(None), subject: Optional[str] = Form(None), className: Optional[str] = Form(None), boardAssociation: Optional[str] = Form(None)):
    owner = owner_id()
    key = await store(file)
    with prisma.tx() as tx:
        book = tx.book.create(data={"title": title, "publisher": publisher, "subject": subject, "className": className, "boardAssociation": boardAssociation, "sourceFile": key})
        job = tx.durablejob.create(data={"ownerId": owner, "kind": "INGESTION", "payload": Json({"resourceType": "textbook", "storageKey": key, "meta": {"subject": subject or "Physics", "classLevel": className or "Class IX", "board": boardAssociation or "AKU-EB"}})})
    return {"id": book.id, "jobId": job.id, "status": job.status}

@router.post("/past-paper", status_code=202)
async def upload_past_paper(file: UploadFile = File(...), boardId: str = Form(...), classId: str = Form(...), subjectId: str = Form(...), examYear: int = Form(...)):
    owner = owner_id()
    key = await store(file)
    board = prisma.board.find_unique(where={"id": boardId})
    subject = prisma.subject.find_unique(where={"id": subjectId})
    if not board or not subject or subject.classId != classId:
        raise HTTPException(400, "Invalid academic hierarchy")
    job = prisma.durablejob.create(data={"ownerId": owner, "kind": "INGESTION", "payload": Json({"resourceType": "past_paper", "storageKey": key, "meta": {"subject": subject.name, "classLevel": classId, "board": board.shortCode, "examYear": str(examYear)}})})
    return {"jobId": job.id, "status": job.status}

@router.get("/")
def get_documents():
    jobs = prisma.durablejob.find_many(where={"kind": "INGESTION"}, take=100, order={"createdAt": "desc"})
    return [job.model_dump(mode="json") for job in jobs]
