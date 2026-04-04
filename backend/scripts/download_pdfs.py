"""
Download all law PDFs from legislation.mt using Playwright to bypass Cloudflare.

PDFs follow the pattern:
  https://legislation.mt/eli/cap/{N}/eng/pdf  (English)
  https://legislation.mt/eli/cap/{N}/mlt/pdf  (Maltese)

Saves to frontend/public/data/pdfs/ so they're served on GitHub Pages.

Usage:
    python scripts/download_pdfs.py              # download all (1-600)
    python scripts/download_pdfs.py --max 10     # test with first 10
    python scripts/download_pdfs.py --start 100  # start from chapter 100
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


async def download_pdf_via_browser(page, url, dest):
    """Download PDF via browser's fetch API to bypass Cloudflare."""
    if os.path.exists(dest) and os.path.getsize(dest) > 5000:
        return True

    try:
        result = await page.evaluate("""
            async (url) => {
                try {
                    const resp = await fetch(url, { redirect: 'follow' });
                    if (!resp.ok) return { ok: false, size: 0 };
                    const ct = resp.headers.get('content-type') || '';
                    const buf = await resp.arrayBuffer();
                    const arr = new Uint8Array(buf);
                    // Check if it starts with %PDF
                    if (arr.length < 100 || (arr[0] !== 37 && !ct.includes('pdf'))) {
                        return { ok: false, size: arr.length };
                    }
                    return { ok: true, data: Array.from(arr), size: arr.length };
                } catch(e) {
                    return { ok: false, error: e.message, size: 0 };
                }
            }
        """, url)

        if result.get("ok") and result.get("data"):
            with open(dest, "wb") as f:
                f.write(bytes(result["data"]))
            return True
    except Exception as e:
        pass
    return False


async def main(max_chapters=None, start=1):
    print("=" * 60)
    print("  Tizzju — PDF Downloader (Playwright)")
    print("  Powered by Rark Musso")
    print("=" * 60)

    laws = load_legislation()
    print(f"\n  Laws in database: {len(laws)}")

    # Get chapter numbers from data + fill gaps
    chapters = set()
    for law in laws:
        m = re.search(r'(\d+)', law.get("chapter", ""))
        if m:
            chapters.add(int(m.group(1)))

    # Add range to cover gaps
    max_cap = max(chapters) if chapters else 600
    chapters.update(range(start, max(max_cap + 1, 601)))
    chapters = sorted(c for c in chapters if c >= start)

    if max_chapters:
        chapters = chapters[:max_chapters]

    print(f"  Chapters to download: {len(chapters)} (starting from {start})")
    print(f"  PDF directory: {PDF_DIR}")
    print(f"  Opening browser...\n")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )
        page = await context.new_page()
        await page.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')

        # Navigate to legislation.mt first to establish session
        print("  Navigating to legislation.mt...")
        await page.goto(BASE, wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(5000)
        print("  Session established!\n")

        downloaded = 0
        skipped = 0
        failed = 0
        pdf_map = {}

        for i, cap_num in enumerate(chapters):
            for lang_code, lang_path in [("en", "eng"), ("mt", "mlt")]:
                filename = f"cap_{cap_num}_{lang_code}.pdf"
                dest = os.path.join(PDF_DIR, filename)

                # Skip if already exists
                if os.path.exists(dest) and os.path.getsize(dest) > 5000:
                    skipped += 1
                    if cap_num not in pdf_map:
                        pdf_map[cap_num] = {}
                    pdf_map[cap_num][lang_code] = filename
                    continue

                url = f"{BASE}/eli/cap/{cap_num}/{lang_path}/pdf"
                ok = await download_pdf_via_browser(page, url, dest)

                if ok:
                    downloaded += 1
                    if cap_num not in pdf_map:
                        pdf_map[cap_num] = {}
                    pdf_map[cap_num][lang_code] = filename
                    size_kb = os.path.getsize(dest) // 1024
                    print(f"  [{i+1}/{len(chapters)}] Cap. {cap_num} ({lang_code}): {size_kb}KB")
                else:
                    failed += 1
                    if os.path.exists(dest) and os.path.getsize(dest) < 1000:
                        os.remove(dest)

                await page.wait_for_timeout(200)  # Small delay

            # Save progress every 25 chapters
            if (i + 1) % 25 == 0:
                print(f"\n  --- {i+1}/{len(chapters)}: {downloaded} downloaded, {skipped} skipped, {failed} failed ---\n")
                # Update legislation.json incrementally
                for law in laws:
                    m = re.search(r'(\d+)', law.get("chapter", ""))
                    if m and int(m.group(1)) in pdf_map:
                        cn = int(m.group(1))
                        if "en" in pdf_map[cn]:
                            law["local_pdf_en"] = pdf_map[cn]["en"]
                        if "mt" in pdf_map[cn]:
                            law["local_pdf_mt"] = pdf_map[cn]["mt"]
                save_json("legislation.json", laws)

        await browser.close()

    # Final update of legislation.json
    for law in laws:
        m = re.search(r'(\d+)', law.get("chapter", ""))
        if m and int(m.group(1)) in pdf_map:
            cn = int(m.group(1))
            if "en" in pdf_map[cn]:
                law["local_pdf_en"] = pdf_map[cn]["en"]
            if "mt" in pdf_map[cn]:
                law["local_pdf_mt"] = pdf_map[cn]["mt"]
    save_json("legislation.json", laws)

    total_pdfs = len([f for f in os.listdir(PDF_DIR) if f.endswith(".pdf")])
    total_size = sum(os.path.getsize(os.path.join(PDF_DIR, f)) for f in os.listdir(PDF_DIR) if f.endswith(".pdf"))

    print(f"\n{'=' * 60}")
    print(f"  DONE!")
    print(f"  Downloaded: {downloaded}")
    print(f"  Skipped: {skipped}")
    print(f"  Failed: {failed}")
    print(f"  Total PDFs: {total_pdfs}")
    print(f"  Total size: {total_size // (1024*1024)} MB")
    print(f"  Location: {PDF_DIR}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--max", type=int, default=None)
    parser.add_argument("--start", type=int, default=1)
    args = parser.parse_args()
    asyncio.run(main(max_chapters=args.max, start=args.start))
