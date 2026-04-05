"""
Comprehensive scraper for EVERY lawyer in Malta.

Uses the /en/Home/Get JSON API of lawyersregister.gov.mt via Playwright
(Cloudflare blocks direct curl but not a real browser session).

Usage:
    python scripts/scrape_all_malta_lawyers.py
"""
import asyncio
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
FRONTEND_DATA = os.path.join(ROOT, "..", "frontend", "public", "data")

from playwright.async_api import async_playwright

import functools
print = functools.partial(print, flush=True)


async def fetch_register(page):
    """Fetch the register JSON via a browser-context fetch."""
    print("\n=== Fetching lawyersregister.gov.mt /en/Home/Get ===")

    # Load main page first to establish CF cookies
    await page.goto("https://lawyersregister.gov.mt", wait_until="domcontentloaded", timeout=30000)
    await page.wait_for_timeout(5000)
    print(f"  Loaded main page. Title: {await page.title()}")

    # Wait for DataTables to populate (it hits /en/Home/Get on load)
    try:
        await page.wait_for_selector("#warrants-data-table tbody tr", timeout=15000)
    except:
        pass
    await page.wait_for_timeout(3000)

    # Fetch the JSON API in the browser context
    data = await page.evaluate("""
        async () => {
            const r = await fetch('/en/Home/Get', {
                headers: {'Accept': 'application/json, text/javascript, */*'}
            });
            const text = await r.text();
            try {
                return JSON.parse(text);
            } catch {
                return {error: 'parse', text: text.substring(0, 500)};
            }
        }
    """)

    if isinstance(data, dict) and data.get('error'):
        print(f"  API parse error: {data.get('text')}")
        return []

    # DataTables responses are usually {data: [...]} or just [...]
    records = data if isinstance(data, list) else data.get('data', [])
    print(f"  Got {len(records)} records from API")
    if records:
        print(f"  Sample record: {records[0]}")
    return records


async def scrape_register_table(page):
    """Fallback: scrape the rendered DataTables rows if API fails."""
    print("\n=== Scraping rendered table ===")
    lawyers = []

    # Set page length to max
    try:
        await page.select_option('select[name="warrants-data-table_length"]', value="100")
        await page.wait_for_timeout(2000)
    except:
        pass

    page_num = 1
    while True:
        await page.wait_for_timeout(1500)
        rows = await page.evaluate("""
            () => {
                return Array.from(document.querySelectorAll('#warrants-data-table tbody tr')).map(r => {
                    const cells = Array.from(r.querySelectorAll('td')).map(c => c.textContent.trim());
                    return cells;
                });
            }
        """)
        for cells in rows:
            if len(cells) < 3:
                continue
            profession = cells[0]
            name = cells[1]
            surname = cells[2] if len(cells) > 2 else ""
            warrant_date = cells[3] if len(cells) > 3 else ""
            full_name = f"{name} {surname}".strip()
            if len(full_name) < 3:
                continue
            lawyers.append({
                "full_name": full_name,
                "profession": profession or "Advocate",
                "warrant_date": warrant_date,
            })

        # Next page
        next_btn = page.locator("#warrants-data-table_paginate .paginate_button.next:not(.disabled)").first
        if await next_btn.count() == 0:
            break
        cls = await next_btn.get_attribute("class") or ""
        if "disabled" in cls:
            break
        await next_btn.click()
        await page.wait_for_timeout(1500)
        page_num += 1
        if page_num > 500:
            break
        if page_num % 10 == 0:
            print(f"    Page {page_num}: {len(lawyers)} collected")

    print(f"  Table: {len(lawyers)} lawyers")
    return lawyers


async def main():
    print("=" * 60)
    print("  Tizzju — Scrape EVERY Lawyer in Malta")
    print("=" * 60)

    # Load existing
    existing_file = os.path.join(DATA_DIR, "lawyers.json")
    existing = []
    if os.path.exists(existing_file):
        with open(existing_file) as f:
            existing = json.load(f)
    existing_names = {l["full_name"].upper().strip() for l in existing}
    print(f"  Existing: {len(existing)}")

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

        # Try API first
        records = await fetch_register(page)

        # If API didn't work, fall back to scraping the rendered table
        if not records:
            table_rows = await scrape_register_table(page)
            records = [{"Name": r["full_name"].split()[0] if r["full_name"] else "",
                        "Surname": " ".join(r["full_name"].split()[1:]) if r["full_name"] else "",
                        "Profession": 0 if r.get("profession") == "Advocate" else 1,
                        "Warrant_Date": r.get("warrant_date", ""),
                        "Id": None} for r in table_rows]

        await browser.close()

    # Merge
    added = 0
    for rec in records:
        name = rec.get("Name", "").strip()
        surname = rec.get("Surname", "").strip()
        full_name = f"{name} {surname}".strip()
        if not full_name or len(full_name) < 3:
            continue
        key = full_name.upper()
        if key in existing_names:
            continue
        existing_names.add(key)

        prof_val = rec.get("Profession", 0)
        profession = "Advocate" if prof_val == 0 else "Legal Procurator"

        warrant_date = rec.get("Warrant_Date", "") or ""

        existing.append({
            "warrant_number": str(rec.get("Id", "")) if rec.get("Id") else "",
            "full_name": full_name,
            "profession": profession,
            "firm": "",
            "email": "",
            "phone": "",
            "practice_areas": [],
            "case_count": 0,
            "courts_active_in": [],
            "first_case_date": None,
            "last_case_date": None,
            "warrant_date": warrant_date,
            "source_url": "https://lawyersregister.gov.mt",
        })
        added += 1

    # Save
    for path in [os.path.join(DATA_DIR, "lawyers.json"), os.path.join(FRONTEND_DATA, "lawyers.json")]:
        with open(path, "w") as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)

    print(f"\n{'=' * 60}")
    print(f"  Added: {added} new lawyers")
    print(f"  Total: {len(existing)}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    asyncio.run(main())
