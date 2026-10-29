"""Retired diagram importer. AI detection alone never verifies a diagram.

The source-review worker uses trust.ts and trusted_renderer.py: bounded boxes,
immutable source hashes, separate figures per page and independent review.
"""


async def extract_verified_diagrams(*args, **kwargs):
    raise RuntimeError("Use the durable source-review ingestion worker; unreviewed crops cannot be marked verified.")


def get_diagram_for_question(*args, **kwargs):
    # Legacy manifests do not carry an auditable approval or source revision.
    return None
