"""
Tests for Gemini Multi-Key Rotation Pool & Quota Checkpointing.

Verifies:
1. Pool correctly loads and rotates multiple API keys.
2. HTTP 429 quota exhaustion marks the key exhausted and rotates to next available key.
3. When all keys in the pool are exhausted, system triggers checkpoint and reports clean next-day resumption.
4. Checkpoints save exact document ID and page number without data loss.
"""

import pytest
import asyncio
from pathlib import Path
from services.inference.gemini_client import (
    GeminiClient,
    GeminiKeyPool,
    KeyState,
)


def test_key_pool_initialization():
    keys = ["AIzaSyD_Key1_Example123", "AIzaSyD_Key2_Example456", "AIzaSyD_Key3_Example789"]
    pool = GeminiKeyPool(keys=keys)
    assert pool.total_keys == 3
    assert pool.has_keys
    summary = pool.summary()
    assert summary["total_keys"] == 3
    assert summary["active_keys"] == 3
    assert summary["exhausted_keys"] == 0


@pytest.mark.asyncio
async def test_round_robin_and_rotation():
    keys = ["AIzaSyD_Key1_Example123", "AIzaSyD_Key2_Example456"]
    pool = GeminiKeyPool(keys=keys)

    # First fetch: Key 0
    k0 = await pool.get_active_key()
    assert k0 is not None
    assert k0.key_index == 0

    # Second fetch: Key 1
    k1 = await pool.get_active_key()
    assert k1 is not None
    assert k1.key_index == 1

    # Mark Key 0 as exhausted
    await pool.mark_key_exhausted(k0, reason="Quota limit reached")
    assert k0.is_exhausted
    assert pool.summary()["active_keys"] == 1
    assert pool.summary()["exhausted_keys"] == 1

    # Next fetch must skip exhausted Key 0 and return Key 1
    k_next = await pool.get_active_key()
    assert k_next is not None
    assert k_next.key_index == 1


@pytest.mark.asyncio
async def test_all_keys_exhausted_behavior(tmp_path):
    keys = ["AIzaSyD_Key1_Example123", "AIzaSyD_Key2_Example456"]
    client = GeminiClient(api_keys=keys, checkpoint_dir=str(tmp_path))

    # Exhaust all keys
    for k in client.pool._keys:
        await client.pool.mark_key_exhausted(k)

    # Next call returns all_keys_exhausted=True
    resp = await client.generate(prompt="Test prompt")
    assert not resp.success
    assert resp.status_code == 429
    assert resp.all_keys_exhausted
    assert "exhausted their daily free quota" in resp.error

    # Verify Checkpoint writing
    checkpoint_file = client.save_quota_checkpoint(
        doc_id="physics_ssc1_textbook",
        last_completed_page=42,
    )
    assert Path(checkpoint_file).exists()

    import json
    with open(checkpoint_file, "r") as f:
        data = json.load(f)
    assert data["doc_id"] == "physics_ssc1_textbook"
    assert data["last_completed_page"] == 42
    assert "Page 43" in data["resumption_note"]
