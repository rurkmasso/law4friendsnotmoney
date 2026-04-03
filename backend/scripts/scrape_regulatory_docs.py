"""
Scrape regulatory documents from FIAU, MFSA, MGA, and other Maltese regulatory bodies.
Saves to backend/data/regulatory_docs.json and frontend/public/data/regulatory_docs.json.

Usage:
    python scripts/scrape_regulatory_docs.py              # scrape all sources
    python scripts/scrape_regulatory_docs.py --source fiau  # just FIAU
"""
import asyncio
import argparse
import json
import os
import sys
import re
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
FRONTEND_DATA = os.path.join(ROOT, "..", "frontend", "public", "data")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(FRONTEND_DATA, exist_ok=True)


def save_json(filename, data):
    for path in [os.path.join(DATA_DIR, filename), os.path.join(FRONTEND_DATA, filename)]:
        with open(path, "w") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  Saved {len(data)} items to {filename}")


def load_existing():
    path = os.path.join(DATA_DIR, "regulatory_docs.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return []


async def scrape_fiau(page):
    """Scrape FIAU publications and guidance."""
    print("\n=== Scraping FIAU ===")
    docs = []

    urls = [
        ("https://fiaumalta.org/legislation/", "legislation"),
        ("https://fiaumalta.org/guidance/", "guidance"),
        ("https://fiaumalta.org/publications/", "publication"),
    ]

    for url, doc_type in urls:
        try:
            await page.goto(url, wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(3000)
            content = await page.content()
            soup = BeautifulSoup(content, "lxml")

            for a in soup.select("a[href]"):
                href = a.get("href", "")
                text = a.get_text(strip=True)
                if not text or len(text) < 10:
                    continue
                if any(ext in href.lower() for ext in [".pdf", "/document", "/publication", "/guidance"]):
                    if not href.startswith("http"):
                        href = "https://fiaumalta.org" + href
                    docs.append({
                        "title": text[:300],
                        "source": "FIAU",
                        "doc_type": doc_type,
                        "url": href,
                        "pdf_url": href if href.lower().endswith(".pdf") else "",
                        "date": "",
                        "description": f"FIAU {doc_type}: {text[:200]}",
                    })

            print(f"  FIAU {doc_type}: {len([d for d in docs if d['doc_type'] == doc_type])} docs")
        except Exception as e:
            print(f"  FIAU {url}: {str(e)[:60]}")

    return docs


async def scrape_mfsa(page):
    """Scrape MFSA circulars and regulatory documents."""
    print("\n=== Scraping MFSA ===")
    docs = []

    urls = [
        ("https://www.mfsa.mt/publications/circulars/", "circular"),
        ("https://www.mfsa.mt/publications/policy-and-guidance/", "guidance"),
        ("https://www.mfsa.mt/publications/consultation-documents/", "consultation"),
    ]

    for url, doc_type in urls:
        try:
            await page.goto(url, wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(3000)
            content = await page.content()
            soup = BeautifulSoup(content, "lxml")

            for item in soup.select("article, .post, .publication-item, .list-item, tr, li"):
                title_el = item.select_one("h2, h3, h4, a, .title, td:first-child")
                if not title_el:
                    continue
                text = title_el.get_text(strip=True)
                if len(text) < 10:
                    continue
                link_el = item.select_one("a[href]")
                href = link_el["href"] if link_el else url
                if not href.startswith("http"):
                    href = "https://www.mfsa.mt" + href

                # Try to extract date
                date_text = ""
                date_el = item.select_one("time, .date, .meta-date, td:last-child")
                if date_el:
                    date_text = date_el.get_text(strip=True)

                docs.append({
                    "title": text[:300],
                    "source": "MFSA",
                    "doc_type": doc_type,
                    "url": href,
                    "pdf_url": href if href.lower().endswith(".pdf") else "",
                    "date": date_text,
                    "description": f"MFSA {doc_type}: {text[:200]}",
                })

            print(f"  MFSA {doc_type}: {len([d for d in docs if d['doc_type'] == doc_type])} docs")
        except Exception as e:
            print(f"  MFSA {url}: {str(e)[:60]}")

    return docs


async def scrape_mga(page):
    """Scrape MGA gaming authority documents."""
    print("\n=== Scraping MGA ===")
    docs = []

    urls = [
        ("https://www.mga.org.mt/legislation-regulation/", "legislation"),
        ("https://www.mga.org.mt/publications/", "publication"),
        ("https://www.mga.org.mt/mga-directives/", "directive"),
    ]

    for url, doc_type in urls:
        try:
            await page.goto(url, wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(3000)
            content = await page.content()
            soup = BeautifulSoup(content, "lxml")

            for a in soup.select("a[href]"):
                href = a.get("href", "")
                text = a.get_text(strip=True)
                if not text or len(text) < 10:
                    continue
                if any(kw in text.lower() for kw in ["act", "regulation", "directive", "guidance", "notice", "rule", "framework"]) or href.lower().endswith(".pdf"):
                    if not href.startswith("http"):
                        href = "https://www.mga.org.mt" + href
                    if href not in [d["url"] for d in docs]:
                        docs.append({
                            "title": text[:300],
                            "source": "MGA",
                            "doc_type": doc_type,
                            "url": href,
                            "pdf_url": href if href.lower().endswith(".pdf") else "",
                            "date": "",
                            "description": f"MGA {doc_type}: {text[:200]}",
                        })

            print(f"  MGA {doc_type}: {len([d for d in docs if d['doc_type'] == doc_type])} docs")
        except Exception as e:
            print(f"  MGA {url}: {str(e)[:60]}")

    return docs


async def scrape_idpc(page):
    """Scrape IDPC data protection guidance."""
    print("\n=== Scraping IDPC ===")
    docs = []

    try:
        await page.goto("https://idpc.org.mt/guidance/", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        soup = BeautifulSoup(content, "lxml")

        for a in soup.select("a[href]"):
            href = a.get("href", "")
            text = a.get_text(strip=True)
            if not text or len(text) < 10:
                continue
            if href.lower().endswith(".pdf") or "guidance" in href.lower():
                if not href.startswith("http"):
                    href = "https://idpc.org.mt" + href
                docs.append({
                    "title": text[:300],
                    "source": "IDPC",
                    "doc_type": "guidance",
                    "url": href,
                    "pdf_url": href if href.lower().endswith(".pdf") else "",
                    "date": "",
                    "description": f"IDPC guidance: {text[:200]}",
                })

        print(f"  IDPC: {len(docs)} docs")
    except Exception as e:
        print(f"  IDPC: {str(e)[:60]}")

    return docs


async def scrape_cfr(page):
    """Scrape Commissioner for Revenue guidance."""
    print("\n=== Scraping CFR ===")
    docs = []

    try:
        await page.goto("https://cfr.gov.mt/en/Pages/Legislation-and-Guidelines.aspx", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        soup = BeautifulSoup(content, "lxml")

        for a in soup.select("a[href]"):
            href = a.get("href", "")
            text = a.get_text(strip=True)
            if not text or len(text) < 10:
                continue
            if href.lower().endswith(".pdf") or any(kw in text.lower() for kw in ["guideline", "ruling", "notice", "circular"]):
                if not href.startswith("http"):
                    href = "https://cfr.gov.mt" + href
                docs.append({
                    "title": text[:300],
                    "source": "CFR",
                    "doc_type": "guidance",
                    "url": href,
                    "pdf_url": href if href.lower().endswith(".pdf") else "",
                    "date": "",
                    "description": f"CFR: {text[:200]}",
                })

        print(f"  CFR: {len(docs)} docs")
    except Exception as e:
        print(f"  CFR: {str(e)[:60]}")

    return docs


async def main(source="all"):
    print("=" * 60)
    print("  Ligi4Friends — Regulatory Document Scraper")
    print("  Powered by Rark Musso")
    print("=" * 60)

    existing = load_existing()
    existing_urls = {d["url"] for d in existing}
    print(f"  Existing docs: {len(existing)}")

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

        all_docs = list(existing)

        scrapers = {
            "fiau": scrape_fiau,
            "mfsa": scrape_mfsa,
            "mga": scrape_mga,
            "idpc": scrape_idpc,
            "cfr": scrape_cfr,
        }

        for name, scraper in scrapers.items():
            if source != "all" and source != name:
                continue
            try:
                new_docs = await scraper(page)
                # Deduplicate
                for doc in new_docs:
                    if doc["url"] not in existing_urls:
                        all_docs.append(doc)
                        existing_urls.add(doc["url"])
            except Exception as e:
                print(f"  ERROR {name}: {e}")

        await browser.close()

    save_json("regulatory_docs.json", all_docs)
    print(f"\n{'=' * 60}")
    print(f"  Done! {len(all_docs)} total regulatory documents")
    print(f"  Sources: {', '.join(set(d['source'] for d in all_docs))}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default="all", choices=["all", "fiau", "mfsa", "mga", "idpc", "cfr"])
    args = parser.parse_args()
    asyncio.run(main(args.source))
