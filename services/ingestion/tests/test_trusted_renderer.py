import asyncio
import math
import runpy
import sys
import types
from pathlib import Path
import pymupdf
import pytest
from PIL import Image
from services.ingestion.trusted_renderer import render, validate_box
from services.inference.gemini_client import GeminiKeyPool


@pytest.mark.parametrize('box', [[-1, 0, 100, 100], [0, 0, 1001, 100], [100, 0, 10, 100], [math.nan, 0, 100, 100], [True, 0, 100, 100], [0, 0, 1000, 1000]])
def test_invalid_boxes_fail_closed(box):
    with pytest.raises(ValueError):
        validate_box(box)


def test_renderer_reaches_pages_after_fifteen_and_bounds_large_images(tmp_path):
    source = tmp_path / 'source.pdf'
    with pymupdf.open() as doc:
        for _ in range(17):
            doc.new_page(width=3000, height=4000)
        doc.save(source)
    assert render(source, tmp_path / 'unused.png')['totalPages'] == 17
    result = render(source, tmp_path / 'page17.png', 17)
    assert result['pageNumber'] == 17
    assert max(result['width'], result['height']) <= 2601
    crop = render(source, tmp_path / 'crop.png', 17, [100, 100, 500, 500])
    assert crop['sha256'] and crop['width'] > 0


def test_exhausted_pool_returns_without_sleeping_and_permission_keys_stay_disabled():
    async def check():
        pool = GeminiKeyPool(['test-only-key-1', 'test-only-key-2'])
        await pool.mark_key_exhausted(pool.keys[0], 'HTTP 401')
        await pool.mark_key_exhausted(pool.keys[1], 'HTTP 429')
        assert pool.is_all_exhausted()
        assert await asyncio.wait_for(pool.get_active_key(), timeout=.2) is None
        pool.keys[0].retry_at = 0
        pool.keys[1].retry_at = 0
        assert (await pool.get_active_key()).key_index == 1
        assert pool.keys[0].disabled
    asyncio.run(check())


def test_crop_coordinates_follow_the_rotated_preview(tmp_path):
    source = tmp_path / 'rotated.pdf'
    with pymupdf.open() as doc:
        page = doc.new_page(width=200, height=100)
        page.draw_rect(pymupdf.Rect(20, 20, 60, 50), color=(1, 0, 0), fill=(1, 0, 0))
        page.set_rotation(90)
        doc.save(source)
    crop = tmp_path / 'rotated-crop.png'
    render(source, crop, 1, [100, 500, 300, 800])
    with Image.open(crop) as image:
        red = sum(1 for r, g, b in image.getdata() if r > 200 and g < 40 and b < 40)
        assert red / (image.width * image.height) > .5


def test_extreme_page_size_cannot_bypass_pixel_limit(tmp_path):
    source = tmp_path / 'extreme.pdf'
    with pymupdf.open() as doc:
        doc.new_page(width=100000, height=200000)
        doc.save(source)
    result = render(source, tmp_path / 'bounded.png', 1)
    assert max(result['width'], result['height']) <= 2601


@pytest.mark.parametrize('script', ['run_gemini_ai_intake.py', 'build_full_knowledge_base.py', 'sync_exact_physics_to_db.py', 'ingest_physics_model_papers.py', 'clear_db.py', 'wipe_all_data.py', 'clean_data.py'])
def test_retired_commands_cannot_connect_to_a_database(script, monkeypatch):
    def forbidden(*args, **kwargs):
        raise AssertionError('Retired command attempted a database connection')
    monkeypatch.setitem(sys.modules, 'psycopg2', types.SimpleNamespace(connect=forbidden))
    with pytest.raises(SystemExit) as stopped:
        runpy.run_path(str(Path(__file__).resolve().parents[3] / 'scripts' / script), run_name='__main__')
    assert stopped.value.code == 2
