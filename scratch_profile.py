import asyncio
import time
import base64
import json
import httpx
import threading
import sys
from io import BytesIO
from PIL import Image

from services.inference.gpu import get_gpu_info

models_to_test = [
    "qwen2.5:3b",
    "qwen3:4b-q4_K_M",
    "qwen3:8b-q4_K_M",
    "qwen3-vl:2b-instruct-q4_K_M",
    "nomic-embed-text:latest"
]

OLLAMA_URL = "http://localhost:11434"

def get_vram_free():
    stats = get_gpu_info()
    if stats:
        return stats[0].free_mib, stats[0].total_mib
    return 0, 0

async def unload_model(client, model):
    url = f"{OLLAMA_URL}/api/generate"
    payload = {"model": model, "keep_alive": 0}
    try:
        await client.post(url, json=payload, timeout=10.0)
    except Exception as e:
        print(f"Error unloading {model}: {e}")

async def run_inference(client, model):
    if "embed" in model:
        url = f"{OLLAMA_URL}/api/embeddings"
        payload = {"model": model, "prompt": "Hello world"}
        t0 = time.time()
        resp = await client.post(url, json=payload, timeout=60.0)
        t1 = time.time()
        return t1 - t0, resp.json()
    elif "vl" in model or "vision" in model:
        # Create a tiny dummy image
        img = Image.new('RGB', (64, 64), color='red')
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        b64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        url = f"{OLLAMA_URL}/api/generate"
        payload = {
            "model": model,
            "prompt": "What color is this image?",
            "images": [b64],
            "stream": False
        }
        t0 = time.time()
        resp = await client.post(url, json=payload, timeout=60.0)
        t1 = time.time()
        return t1 - t0, resp.json()
    else:
        url = f"{OLLAMA_URL}/api/generate"
        payload = {
            "model": model,
            "prompt": "Explain Newton's second law briefly.",
            "stream": False
        }
        t0 = time.time()
        resp = await client.post(url, json=payload, timeout=60.0)
        t1 = time.time()
        return t1 - t0, resp.json()

async def main():
    results = []
    
    async with httpx.AsyncClient() as client:
        # First ensure all models are unloaded
        for m in models_to_test:
            await unload_model(client, m)
        await asyncio.sleep(2) # Give it time to unload
        
        for model in models_to_test:
            print(f"Testing {model}...")
            # Unload before just in case
            await unload_model(client, model)
            await asyncio.sleep(2)
            
            vram_free_before, vram_total = get_vram_free()
            vram_used_before = vram_total - vram_free_before
            
            # Monitoring thread
            keep_running = True
            vram_measurements = []
            
            def monitor():
                while keep_running:
                    free, tot = get_vram_free()
                    vram_measurements.append(tot - free)
                    time.sleep(0.1)
                    
            t = threading.Thread(target=monitor)
            t.start()
            
            try:
                inf_time, resp_data = await run_inference(client, model)
            except Exception as e:
                print(f"Failed {model}: {e}")
                inf_time = 0
            
            keep_running = False
            t.join()
            
            peak_vram_used = max(vram_measurements) if vram_measurements else vram_used_before
            
            await unload_model(client, model)
            await asyncio.sleep(2)
            
            vram_free_after, _ = get_vram_free()
            vram_used_after = vram_total - vram_free_after
            
            results.append({
                "model": model,
                "inf_time": inf_time,
                "vram_before": vram_used_before,
                "vram_peak": peak_vram_used,
                "vram_after": vram_used_after,
                "delta": peak_vram_used - vram_used_before
            })
            print(f"Done {model}. Delta: {peak_vram_used - vram_used_before} MiB")
            
    print("\n--- RESULTS ---")
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
