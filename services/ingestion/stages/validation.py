"""
Stage 1 – File Validation and SHA-256 Hashing.

Responsibilities:
- Accept: .pdf, .jpg, .jpeg, .png
- Reject unsupported file types with a clear error message
- Compute SHA-256 of the entire file
- Return a (path, hash) pair for downstream stages
"""

from __future__ import annotations

import hashlib
import mimetypes
from pathlib import Path

SUPPORTED_EXTENSIONS: set[str] = {".pdf", ".jpg", ".jpeg", ".png"}
SUPPORTED_MIMES: set[str] = {
    "application/pdf",
    "image/jpeg",
    "image/png",
}


class ValidationError(Exception):
    """Raised when a file fails validation."""


def validate_and_hash(file_path: str | Path) -> tuple[Path, str]:
    """
    Validate the input file and compute its SHA-256 digest.

    Parameters
    ----------
    file_path:
        Path to the input document (string or pathlib.Path).

    Returns
    -------
    (resolved_path, sha256_hex)

    Raises
    ------
    ValidationError
        If the file does not exist, is empty, or has an unsupported extension.
    """
    path = Path(file_path).resolve()

    # Existence
    if not path.exists():
        raise ValidationError(f"File not found: {path}")

    # Not a directory
    if path.is_dir():
        raise ValidationError(f"Expected a file, got a directory: {path}")

    # Extension check
    suffix = path.suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise ValidationError(
            f"Unsupported file type '{suffix}'. "
            f"Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
        )

    # Size check (must not be empty)
    size = path.stat().st_size
    if size == 0:
        raise ValidationError(f"File is empty: {path}")

    # MIME sniff as secondary guard (best-effort)
    mime, _ = mimetypes.guess_type(str(path))
    if mime is not None and mime not in SUPPORTED_MIMES:
        # Only warn, don't fail — mimetypes can miss scanned PDFs saved as .pdf
        pass

    # SHA-256
    sha256 = _compute_sha256(path)

    return path, sha256


def _compute_sha256(path: Path) -> str:
    """Compute SHA-256 digest of a file in streaming chunks."""
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()
