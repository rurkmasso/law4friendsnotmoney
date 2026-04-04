"""
Download PDFs by navigating to the URL and intercepting the response.
Uses Playwright's response interception to catch the actual PDF data.

Usage:
    python scripts/download_pdfs_v2.py --max 10
"""
import asyncio
import json
import os
import sys
import re
import argparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
FRONTEND_DATA = os.path.join(ROOT, "..", "frontend", "public", "data")
PDF_DIR = os.path.join(FRONTEND_DATA, "pdfs")
os.makedirs(PDF_DIR, exist_ok=True)
BASE = "https://legislation.mt"


def load_legislation():
    for path in [os.path.join(DATA_DIR, "legislation.json"), os.path.join(FRONTEND_DATA, "legislation.json")]:
        if os.path.exists(path):
            with open(path) as f:
                return json.load(f)
    return []


def save_json(filename, data):
    for path in [os.path.join(DATA_DIR, filename), os.path.join(FRONTEND_DATA, filename)]:
        with open(path, "w") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)


async def download_pdf_navigate(page, url, dest):
    """Download PDF by navigating to the URL directly."""
    if os.path.exists(dest) and os.path.getsize(dest) > 5000:
        return True

    try:
        # Set up download handling
        async with page.expect_download(timeout=30000) as download_info:
            # Navigate to the PDF URL — this should trigger a download
            await page.goto(url, wait_until="commit", timeout=30000)
        download = await download_info.value
        await download.save_as(dest)
        if os.path.exists(dest) and os.path.getsize(dest) > 1000:
            return True
    except:
        pass

    # Fallback: try getting response body directly
    try:
        response = await page.goto(url, wait_until="networkidle", timeout=30000)
        if response:
            ct = response.headers.get("content-type", "")
            if "pdf" in ct or "octet" in ct:
                body = await response.body()
                if len(body) > 1000 and body[:5] == b'%PDF-':
                    with open(dest, "wb") as f:
                        f.write(body)
                    return True

        # Check if there's a download link on the page
        content = await page.content()
        if "GetPdf" in content or "download" in content.lower():
            # Try to find and click a download button
            links = await page.locator("a[href*='pdf'], a[href*='PDF'], a[href*='GetPdf'], button:has-text('Download'), a:has-text('Download')").all()
            for link in links:
                try:
                    async with page.expect_download(timeout=15000) as dl:
                        await link.click()
                    download = await dl.value
                    await download.save_as(dest)
                    if os.path.exists(dest) and os.path.getsize(dest) > 1000:
                        return True
                except:
                    continue

        # Last resort: look for embedded PDF or iframe
        for frame in page.frames:
            frame_url = frame.url
            if "pdf" in frame_url.lower():
                try:
                    resp = await frame.evaluate("async () => { const r = await fetch(document.location.href); const b = await r.arrayBuffer(); return Array.from(new Uint8Array(b)); }")
                    if resp and len(resp) > 1000:
                        with open(dest, "wb") as f:
                            f.write(bytes(resp))
                        return True
                except:
                    pass

    except Exception as e:
        pass

    # Clean up
    if os.path.exists(dest) and os.path.getsize(dest) < 1000:
        os.remove(dest)
    return False


async def main(max_chapters=None, start=1):
    print("=" * 60)
    print("  Tizzju — PDF Downloader v2 (Navigate + Download)")
    print("  Powered by Rark Musso")
    print("=" * 60)

    laws = load_legislation()
    chapters = set()
    for law in laws:
        m = re.search(r'(\d+)', law.get("chapter", ""))
        if m:
            chapters.add(int(m.group(1)))
    chapters.update(range(start, 601))
    chapters = sorted(c for c in chapters if c >= start)
    if max_chapters:
        chapters = chapters[:max_chapters]

    print(f"  Chapters: {len(chapters)} (from {start})")
    print(f"  PDF dir: {PDF_DIR}\n")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            accept_downloads=True,
        )
        page = await context.new_page()
        await page.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')

        # Navigate to legislation.mt first
        print("  Navigating to legislation.mt...")
        await page.goto(BASE, wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(5000)
        print("  Ready!\n")

        downloaded = 0
        skipped = 0
        failed = 0

        for i, cap_num in enumerate(chapters):
            for lang_code, lang_path in [("en", "eng"), ("mt", "mlt")]:
                filename = f"cap_{cap_num}_{lang_code}.pdf"
                dest = os.path.join(PDF_DIR, filename)

                if os.path.exists(dest) and os.path.getsize(dest) > 5000:
                    skipped += 1
                    continue

                url = f"{BASE}/eli/cap/{cap_num}/{lang_path}/pdf"
                ok = await download_pdf_navigate(page, url, dest)

                if ok:
                    downloaded += 1
                    size_kb = os.path.getsize(dest) // 1024
                    print(f"  [{i+1}/{len(chapters)}] Cap. {cap_num} ({lang_code}): {size_kb}KB")
                else:
                    failed += 1

                await page.wait_for_timeout(500)

            if (i + 1) % 25 == 0:
                print(f"\n  --- {i+1}/{len(chapters)}: +{downloaded} downloaded, {skipped} skipped, {failed} failed ---\n")

        await browser.close()

    # Update legislation.json
    for law in laws:
        m = re.search(r'(\d+)', law.get("chapter", ""))
        if m:
            cn = int(m.group(1))
            en_file = f"cap_{cn}_en.pdf"
            mt_file = f"cap_{cn}_mt.pdf"
            if os.path.exists(os.path.join(PDF_DIR, en_file)) and os.path.getsize(os.path.join(PDF_DIR, en_file)) > 5000:
                law["local_pdf_en"] = en_file
            if os.path.exists(os.path.join(PDF_DIR, mt_file)) and os.path.getsize(os.path.join(PDF_DIR, mt_file)) > 5000:
                law["local_pdf_mt"] = mt_file
    save_json("legislation.json", laws)

    total_pdfs = len([f for f in os.listdir(PDF_DIR) if f.endswith(".pdf")])
    total_size = sum(os.path.getsize(os.path.join(PDF_DIR, f)) for f in os.listdir(PDF_DIR) if f.endswith(".pdf"))
    print(f"\n{'=' * 60}")
    print(f"  Downloaded: {downloaded}, Skipped: {skipped}, Failed: {failed}")
    print(f"  Total: {total_pdfs} PDFs ({total_size // (1024*1024)} MB)")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--max", type=int, default=None)
    parser.add_argument("--start", type=int, default=1)
    args = parser.parse_args()
    asyncio.run(main(max_chapters=args.max, start=args.start))
