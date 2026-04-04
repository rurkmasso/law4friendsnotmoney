"""
Download PDFs from legislation.mt by extracting the real PDF URL from the embedded viewer.

The PDF page at /eli/cap/{N}/eng/pdf contains an iframe with:
  src="https://legislation.mt/Pdf/web/viewer.html?file=https://legislation.mt/getpdf/{ID}"

We extract the getpdf URL and fetch the actual binary.

Usage:
    python scripts/download_pdfs_v3.py --max 10
    python scripts/download_pdfs_v3.py --start 1 --max 600
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


def is_valid_pdf(path):
    if not os.path.exists(path) or os.path.getsize(path) < 1000:
        return False
    with open(path, "rb") as f:
        return f.read(5) == b"%PDF-"


async def get_pdf_url_from_page(page, cap_num, lang_path):
    """Navigate to the PDF page and extract the real getpdf URL from the iframe."""
    pdf_page_url = f"{BASE}/eli/cap/{cap_num}/{lang_path}/pdf"
    try:
        await page.goto(pdf_page_url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(2000)

        # Extract iframe src with getpdf URL
        iframe_src = await page.evaluate("""
            () => {
                const iframe = document.querySelector('iframe[src*="getpdf"], iframe#the-canvas');
                if (iframe) return iframe.src;
                // Also check for direct getpdf links
                const links = document.querySelectorAll('a[href*="getpdf"]');
                if (links.length > 0) return links[0].href;
                return null;
            }
        """)

        if iframe_src:
            # Extract the file= parameter from viewer URL
            m = re.search(r'file=(https?://[^\s&]+getpdf/[^\s&]+)', iframe_src)
            if m:
                return m.group(1)
            # If it's already a getpdf URL
            if "getpdf" in iframe_src:
                return iframe_src

    except Exception as e:
        pass
    return None


async def download_pdf_binary(page, getpdf_url, dest):
    """Download the actual PDF binary using browser fetch."""
    try:
        result = await page.evaluate("""
            async (url) => {
                try {
                    const resp = await fetch(url, { credentials: 'include' });
                    if (!resp.ok) return null;
                    const buf = await resp.arrayBuffer();
                    const arr = new Uint8Array(buf);
                    if (arr.length < 500 || arr[0] !== 37) return null;  // Must start with %
                    return Array.from(arr);
                } catch(e) { return null; }
            }
        """, getpdf_url)

        if result:
            with open(dest, "wb") as f:
                f.write(bytes(result))
            return is_valid_pdf(dest)
    except:
        pass
    return False


async def main(max_chapters=None, start=1):
    print("=" * 60)
    print("  Ligi4Friends — PDF Downloader v3 (Extract getpdf URLs)")
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

    existing = sum(1 for c in chapters for lang in ["en", "mt"]
                   if is_valid_pdf(os.path.join(PDF_DIR, f"cap_{c}_{lang}.pdf")))

    print(f"\n  Chapters: {len(chapters)} (from {start})")
    print(f"  Already have: {existing} valid PDFs")
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

        print("  Opening legislation.mt...")
        await page.goto(BASE, wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(5000)
        print("  Session established!\n")

        downloaded = 0
        skipped = 0
        failed = 0

        for i, cap_num in enumerate(chapters):
            for lang_code, lang_path in [("en", "eng"), ("mt", "mlt")]:
                filename = f"cap_{cap_num}_{lang_code}.pdf"
                dest = os.path.join(PDF_DIR, filename)

                if is_valid_pdf(dest):
                    skipped += 1
                    continue

                # Step 1: Get the real PDF URL from the page
                getpdf_url = await get_pdf_url_from_page(page, cap_num, lang_path)

                if getpdf_url:
                    # Step 2: Download the actual PDF
                    ok = await download_pdf_binary(page, getpdf_url, dest)
                    if ok:
                        downloaded += 1
                        size_kb = os.path.getsize(dest) // 1024
                        print(f"  [{i+1}/{len(chapters)}] Cap. {cap_num} ({lang_code}): {size_kb}KB ✓")
                    else:
                        failed += 1
                        if os.path.exists(dest) and not is_valid_pdf(dest):
                            os.remove(dest)
                else:
                    failed += 1

                await page.wait_for_timeout(300)

            if (i + 1) % 25 == 0:
                print(f"\n  --- {i+1}/{len(chapters)}: +{downloaded} downloaded, {skipped} skipped, {failed} failed ---\n")
                # Save progress
                for law in laws:
                    m = re.search(r'(\d+)', law.get("chapter", ""))
                    if m:
                        cn = int(m.group(1))
                        if is_valid_pdf(os.path.join(PDF_DIR, f"cap_{cn}_en.pdf")):
                            law["local_pdf_en"] = f"cap_{cn}_en.pdf"
                        if is_valid_pdf(os.path.join(PDF_DIR, f"cap_{cn}_mt.pdf")):
                            law["local_pdf_mt"] = f"cap_{cn}_mt.pdf"
                save_json("legislation.json", laws)

        await browser.close()

    # Final update
    for law in laws:
        m = re.search(r'(\d+)', law.get("chapter", ""))
        if m:
            cn = int(m.group(1))
            if is_valid_pdf(os.path.join(PDF_DIR, f"cap_{cn}_en.pdf")):
                law["local_pdf_en"] = f"cap_{cn}_en.pdf"
            if is_valid_pdf(os.path.join(PDF_DIR, f"cap_{cn}_mt.pdf")):
                law["local_pdf_mt"] = f"cap_{cn}_mt.pdf"
    save_json("legislation.json", laws)

    valid_pdfs = [f for f in os.listdir(PDF_DIR) if f.endswith(".pdf") and is_valid_pdf(os.path.join(PDF_DIR, f))]
    total_size = sum(os.path.getsize(os.path.join(PDF_DIR, f)) for f in valid_pdfs)
    print(f"\n{'=' * 60}")
    print(f"  Downloaded: {downloaded}, Skipped: {skipped}, Failed: {failed}")
    print(f"  Valid PDFs: {len(valid_pdfs)} ({total_size // (1024*1024)} MB)")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--max", type=int, default=None)
    parser.add_argument("--start", type=int, default=1)
    args = parser.parse_args()
    asyncio.run(main(max_chapters=args.max, start=args.start))
