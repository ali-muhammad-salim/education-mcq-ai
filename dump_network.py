import asyncio
from playwright.async_api import async_playwright
import json

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        captured_urls = []

        page.on("response", lambda response: asyncio.create_task(handle_response(response, captured_urls)))

        await page.goto("https://examinationboard.aku.edu/learning-materials", wait_until="networkidle")
        await asyncio.sleep(5) # wait for extra requests
        
        with open("scratch/urls.json", "w") as f:
            json.dump(captured_urls, f, indent=2)

        await browser.close()

async def handle_response(response, urls):
    if response.request.resource_type in ["xhr", "fetch"]:
        try:
            text = await response.text()
            if "storyblok" in text.lower() or ".pdf" in text.lower():
                urls.append({
                    "url": response.url,
                    "text": text[:2000] # store some of the text to debug
                })
        except Exception:
            pass

if __name__ == "__main__":
    asyncio.run(main())
