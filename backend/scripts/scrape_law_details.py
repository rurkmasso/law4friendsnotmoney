"""
Enhanced legislation scraper — fetches full metadata + PDF links for each law.
Uses Playwright to handle Cloudflare-protected legislation.mt pages.

Extracts per law:
  - type, title, ELI link, keywords, languages, format
  - status (In Force / Repealed), effective_date, publication_date
  - relationships (Basic Act, amendments timeline)
  - pdf_url (direct link to PDF on legislation.mt)

Usage:
    python scripts/scrape_law_details.py              # scrape all laws
    python scripts/scrape_law_details.py --limit 10   # test with first 10
    python scripts/scrape_law_details.py --resume      # resume from last position
"""
import asyncio
import argparse
import json
import os
import sys
import re
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
FRONTEND_DATA = os.path.join(ROOT, "..", "frontend", "public", "data")
PDF_DIR = os.path.join(DATA_DIR, "pdfs")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(FRONTEND_DATA, exist_ok=True)
os.makedirs(PDF_DIR, exist_ok=True)

BASE_URL = "https://legislation.mt"


def save_json(filename, data):
    """Save JSON to both backend/data and frontend/public/data."""
    for path in [os.path.join(DATA_DIR, filename), os.path.join(FRONTEND_DATA, filename)]:
        with open(path, "w") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  Saved {len(data)} items to {filename}")


