"""
eCourts judgment scraper — Playwright (non-headless) to bypass Cloudflare.
Searches month-by-month, paginates all results, saves to JSON.

Usage:
    python scripts/scrape_ecourts_browser.py                         # recent 3 years
    python scripts/scrape_ecourts_browser.py --from 2000 --to 2026   # 26 years
    python scripts/scrape_ecourts_browser.py --from 1944 --to 2000   # historical
"""
import asyncio
import argparse
import json
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
os.makedirs(DATA_DIR, exist_ok=True)
OUTFILE = os.path.join(DATA_DIR, "ecourts_judgments.json")


async def scrape_ecourts(year_from: int, year_to: int):
    # Load existing data if any
    existing = []
    if os.path.exists(OUTFILE):
        with open(OUTFILE) as f:
            existing = json.load(f)
        print(f"Loaded {len(existing)} existing judgments")

    existing_refs = {j.get("reference", "") for j in existing}
    new_judgments = []

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

        print("Loading eCourts...")
        await page.goto("https://ecourts.gov.mt/onlineservices", wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(5000)
        await page.goto("https://ecourts.gov.mt/onlineservices/Judgements", wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(5000)

        for year in range(year_to, year_from - 1, -1):
            # Search by 6-month chunks to stay under result caps
            for half in [(1, 6), (7, 12)]:
                month_from, month_to = half
                date_from_str = f"01/{month_from:02d}/{year}"
                date_to_str = f"{'30' if month_to in (6,9,11) else '31' if month_to in (1,3,5,7,8,10,12) else '28'}/{month_to:02d}/{year}"

                try:
                    # Select date range radio
                    await page.locator('input[value="dateOptionAll"]').check()
                    await page.wait_for_timeout(500)

                    # Fill dates
                    df = page.locator('input[name="judgementDateFrom"]')
                    dt = page.locator('input[name="judgementDateTo"]')
                    await df.click()
                    await df.fill(date_from_str)
                    await dt.click()
                    await dt.fill(date_to_str)

                    # Search
                    submit = page.locator('button:has-text("Search"), button:has-text("Fittex")').first
                    await submit.click()
                    await page.wait_for_timeout(6000)

                    # Get total count
                    content = await page.content()
                    soup = BeautifulSoup(content, "lxml")
                    info_texts = [i.get_text(strip=True) for i in soup.select(".dataTables_info")]
                    total = 0
                    for txt in info_texts:
                        if "of" in txt:
                            import re
                            m = re.search(r"of\s+([\d,]+)\s+entr", txt)
                            if m:
                                total = int(m.group(1).replace(",", ""))

                    chunk_judgments = []
                    page_num = 0

                    while True:
                        page_num += 1
                        content = await page.content()
                        soup = BeautifulSoup(content, "lxml")

                        for row in soup.select("table tbody tr"):
                            cells = [c.get_text(strip=True) for c in row.select("td")]
                            if len(cells) < 5 or "no results" in " ".join(cells).lower():
                                continue

                            ref = cells[1] if len(cells) > 1 else ""
                            if ref in existing_refs or ref in {j["reference"] for j in chunk_judgments}:
                                continue  # skip duplicates

                            chunk_judgments.append({
                                "date": cells[0],
                                "reference": ref,
                                "court": cells[2] if len(cells) > 2 else "",
                                "parties": cells[3] if len(cells) > 3 else "",
                                "judge": cells[4] if len(cells) > 4 else "",
                                "source_url": "https://ecourts.gov.mt/onlineservices/Judgements",
                                "year": year,
                            })

                        # Next page
                        next_btn = page.locator(".paginate_button.next:not(.disabled)").first
                        if await next_btn.count() > 0:
                            cls = await next_btn.get_attribute("class") or ""
                            if "disabled" in cls:
                                break
                            try:
                                await next_btn.click()
                                await page.wait_for_timeout(3000)
                            except:
                                break
                        else:
                            break

                    if chunk_judgments:
                        new_judgments.extend(chunk_judgments)
                        print(f"  {year} H{1 if month_from == 1 else 2}: {len(chunk_judgments)} judgments (total so far: {len(existing) + len(new_judgments)})")

                        # Save incrementally
                        all_data = existing + new_judgments
                        with open(OUTFILE, "w") as f:
                            json.dump(all_data, f, ensure_ascii=False)
                    else:
                        if total == 0:
                            pass  # normal for some periods
                        else:
                            print(f"  {year} H{1 if month_from == 1 else 2}: expected {total} but got 0")

                    # Navigate back for next search
                    await page.goto("https://ecourts.gov.mt/onlineservices/Judgements",
                                  wait_until="networkidle", timeout=30000)
                    await page.wait_for_timeout(2000)

                except Exception as e:
                    print(f"  {year} H{1 if month_from == 1 else 2} error: {e}")
                    try:
                        await page.goto("https://ecourts.gov.mt/onlineservices/Judgements",
                                      wait_until="networkidle", timeout=30000)
                        await page.wait_for_timeout(3000)
                    except:
                        pass

            # Print year summary
            year_count = sum(1 for j in new_judgments if j.get("year") == year)
            if year_count > 0:
                print(f"  === Year {year}: {year_count} new judgments ===")

        await browser.close()

    # Final save
    all_data = existing + new_judgments
    with open(OUTFILE, "w") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*50}")
    print(f"NEW judgments scraped: {len(new_judgments)}")
    print(f"TOTAL judgments in file: {len(all_data)}")
    print(f"Saved to: {OUTFILE}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--from", dest="year_from", type=int, default=2023)
    parser.add_argument("--to", dest="year_to", type=int, default=2026)
    args = parser.parse_args()
    asyncio.run(scrape_ecourts(args.year_from, args.year_to))
