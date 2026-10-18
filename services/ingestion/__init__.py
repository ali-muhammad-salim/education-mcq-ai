"""
Document Intelligence Pipeline
================================
Ingests PDF, JPG, JPEG, PNG (including scanned documents) and produces
structured page representations stored in PostgreSQL.

Usage:
    python -m services.ingestion <file_path> [--doc-type BOOK|PAST_PAPER]
"""