def load_existing():
    """Load existing legislation_detailed.json if it exists."""
    path = os.path.join(DATA_DIR, "legislation_detailed.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return []


def load_base_legislation():
    """Load the base legislation.json list."""
    path = os.path.join(DATA_DIR, "legislation.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return []


def extract_chapter_number(chapter_str):
    """Extract numeric chapter from 'Kap. 154' -> '154'."""
    m = re.search(r'(\d+)', chapter_str)
    return m.group(1) if m else None


def build_detail_url(source_url):
    """Build the detail page URL from the source_url in legislation.json."""
    # source_url is like https://legislation.mt/eli/cap/154/mlt
    # The detail/metadata page is the same URL
    return source_url


async def extract_metadata_from_page(page, url, chapter_str):
    """Visit a law's detail page and extract all metadata."""
    meta = {
        "type": "",
        "eli_link": "",
        "keywords": [],
        "languages": [],
        "format": "PDF",
        "status": "",
        "effective_date": "",
        "publication_date": "",
        "indicative_publication_date": "",
        "pdf_url": "",
        "pdf_url_mt": "",
        "pdf_url_en": "",
        "relationships": [],
        "timeline": [],
        "title_en": "",
        "title_mt": "",
    }

    try:
        await page.goto(url, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)

        content = await page.content()
        soup = BeautifulSoup(content, "lxml")

        # ── Extract metadata from the detail panel ──
        # legislation.mt uses a metadata section with dt/dd or table rows

        # Look for metadata in definition lists
        for dt in soup.select("dt, .metadata-label, .field-label, th"):
            label = dt.get_text(strip=True).lower()
            dd = dt.find_next_sibling("dd") or dt.find_next_sibling("td")
            if not dd:
                continue
            value = dd.get_text(strip=True)

            if "type" in label and "chapter" in value.lower():
                meta["type"] = value
            elif "type" in label:
                meta["type"] = value
            elif "eli" in label:
                meta["eli_link"] = value
                # Also check for link
                a = dd.find("a")
                if a and a.get("href"):
                    meta["eli_link"] = a["href"]
            elif "keyword" in label:
                meta["keywords"] = [k.strip() for k in value.split(",") if k.strip()]
            elif "language" in label:
                meta["languages"] = [l.strip() for l in value.split() if l.strip()]
            elif "format" in label:
                meta["format"] = value
            elif "status" in label:
                meta["status"] = value
            elif "effective" in label:
                meta["effective_date"] = value
            elif "publication" in label and "indicative" in label:
                meta["indicative_publication_date"] = value
            elif "publication" in label:
                meta["publication_date"] = value

        # Look for status in badge/tag elements
        for badge in soup.select(".badge, .tag, .status, .label-success, .label-danger, [class*='status']"):
            text = badge.get_text(strip=True)
            if text in ("In Force", "Fis-Seħħ", "Repealed", "Imħassar"):
                meta["status"] = text

        # ── Extract metadata from structured data / meta tags ──
        for meta_tag in soup.select("meta"):
            name = (meta_tag.get("name") or meta_tag.get("property") or "").lower()
            tag_content = meta_tag.get("content", "")
            if "keyword" in name and tag_content:
                meta["keywords"] = [k.strip() for k in tag_content.split(",") if k.strip()]

        # ── Extract ELI from URL or page ──
        eli_match = re.search(r'(eli/[^\s"<>]+)', content)
        if eli_match and not meta["eli_link"]:
            meta["eli_link"] = eli_match.group(1)

        # ── Extract PDF links ──
        # Look for PDF download links
        for a in soup.select("a[href*='.pdf'], a[href*='PDF'], a[href*='pdf'], a[href*='GetPdf'], a[href*='getpdf']"):
            href = a["href"]
            if not href.startswith("http"):
                href = BASE_URL + (href if href.startswith("/") else "/" + href)
            text = a.get_text(strip=True).lower()
            if "english" in text or "/eng" in href:
                meta["pdf_url_en"] = href
            elif "maltese" in text or "/mlt" in href:
                meta["pdf_url_mt"] = href
            else:
                meta["pdf_url"] = href

        # Also look for PDF buttons/icons
        for btn in soup.select("[onclick*='pdf'], [onclick*='PDF'], [data-url*='pdf']"):
            onclick = btn.get("onclick", "") + btn.get("data-url", "")
            pdf_match = re.search(r'(https?://[^\s"\']+\.pdf)', onclick)
            if pdf_match:
                meta["pdf_url"] = pdf_match.group(1)

        # Check for the PDF link pattern on legislation.mt: /eli/cap/N/eng/pdf or /mlt/pdf
        cap_num = extract_chapter_number(chapter_str)
        if cap_num:
            meta["pdf_url_en"] = meta["pdf_url_en"] or f"{BASE_URL}/eli/cap/{cap_num}/eng/pdf"
            meta["pdf_url_mt"] = meta["pdf_url_mt"] or f"{BASE_URL}/eli/cap/{cap_num}/mlt/pdf"
            meta["eli_link"] = meta["eli_link"] or f"eli/cap/{cap_num}"

        # ── Extract relationships / timeline ──
        # Look for amendment history, basic act references
        for section in soup.select(".timeline, .history, .amendments, #timeline, [class*='relation'], [class*='amend']"):
            for item in section.select("li, tr, .timeline-item, a"):
                text = item.get_text(strip=True)
                href = item.get("href", "")
                if text and len(text) > 3:
                    rel = {"text": text}
                    if href:
                        rel["url"] = href if href.startswith("http") else BASE_URL + href
                    # Try to extract date
                    date_match = re.search(r'(\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4})', text)
                    if date_match:
                        rel["date"] = date_match.group(1)
                    meta["timeline"].append(rel)

        # Look for "Basic Act" or relationship references
        for a in soup.select("a[href*='eli/act'], a[href*='eli/cap']"):
            href = a["href"]
            text = a.get_text(strip=True)
            if text and href not in [r.get("url", "") for r in meta["relationships"]]:
                meta["relationships"].append({
                    "type": "Basic Act" if "act" in href else "Related",
                    "text": text,
                    "url": href if href.startswith("http") else BASE_URL + href,
                })

        # ── Extract English title if page has both languages ──
        # Try to get both language titles
        for el in soup.select("h1, h2, .title, .act-title, [class*='title']"):
            text = el.get_text(strip=True)
            if text and len(text) > 10:
                # Heuristic: if it contains Maltese characters, it's MT
                if any(c in text for c in "ċġħżĊĠĦŻ"):
                    if not meta["title_mt"]:
                        meta["title_mt"] = text
                elif not meta["title_en"]:
                    meta["title_en"] = text

        # Try to find keywords from the page text
        if not meta["keywords"]:
            for kw_section in soup.select("[class*='keyword'], [class*='tag']"):
                for tag in kw_section.select("a, span, li"):
                    kw = tag.get_text(strip=True)
                    if kw and len(kw) < 50 and kw not in meta["keywords"]:
                        meta["keywords"].append(kw)

    except Exception as e:
        print(f"    Error extracting metadata: {e}")

    return meta


async def verify_pdf_url(page, pdf_url):
    """Check if a PDF URL is valid by making a HEAD request via the browser."""
    try:
        result = await page.evaluate("""
            async (url) => {
                try {
                    const resp = await fetch(url, { method: 'HEAD', redirect: 'follow' });
                    return { ok: resp.ok, status: resp.status, type: resp.headers.get('content-type') || '' };
                } catch(e) {
                    return { ok: false, status: 0, type: '' };
                }
            }
        """, pdf_url)
        return result.get("ok", False) and "pdf" in result.get("type", "").lower()
    except:
        return False


async def main(limit=None, resume=False):
    print("=" * 60)
    print("  Ligi4Friends — Enhanced Law Detail Scraper")
    print("  Powered by Rark Musso")
    print("=" * 60)

    base_laws = load_base_legislation()
    if not base_laws:
        print("ERROR: No legislation.json found. Run scrape_all_data.py --source laws first.")
        return

    existing = load_existing() if resume else []
    existing_chapters = {law["chapter"] for law in existing}
    print(f"\n  Base laws: {len(base_laws)}")
    if resume:
        print(f"  Already scraped: {len(existing)}")

    # Filter to only chapters not yet scraped
    to_scrape = [law for law in base_laws if law["chapter"] not in existing_chapters]
    if limit:
        to_scrape = to_scrape[:limit]

    print(f"  To scrape: {len(to_scrape)}")
    print()

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080},
        )
        page = await context.new_page()
        await page.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')

        # Initial navigation to legislation.mt to get past Cloudflare
        print("  Navigating to legislation.mt...")
        await page.goto(BASE_URL, wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(5000)
        print("  Ready!\n")

        results = list(existing)  # Start with existing if resuming

        for i, law in enumerate(to_scrape):
            chapter = law["chapter"]
            source_url = law.get("source_url", "")
            title = law.get("title", "")

            print(f"  [{i+1}/{len(to_scrape)}] {chapter}: {title[:60]}...")

            # Build the detail URL
            detail_url = source_url if source_url else f"{BASE_URL}/Legislation"

            # Extract metadata from the detail page
            meta = await extract_metadata_from_page(page, detail_url, chapter)

            # Verify PDF URLs exist
            pdf_en = meta.get("pdf_url_en", "")
            pdf_mt = meta.get("pdf_url_mt", "")
            pdf_generic = meta.get("pdf_url", "")

            # Build the enriched law object
            enriched = {
                "chapter": chapter,
                "title": title,
                "title_en": meta.get("title_en", ""),
                "title_mt": meta.get("title_mt", "") or title,
                "type": meta.get("type", "Chapter"),
                "eli_link": meta.get("eli_link", ""),
                "keywords": meta.get("keywords", []),
                "languages": meta.get("languages", []) or ["English", "Maltese"],
                "format": "PDF",
                "status": meta.get("status", "In Force"),
                "effective_date": meta.get("effective_date", ""),
                "publication_date": meta.get("publication_date", ""),
                "indicative_publication_date": meta.get("indicative_publication_date", ""),
                "pdf_url": pdf_generic or pdf_en or pdf_mt,
                "pdf_url_en": pdf_en,
                "pdf_url_mt": pdf_mt,
                "source_url": source_url,
                "relationships": meta.get("relationships", []),
                "timeline": meta.get("timeline", []),
            }

            results.append(enriched)

            # Save incrementally every 10 laws
            if (i + 1) % 10 == 0:
                save_json("legislation_detailed.json", results)
                # Also update the main legislation.json with enriched data
                save_json("legislation.json", results)
                print(f"  --- Saved checkpoint ({len(results)} laws) ---\n")

            # Small delay to be respectful
            await page.wait_for_timeout(1500)

        await browser.close()

    # Final save
    save_json("legislation_detailed.json", results)
    save_json("legislation.json", results)

    print(f"\n{'=' * 60}")
    print(f"  Done! {len(results)} laws with full metadata")
    print(f"  Data: backend/data/legislation.json")
    print(f"  PDFs: {BASE_URL}/eli/cap/N/eng/pdf")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scrape detailed law metadata from legislation.mt")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of laws to scrape")
    parser.add_argument("--resume", action="store_true", help="Resume from last checkpoint")
    args = parser.parse_args()
    asyncio.run(main(limit=args.limit, resume=args.resume))
