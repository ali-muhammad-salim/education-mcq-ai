from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi import Request
from fastapi.responses import JSONResponse
import hmac

from contextlib import asynccontextmanager

from services.api.routers import upload, mcq, review, training, board, syllabus, search
from services.api.database import connect_db, disconnect_db, prisma
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
    allow_origins=[origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def internal_service_auth(request: Request, call_next):
    if request.url.path != "/health" and request.method != "OPTIONS":
        expected = os.getenv("INTERNAL_API_TOKEN", "")
        supplied = request.headers.get("authorization", "").removeprefix("Bearer ")
        if len(expected) < 32 or not hmac.compare_digest(expected.encode(), supplied.encode()):
            return JSONResponse({"error": "Internal service authentication required"}, status_code=401)
    return await call_next(request)

app.include_router(upload.router)
app.include_router(mcq.router)
app.include_router(review.router)
app.include_router(training.router)
app.include_router(board.router)
app.include_router(syllabus.router)
app.include_router(search.router)

@app.get("/health")
def health_check():
    return {"status": "ok" if prisma.is_connected() else "unavailable", "service": "admin-dashboard-api"}
