"""Compatibility entry point for the retired unreviewed import pipeline.

The replacement is services/ingestion/trusted.ts. Existing published
questions are preserved; this module never resets or overwrites them.
"""


async def run_past_paper_pipeline(conn, client, pdf_path, user_meta, log_cb=print):
    raise RuntimeError('Legacy direct-to-published ingestion is retired. Upload the source through the administrator ingestion endpoint; the dedicated AI worker stages evidence in the source review queue.')
