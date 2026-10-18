from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from contextlib import asynccontextmanager

from services.api.routers import upload, mcq, review, training, board, syllabus, search
from services.api.database import connect_db, disconnect_db
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    connect_db()
    yield
    disconnect_db()

app = FastAPI(title="MCQs AI Data Management Dashboard", version="1.0", lifespan=lifespan)

# Enable CORS for the frontend React app (typically runs on 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production this should be tightened
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount media directory for serving extracted images
if os.path.exists("data"):
    app.mount("/media", StaticFiles(directory="data"), name="media")

app.include_router(upload.router)
app.include_router(mcq.router)
app.include_router(review.router)
app.include_router(training.router)
app.include_router(board.router)
app.include_router(syllabus.router)
app.include_router(search.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "admin-dashboard-api"}
