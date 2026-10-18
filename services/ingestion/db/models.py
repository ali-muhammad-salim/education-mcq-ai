"""
SQLAlchemy ORM models for the Document Intelligence Pipeline.

These tables are managed by Alembic and are separate from the Prisma-managed
tables (Book, PastPaper, etc.). They provide the fine-grained region-level
storage that the ingestion pipeline needs.

Table ownership:
  Prisma  → boards, classes, subjects, chapters, topics, questions, past_papers, …
  Alembic → documents, document_pages, page_regions, page_equations,
             page_diagrams, page_tables, page_questions
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


# ===========================================================================
# Document
# ===========================================================================

class Document(Base):
    """
    Top-level ingested document (textbook or past paper).

    Maps conceptually to both `Book` and `PastPaper` in Prisma.
    Uses `document_type` to distinguish them.
    """

    __tablename__ = "ingest_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    document_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # "BOOK" | "PAST_PAPER"
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    file_hash_sha256: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False
    )
    total_pages: Mapped[int] = mapped_column(Integer, default=0)
    processing_status: Mapped[str] = mapped_column(
        String(20), default="PENDING"
    )  # PENDING | PROCESSING | COMPLETED | FAILED
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now
    )

    pages: Mapped[list["DocumentPage"]] = relationship(
        "DocumentPage", back_populates="document", cascade="all, delete-orphan"
    )


# ===========================================================================
# Document Page
# ===========================================================================

class DocumentPage(Base):
    """
    A single rendered page of a document.
    """

    __tablename__ = "ingest_document_pages"
    __table_args__ = (UniqueConstraint("document_id", "page_number"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ingest_documents.id", ondelete="CASCADE"), nullable=False
    )
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    image_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    width: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    height: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    orientation_angle: Mapped[float] = mapped_column(Float, default=0.0)
    ocr_status: Mapped[str] = mapped_column(
        String(20), default="PENDING"
    )  # PENDING | COMPLETED | FAILED
    processing_time_ms: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now
    )

    document: Mapped["Document"] = relationship("Document", back_populates="pages")
    regions: Mapped[list["PageRegion"]] = relationship(
        "PageRegion", back_populates="page", cascade="all, delete-orphan"
    )
    equations: Mapped[list["PageEquation"]] = relationship(
        "PageEquation", back_populates="page", cascade="all, delete-orphan"
    )
    diagrams: Mapped[list["PageDiagram"]] = relationship(
        "PageDiagram", back_populates="page", cascade="all, delete-orphan"
    )
    tables: Mapped[list["PageTable"]] = relationship(
        "PageTable", back_populates="page", cascade="all, delete-orphan"
    )
    questions: Mapped[list["PageQuestion"]] = relationship(
        "PageQuestion", back_populates="page", cascade="all, delete-orphan"
    )


# ===========================================================================
# Page Region
# ===========================================================================

class PageRegion(Base):
    """
    A single detected and classified region on a document page.
    """

    __tablename__ = "ingest_page_regions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    page_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ingest_document_pages.id", ondelete="CASCADE"), nullable=False
    )
    region_id: Mapped[str] = mapped_column(String(32), nullable=False)  # e.g. p3_r7
    region_type: Mapped[str] = mapped_column(String(32), nullable=False)
    bbox_x0: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_y0: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_x1: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_y1: Mapped[float] = mapped_column(Float, nullable=False)
    text: Mapped[str] = mapped_column(Text, default="")
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    confidence_level: Mapped[str] = mapped_column(String(16), default="NEEDS_REVIEW")
    vision_used: Mapped[bool] = mapped_column(Boolean, default=False)
    reading_order: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    raw_ocr: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now
    )

    page: Mapped["DocumentPage"] = relationship("DocumentPage", back_populates="regions")


# ===========================================================================
# Page Equation
# ===========================================================================

class PageEquation(Base):
    """Mathematical formula or equation extracted from a page."""

    __tablename__ = "ingest_page_equations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    page_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ingest_document_pages.id", ondelete="CASCADE"), nullable=False
    )
    region_id: Mapped[str] = mapped_column(String(32), nullable=False)
    display_form: Mapped[str] = mapped_column(Text, default="")
    latex: Mapped[str] = mapped_column(Text, default="")
    normalized_form: Mapped[str] = mapped_column(Text, default="")
    is_chemical: Mapped[bool] = mapped_column(Boolean, default=False)
    # Chemical-specific
    chem_display: Mapped[str] = mapped_column(Text, default="")
    chem_normalized: Mapped[str] = mapped_column(Text, default="")
    chem_arrow: Mapped[str] = mapped_column(String(8), default="→")
    chem_state_symbols: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    chem_coefficients: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    # Common
    bbox_x0: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_y0: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_x1: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_y1: Mapped[float] = mapped_column(Float, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    confidence_level: Mapped[str] = mapped_column(String(16), default="NEEDS_REVIEW")
    vision_used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now
    )

    page: Mapped["DocumentPage"] = relationship("DocumentPage", back_populates="equations")


# ===========================================================================
# Page Diagram
# ===========================================================================

class PageDiagram(Base):
    """Figure or diagram extracted from a page."""

    __tablename__ = "ingest_page_diagrams"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    page_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ingest_document_pages.id", ondelete="CASCADE"), nullable=False
    )
    region_id: Mapped[str] = mapped_column(String(32), nullable=False)
    media_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    caption: Mapped[str] = mapped_column(Text, default="")
    detected_labels: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    description: Mapped[str] = mapped_column(Text, default="")
    associated_concept: Mapped[str] = mapped_column(Text, default="")
    bbox_x0: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_y0: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_x1: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_y1: Mapped[float] = mapped_column(Float, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    confidence_level: Mapped[str] = mapped_column(String(16), default="NEEDS_REVIEW")
    vision_used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now
    )

    page: Mapped["DocumentPage"] = relationship("DocumentPage", back_populates="diagrams")


# ===========================================================================
# Page Table
# ===========================================================================

class PageTable(Base):
    """Table extracted from a page."""

    __tablename__ = "ingest_page_tables"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    page_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ingest_document_pages.id", ondelete="CASCADE"), nullable=False
    )
    region_id: Mapped[str] = mapped_column(String(32), nullable=False)
    headers: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    rows: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    markdown: Mapped[str] = mapped_column(Text, default="")
    html: Mapped[str] = mapped_column(Text, default="")
    bbox_x0: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_y0: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_x1: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_y1: Mapped[float] = mapped_column(Float, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    confidence_level: Mapped[str] = mapped_column(String(16), default="NEEDS_REVIEW")
    vision_used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now
    )

    page: Mapped["DocumentPage"] = relationship("DocumentPage", back_populates="tables")


# ===========================================================================
# Page Question (Past-Paper)
# ===========================================================================

class PageQuestion(Base):
    """A past-paper question detected on a page."""

    __tablename__ = "ingest_page_questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    page_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ingest_document_pages.id", ondelete="CASCADE"), nullable=False
    )
    region_id: Mapped[str] = mapped_column(String(32), nullable=False)
    question_number: Mapped[str] = mapped_column(String(16), default="")
    sub_question_number: Mapped[str] = mapped_column(String(16), default="")
    section: Mapped[str] = mapped_column(String(64), default="")
    question_type: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    syllabus_version_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    marks: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    question_text: Mapped[str] = mapped_column(Text, default="")
    options: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)  # [{label, text}]
    answer_space_y0: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    answer_space_y1: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    has_diagram: Mapped[bool] = mapped_column(Boolean, default=False)
    has_formula: Mapped[bool] = mapped_column(Boolean, default=False)
    has_table: Mapped[bool] = mapped_column(Boolean, default=False)
    bbox_x0: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_y0: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_x1: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_y1: Mapped[float] = mapped_column(Float, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    confidence_level: Mapped[str] = mapped_column(String(16), default="NEEDS_REVIEW")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now
    )

    page: Mapped["DocumentPage"] = relationship("DocumentPage", back_populates="questions")
