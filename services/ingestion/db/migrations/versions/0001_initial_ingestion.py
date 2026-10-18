"""Initial ingestion tables

Revision ID: 0001_initial_ingestion
Revises:
Create Date: 2026-09-19

Creates all ingest_* tables owned by the Python ingestion service.
These tables are separate from the Prisma-managed domain tables.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial_ingestion"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # ingest_documents                                                      #
    # ------------------------------------------------------------------ #
    op.create_table(
        "ingest_documents",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("document_type", sa.String(20), nullable=False),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("file_path", sa.Text, nullable=False),
        sa.Column("file_hash_sha256", sa.String(64), unique=True, nullable=False),
        sa.Column("total_pages", sa.Integer, default=0),
        sa.Column("processing_status", sa.String(20), default="PENDING"),
        sa.Column("metadata_json", sa.JSON, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # ------------------------------------------------------------------ #
    # ingest_document_pages                                                #
    # ------------------------------------------------------------------ #
    op.create_table(
        "ingest_document_pages",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "document_id",
            sa.String(36),
            sa.ForeignKey("ingest_documents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("page_number", sa.Integer, nullable=False),
        sa.Column("image_path", sa.Text, nullable=True),
        sa.Column("width", sa.Integer, nullable=True),
        sa.Column("height", sa.Integer, nullable=True),
        sa.Column("orientation_angle", sa.Float, default=0.0),
        sa.Column("ocr_status", sa.String(20), default="PENDING"),
        sa.Column("processing_time_ms", sa.Float, default=0.0),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("document_id", "page_number", name="uq_doc_page"),
    )
    op.create_index(
        "idx_ingest_doc_pages_doc",
        "ingest_document_pages",
        ["document_id"],
    )

    # ------------------------------------------------------------------ #
    # ingest_page_regions                                                  #
    # ------------------------------------------------------------------ #
    op.create_table(
        "ingest_page_regions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "page_id",
            sa.String(36),
            sa.ForeignKey("ingest_document_pages.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("region_id", sa.String(32), nullable=False),
        sa.Column("region_type", sa.String(32), nullable=False),
        sa.Column("bbox_x0", sa.Float, nullable=False),
        sa.Column("bbox_y0", sa.Float, nullable=False),
        sa.Column("bbox_x1", sa.Float, nullable=False),
        sa.Column("bbox_y1", sa.Float, nullable=False),
        sa.Column("text", sa.Text, default=""),
        sa.Column("confidence", sa.Float, default=0.0),
        sa.Column("confidence_level", sa.String(16), default="NEEDS_REVIEW"),
        sa.Column("vision_used", sa.Boolean, default=False),
        sa.Column("reading_order", sa.Integer, nullable=True),
        sa.Column("raw_ocr", sa.JSON, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "idx_ingest_regions_page",
        "ingest_page_regions",
        ["page_id"],
    )
    op.create_index(
        "idx_ingest_regions_type",
        "ingest_page_regions",
        ["region_type"],
    )

    # ------------------------------------------------------------------ #
    # ingest_page_equations                                                #
    # ------------------------------------------------------------------ #
    op.create_table(
        "ingest_page_equations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "page_id",
            sa.String(36),
            sa.ForeignKey("ingest_document_pages.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("region_id", sa.String(32), nullable=False),
        sa.Column("display_form", sa.Text, default=""),
        sa.Column("latex", sa.Text, default=""),
        sa.Column("normalized_form", sa.Text, default=""),
        sa.Column("is_chemical", sa.Boolean, default=False),
        sa.Column("chem_display", sa.Text, default=""),
        sa.Column("chem_normalized", sa.Text, default=""),
        sa.Column("chem_arrow", sa.String(8), default="→"),
        sa.Column("chem_state_symbols", sa.JSON, nullable=True),
        sa.Column("chem_coefficients", sa.JSON, nullable=True),
        sa.Column("bbox_x0", sa.Float, nullable=False),
        sa.Column("bbox_y0", sa.Float, nullable=False),
        sa.Column("bbox_x1", sa.Float, nullable=False),
        sa.Column("bbox_y1", sa.Float, nullable=False),
        sa.Column("confidence", sa.Float, default=0.0),
        sa.Column("confidence_level", sa.String(16), default="NEEDS_REVIEW"),
        sa.Column("vision_used", sa.Boolean, default=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "idx_ingest_equations_page",
        "ingest_page_equations",
        ["page_id"],
    )
    op.create_index(
        "idx_ingest_equations_chemical",
        "ingest_page_equations",
        ["is_chemical"],
    )

    # ------------------------------------------------------------------ #
    # ingest_page_diagrams                                                 #
    # ------------------------------------------------------------------ #
    op.create_table(
        "ingest_page_diagrams",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "page_id",
            sa.String(36),
            sa.ForeignKey("ingest_document_pages.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("region_id", sa.String(32), nullable=False),
        sa.Column("media_path", sa.Text, nullable=True),
        sa.Column("caption", sa.Text, default=""),
        sa.Column("detected_labels", sa.JSON, nullable=True),
        sa.Column("description", sa.Text, default=""),
        sa.Column("associated_concept", sa.Text, default=""),
        sa.Column("bbox_x0", sa.Float, nullable=False),
        sa.Column("bbox_y0", sa.Float, nullable=False),
        sa.Column("bbox_x1", sa.Float, nullable=False),
        sa.Column("bbox_y1", sa.Float, nullable=False),
        sa.Column("confidence", sa.Float, default=0.0),
        sa.Column("confidence_level", sa.String(16), default="NEEDS_REVIEW"),
        sa.Column("vision_used", sa.Boolean, default=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "idx_ingest_diagrams_page",
        "ingest_page_diagrams",
        ["page_id"],
    )

    # ------------------------------------------------------------------ #
    # ingest_page_tables                                                   #
    # ------------------------------------------------------------------ #
    op.create_table(
        "ingest_page_tables",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "page_id",
            sa.String(36),
            sa.ForeignKey("ingest_document_pages.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("region_id", sa.String(32), nullable=False),
        sa.Column("headers", sa.JSON, nullable=True),
        sa.Column("rows", sa.JSON, nullable=True),
        sa.Column("markdown", sa.Text, default=""),
        sa.Column("html", sa.Text, default=""),
        sa.Column("bbox_x0", sa.Float, nullable=False),
        sa.Column("bbox_y0", sa.Float, nullable=False),
        sa.Column("bbox_x1", sa.Float, nullable=False),
        sa.Column("bbox_y1", sa.Float, nullable=False),
        sa.Column("confidence", sa.Float, default=0.0),
        sa.Column("confidence_level", sa.String(16), default="NEEDS_REVIEW"),
        sa.Column("vision_used", sa.Boolean, default=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "idx_ingest_tables_page",
        "ingest_page_tables",
        ["page_id"],
    )

    # ------------------------------------------------------------------ #
    # ingest_page_questions                                                #
    # ------------------------------------------------------------------ #
    op.create_table(
        "ingest_page_questions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "page_id",
            sa.String(36),
            sa.ForeignKey("ingest_document_pages.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("region_id", sa.String(32), nullable=False),
        sa.Column("question_number", sa.String(16), default=""),
        sa.Column("sub_question_number", sa.String(16), default=""),
        sa.Column("section", sa.String(64), default=""),
        sa.Column("marks", sa.Float, nullable=True),
        sa.Column("question_text", sa.Text, default=""),
        sa.Column("options", sa.JSON, nullable=True),
        sa.Column("has_diagram", sa.Boolean, default=False),
        sa.Column("has_formula", sa.Boolean, default=False),
        sa.Column("has_table", sa.Boolean, default=False),
        sa.Column("bbox_x0", sa.Float, nullable=False),
        sa.Column("bbox_y0", sa.Float, nullable=False),
        sa.Column("bbox_x1", sa.Float, nullable=False),
        sa.Column("bbox_y1", sa.Float, nullable=False),
        sa.Column("confidence", sa.Float, default=0.0),
        sa.Column("confidence_level", sa.String(16), default="NEEDS_REVIEW"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "idx_ingest_questions_page",
        "ingest_page_questions",
        ["page_id"],
    )
    op.create_index(
        "idx_ingest_questions_qnum",
        "ingest_page_questions",
        ["question_number"],
    )


def downgrade() -> None:
    op.drop_table("ingest_page_questions")
    op.drop_table("ingest_page_tables")
    op.drop_table("ingest_page_diagrams")
    op.drop_table("ingest_page_equations")
    op.drop_table("ingest_page_regions")
    op.drop_table("ingest_document_pages")
    op.drop_table("ingest_documents")
