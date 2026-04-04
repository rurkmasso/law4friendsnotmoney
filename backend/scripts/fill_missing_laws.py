"""
Fill in missing law entries in legislation.json for chapters that have PDFs but no metadata.
Scrapes the title from legislation.mt for each missing chapter.

Usage:
    python scripts/fill_missing_laws.py
"""
import asyncio
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
FRONTEND_DATA = os.path.join(ROOT, "..", "frontend", "public", "data")
PDF_DIR = os.path.join(FRONTEND_DATA, "pdfs")
BASE = "https://legislation.mt"


def load_legislation():
    path = os.path.join(FRONTEND_DATA, "legislation.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return []


def save_json(data):
    for path in [os.path.join(DATA_DIR, "legislation.json"),
                 os.path.join(FRONTEND_DATA, "legislation.json")]:
        with open(path, "w") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)


def is_valid_pdf(path):
    if not os.path.exists(path) or os.path.getsize(path) < 1000:
        return False
    with open(path, "rb") as f:
        return f.read(5) == b"%PDF-"


async def main():
    print("=" * 60)
    print("  SacLigi — Fill Missing Law Entries")
    print("  Powered by Rark Musso")
    print("=" * 60)

    laws = load_legislation()
    existing_chapters = set()
    for law in laws:
        m = re.search(r'(\d+)', law.get("chapter", ""))
        if m:
            existing_chapters.add(int(m.group(1)))

    # Find chapters with PDFs but no entry
    missing = []
    for f in os.listdir(PDF_DIR):
        m = re.match(r'cap_(\d+)_en\.pdf', f)
        if m:
            cn = int(m.group(1))
            if cn not in existing_chapters:
                missing.append(cn)
    missing.sort()

    print(f"\n  Existing law entries: {len(laws)}")
    print(f"  Missing entries (have PDF): {len(missing)}")

    if not missing:
        print("  Nothing to do!")
        return

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        )
        page = await context.new_page()
        await page.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')

        print("  Opening legislation.mt...")
        await page.goto(BASE, wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(5000)

        added = 0
        for i, cn in enumerate(missing):
            url = f"{BASE}/eli/cap/{cn}/eng"
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=20000)
                await page.wait_for_timeout(1500)

                # Extract title
                title_en = await page.evaluate("""
                    () => {
                        // Try various selectors for the law title
                        const h1 = document.querySelector('h1, .title, #title, .act-title');
                        if (h1) return h1.textContent.trim();
                        const meta = document.querySelector('meta[property="og:title"], meta[name="title"]');
                        if (meta) return meta.content;
                        return document.title;
                    }
                """)

                # Clean up title
                title_en = title_en.replace("LEĠIŻLAZZJONI MALTA", "").strip()
                if not title_en or title_en == "LEĠIŻLAZZJONI MALTA":
                    title_en = f"Chapter {cn}"

                # Get Maltese title too
                mt_title = ""
                try:
                    await page.goto(f"{BASE}/eli/cap/{cn}/mlt", wait_until="domcontentloaded", timeout=15000)
                    await page.wait_for_timeout(1000)
                    mt_title = await page.evaluate("""
                        () => {
                            const h1 = document.querySelector('h1, .title, #title, .act-title');
                            if (h1) return h1.textContent.trim();
                            return '';
                        }
                    """)
                    mt_title = mt_title.replace("LEĠIŻLAZZJONI MALTA", "").strip()
                except:
                    pass

                # Build entry
                en_pdf = f"cap_{cn}_en.pdf"
                mt_pdf = f"cap_{cn}_mt.pdf"
                entry = {
                    "chapter": f"Kap. {cn}",
                    "title": mt_title or title_en,
                    "title_en": title_en,
                    "title_mt": mt_title,
                    "type": "Principal",
                    "eli_link": f"{BASE}/eli/cap/{cn}",
                    "source_url": f"{BASE}/eli/cap/{cn}",
                    "pdf_url_en": f"{BASE}/eli/cap/{cn}/eng/pdf",
                    "pdf_url_mt": f"{BASE}/eli/cap/{cn}/mlt/pdf",
                    "languages": ["en", "mt"],
                    "format": "pdf",
                }

                if is_valid_pdf(os.path.join(PDF_DIR, en_pdf)):
                    entry["local_pdf_en"] = en_pdf
                if is_valid_pdf(os.path.join(PDF_DIR, mt_pdf)):
                    entry["local_pdf_mt"] = mt_pdf

                laws.append(entry)
                added += 1
                print(f"  [{i+1}/{len(missing)}] Cap. {cn}: {title_en[:60]}")

            except Exception as e:
                # Still add a basic entry
                entry = {
                    "chapter": f"Kap. {cn}",
                    "title": f"Chapter {cn}",
                    "title_en": f"Chapter {cn}",
                    "source_url": f"{BASE}/eli/cap/{cn}",
                    "pdf_url_en": f"{BASE}/eli/cap/{cn}/eng/pdf",
                    "pdf_url_mt": f"{BASE}/eli/cap/{cn}/mlt/pdf",
                }
                en_pdf = f"cap_{cn}_en.pdf"
                mt_pdf = f"cap_{cn}_mt.pdf"
                if is_valid_pdf(os.path.join(PDF_DIR, en_pdf)):
                    entry["local_pdf_en"] = en_pdf
                if is_valid_pdf(os.path.join(PDF_DIR, mt_pdf)):
                    entry["local_pdf_mt"] = mt_pdf
                laws.append(entry)
                added += 1

            if (i + 1) % 50 == 0:
                save_json(laws)
                print(f"  --- Saved {added} new entries ---")

            await page.wait_for_timeout(300)

        await browser.close()

    # Sort by chapter number
    def sort_key(law):
        m = re.search(r'(\d+)', law.get("chapter", ""))
        return int(m.group(1)) if m else 9999
    laws.sort(key=sort_key)

    save_json(laws)
    print(f"\n{'=' * 60}")
    print(f"  Added: {added} new entries")
    print(f"  Total laws: {len(laws)}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    asyncio.run(main())
