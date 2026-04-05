"""
Full eCourts judgment scraper — gets ALL ~77,500 judgments from ecourts.gov.mt.

Strategy:
  - Search by COURT (27 courts) — each court is a separate search
  - For large courts (>5000 results), break down by year
  - Paginate through ALL DataTables pages for each search
  - The form requires at least 1 criterion (court counts as one)
  - Saves progress to resume after interruption

The search form at /onlineservices/Judgements:
  - POST to /onlineservices/Judgements/Search
  - Requires at least 1 search criterion
  - CourtId dropdown counts as a criterion
  - Results rendered as DataTables with server-side(?) pagination

Usage:
    python scripts/scrape_ecourts_full.py                  # all courts
    python scripts/scrape_ecourts_full.py --resume         # continue where left off
    python scripts/scrape_ecourts_full.py --test           # test with 1 court only
"""
import asyncio
import argparse
import json
import os
import sys
import re
import time
import functools

# Unbuffered print
print = functools.partial(print, flush=True)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
FRONTEND_DATA = os.path.join(ROOT, "..", "frontend", "public", "data")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(FRONTEND_DATA, exist_ok=True)

OUTFILE = os.path.join(DATA_DIR, "ecourts_judgments.json")
PROGRESS_FILE = os.path.join(DATA_DIR, "ecourts_progress.json")


def load_existing():
    if os.path.exists(OUTFILE):
        with open(OUTFILE) as f:
            return json.load(f)
    return []


def save_judgments(data):
    for path in [OUTFILE, os.path.join(FRONTEND_DATA, "ecourts_judgments.json")]:
        with open(path, "w") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)


def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE) as f:
            return json.load(f)
    return {"completed_courts": [], "completed_court_years": []}


def save_progress(progress):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f, indent=2)


async def get_court_options(page):
    """Extract court IDs and names from the dropdown."""
    return await page.evaluate("""
        () => {
            const select = document.querySelector('#CourtId, select[name="CourtId"]');
            if (!select) return [];
            return Array.from(select.options)
                .filter(o => o.value && o.value !== '')
                .map(o => ({id: o.value, name: o.textContent.trim()}));
        }
    """)


async def navigate_to_search(page):
    """Navigate to the judgments search page."""
    await page.goto("https://ecourts.gov.mt/onlineservices/Judgements",
                    wait_until="domcontentloaded", timeout=60000)
    await page.wait_for_timeout(3000)


async def do_search_by_court(page, court_id, year=None, year_from=None, year_to=None):
    """Submit search filtered by court (and optionally year/range). Returns True if form submitted."""
    try:
        await navigate_to_search(page)

        # Select court
        await page.select_option('#CourtId, select[name="CourtId"]', value=str(court_id))
        await page.wait_for_timeout(500)

        if year:
            year_from = year
            year_to = year

        if year_from and year_to:
            # Select "between" radio to enable date inputs
            await page.locator('#judgementdateOption3').check()
            await page.wait_for_timeout(800)

            df = page.locator('#judgementDateFrom')
            dt = page.locator('#judgementDateTo')
            await df.click()
            await df.fill(f"01/01/{year_from}")
            await dt.click()
            await dt.fill(f"31/12/{year_to}")
            await page.wait_for_timeout(300)
        else:
            # "any day" — dateOptionAlways
            await page.locator('#judgementdateOption4').check()
            await page.wait_for_timeout(300)

        # Submit the form
        await page.locator('#searchJudgement').click()

        # Wait for results to load — watch for either DataTables or the URL to change
        try:
            await page.wait_for_url("**/Judgements/Search**", timeout=15000)
        except:
            # URL might not change if results load via AJAX
            pass

        await page.wait_for_timeout(2000)

        # Wait for DataTables to render
        try:
            await page.wait_for_selector(".dataTables_info, table tbody tr td", timeout=10000)
        except:
            pass

        await page.wait_for_timeout(1000)
        return True
    except Exception as e:
        print(f"    Search error: {e}")
        return False


async def get_total_from_page(page):
    """Get total result count from the page.

    Handles both English ("Showing 1 to 10 of 5,432 entries")
    and Maltese ("Jidhru 1 sa 10 minn 5,432 rekord") DataTables info text.
    """
    try:
        # Use JS to read the dataTables_info element directly
        total = await page.evaluate("""
            () => {
                const info = document.querySelector('.dataTables_info');
                if (!info) return 0;
                const text = info.textContent;
                // English: "Showing 1 to 10 of 5,432 entries"
                let m = text.match(/of\\s+([\\d,]+)\\s+entr/);
                if (m) return parseInt(m[1].replace(/,/g, ''));
                // Maltese: "Jidhru 1 sa 10 minn 5,432 rekord"
                m = text.match(/minn\\s+([\\d,]+)\\s+rekord/);
                if (m) return parseInt(m[1].replace(/,/g, ''));
                // Fallback: just find the last number in the text
                const nums = text.match(/[\\d,]+/g);
                if (nums && nums.length >= 3) return parseInt(nums[nums.length - 1].replace(/,/g, ''));
                return 0;
            }
        """)
        return total
    except:
        return 0


async def scrape_results_page(page):
    """Extract judgment rows from the current page.

    Table #JudgementTable has columns:
      0: Date, 1: Reference, 2: Court, 3: Parties, 4: Judiciary (judge),
      5: View Details, 6: (icon), 7: Appealed, 8: Appealed by Accused, 9: Appealed by AG
    """
    judgments = []

    try:
        content = await page.content()
        soup = BeautifulSoup(content, "lxml")

        table = soup.select_one("#JudgementTable")
        if not table:
            # Fallback: find any table with tbody rows (skip KeywordsGrid)
            for t in soup.select("table"):
                if t.get("id") == "KeywordsGrid":
                    continue
                if t.select("tbody tr"):
                    table = t
                    break

        if not table:
            return judgments

        rows = table.select("tbody tr")
        for row in rows:
            cells = row.select("td")
            if len(cells) < 4:
                continue

            cell_texts = [c.get_text(strip=True) for c in cells]
            full_text = " ".join(cell_texts).lower()

            if "no data" in full_text or "no results" in full_text or "l-ebda" in full_text:
                continue

            # Find detail/PDF link
            detail_url = ""
            for c in cells:
                for a in c.select("a[href]"):
                    href = a.get("href", "")
                    if href and ("Judgement" in href or "PrintPdf" in href):
                        detail_url = href if href.startswith("http") else f"https://ecourts.gov.mt{href}"
                        break
                if detail_url:
                    break

            # Columns: Date(0), Reference(1), Court(2), Parties(3), Judiciary(4), ...
            j = {
                "date": cell_texts[0],
                "reference": cell_texts[1],
                "court": cell_texts[2],
                "parties": cell_texts[3],
                "judge": cell_texts[4] if len(cell_texts) > 4 else "",
            }

            if not j["reference"]:
                continue

            # Clean up judge — skip non-judge values
            if j["judge"].lower() in ("details", "true", "false", ""):
                j["judge"] = ""

            if detail_url:
                j["detail_url"] = detail_url
            j["source_url"] = "https://ecourts.gov.mt/onlineservices/Judgements"

            # Extract year from date
            ym = re.search(r'(\d{4})', j["date"])
            if ym:
                j["year"] = int(ym.group(1))

            judgments.append(j)
    except Exception as e:
        print(f"    Parse error: {e}")

    return judgments


async def paginate_and_collect(page):
    """Paginate through all DataTables pages and collect all results."""
    all_judgments = []
    page_num = 1
    seen_refs = set()

    while True:
        batch = await scrape_results_page(page)

        # Dedupe within this pagination run
        new_in_batch = []
        for j in batch:
            ref = j.get("reference", "")
            if ref and ref not in seen_refs:
                seen_refs.add(ref)
                new_in_batch.append(j)

        if not new_in_batch and page_num > 1:
            break

        all_judgments.extend(new_in_batch)

        # Try next page
        try:
            next_btn = page.locator(".paginate_button.next:not(.disabled), .next:not(.disabled) a").first
            count = await next_btn.count()
            if count == 0:
                break

            # Check if next is disabled
            parent = page.locator(".paginate_button.next, li.next").first
            if await parent.count() > 0:
                cls = await parent.get_attribute("class") or ""
                if "disabled" in cls:
                    break

            await next_btn.click()
            await page.wait_for_timeout(2000)
            page_num += 1

            if page_num > 2000:
                print(f"    Safety limit at page {page_num}")
                break
        except:
            break

    return all_judgments


async def main(resume=False, test=False):
    print("=" * 60)
    print("  Tizzju — eCourts Full Scraper v2")
    print("  Target: ALL ~77,500 judgments")
    print("  Strategy: Search by court, paginate all results")
    print("  Powered by Rark Musso")
    print("=" * 60)

    existing = load_existing()
    existing_refs = {j.get("reference", "") for j in existing}
    progress = load_progress() if resume else {"completed_courts": [], "completed_court_years": []}

    print(f"\n  Existing judgments: {len(existing)}")
    if resume:
        print(f"  Courts already done: {len(progress['completed_courts'])}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080},
        )
        pg = await context.new_page()
        await pg.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')

        # Load eCourts
        print("\n  Loading ecourts.gov.mt...")
        await pg.goto("https://ecourts.gov.mt/onlineservices", wait_until="domcontentloaded", timeout=60000)
        await pg.wait_for_timeout(5000)

        await navigate_to_search(pg)

        # Get courts
        courts = await get_court_options(pg)
        print(f"  Courts: {len(courts)}")
        for c in courts:
            print(f"    {c['id']}: {c['name']}")

        if test:
            courts = courts[:1]
            print(f"\n  TEST MODE: only scraping 1 court\n")

        total_new = 0
        total_dupes = 0
        start_time = time.time()

        for ci, court in enumerate(courts):
            court_key = str(court["id"])

            if court_key in progress["completed_courts"]:
                print(f"\n  [{ci+1}/{len(courts)}] {court['name']}: already done (skipping)")
                continue

            print(f"\n  [{ci+1}/{len(courts)}] {court['name']}...")

            # Search by this court, all dates
            ok = await do_search_by_court(pg, court["id"])
            if not ok:
                print(f"    Failed to search, retrying...")
                await pg.wait_for_timeout(5000)
                ok = await do_search_by_court(pg, court["id"])
                if not ok:
                    print(f"    Skipping court")
                    continue

            # Check total
            total = await get_total_from_page(pg)
            print(f"    Total results: {total}")

            if total == 0:
                print(f"    No results, skipping court")
                progress["completed_courts"].append(court_key)
                save_progress(progress)
                continue

            if total > 0 and total < 500:
                # Small court — paginate directly (no year breakdown needed)
                print(f"    Small court — paginating directly...")
                judgments = await paginate_and_collect(pg)
                new_batch = [j for j in judgments if j.get("reference") and j["reference"] not in existing_refs]
                for j in new_batch:
                    existing_refs.add(j["reference"])
                dupes = len(judgments) - len(new_batch)
                if new_batch:
                    for j in new_batch:
                        if not j.get("court"):
                            j["court"] = court["name"]
                    existing.extend(new_batch)
                    total_new += len(new_batch)
                    total_dupes += dupes
                    print(f"    +{len(new_batch)} new judgments")
                    save_judgments(existing)
                else:
                    print(f"    {len(judgments)} found, all duplicates")
            else:
                # Large court (500+) — break into decades, then years if needed
                print(f"    Large court — breaking down by decade...")
                court_new = 0

                # Decades from 2020s back to 1940s
                decades = [(d, d + 9) for d in range(2020, 1939, -10)]
                # Plus current partial decade
                decades.insert(0, (2020, 2026))

                for decade_start, decade_end in decades:
                    decade_key = f"{court_key}_{decade_start}_{decade_end}"
                    if decade_key in progress.get("completed_court_years", []):
                        continue

                    ok = await do_search_by_court(pg, court["id"], year_from=decade_start, year_to=decade_end)
                    if not ok:
                        continue

                    dt = await get_total_from_page(pg)
                    if dt == 0:
                        progress.setdefault("completed_court_years", []).append(decade_key)
                        save_progress(progress)
                        continue

                    if dt < 500:
                        # Small decade — paginate directly
                        judgments = await paginate_and_collect(pg)
                        new_batch = [j for j in judgments if j.get("reference") and j["reference"] not in existing_refs]
                        for j in new_batch:
                            existing_refs.add(j["reference"])
                        if new_batch:
                            for j in new_batch:
                                if not j.get("court"):
                                    j["court"] = court["name"]
                            existing.extend(new_batch)
                            court_new += len(new_batch)
                            total_new += len(new_batch)
                            print(f"      {decade_start}-{decade_end}: +{len(new_batch)} new ({dt} total)")
                            save_judgments(existing)
                        progress.setdefault("completed_court_years", []).append(decade_key)
                        save_progress(progress)
                    else:
                        # Large decade — break into individual years
                        print(f"      {decade_start}-{decade_end}: {dt} results, breaking into years...")
                        for year in range(decade_end, decade_start - 1, -1):
                            cy_key = f"{court_key}_{year}"
                            if cy_key in progress.get("completed_court_years", []):
                                continue

                            ok = await do_search_by_court(pg, court["id"], year=year)
                            if not ok:
                                continue

                            yt = await get_total_from_page(pg)
                            if yt == 0:
                                progress.setdefault("completed_court_years", []).append(cy_key)
                                save_progress(progress)
                                continue

                            judgments = await paginate_and_collect(pg)
                            new_batch = [j for j in judgments if j.get("reference") and j["reference"] not in existing_refs]
                            for j in new_batch:
                                existing_refs.add(j["reference"])

                            if new_batch:
                                for j in new_batch:
                                    if not j.get("court"):
                                        j["court"] = court["name"]
                                existing.extend(new_batch)
                                court_new += len(new_batch)
                                total_new += len(new_batch)
                                print(f"        {year}: +{len(new_batch)} new ({yt} total)")
                                save_judgments(existing)

                            progress.setdefault("completed_court_years", []).append(cy_key)
                            save_progress(progress)

                        progress.setdefault("completed_court_years", []).append(decade_key)
                        save_progress(progress)

                print(f"    Court total: +{court_new} new")

            # Mark court as done
            progress["completed_courts"].append(court_key)
            save_progress(progress)
            save_judgments(existing)

            elapsed = time.time() - start_time
            rate = total_new / max(elapsed / 60, 0.1)
            print(f"    Running total: {len(existing)} judgments ({total_new} new, {rate:.0f}/min)")

            await pg.wait_for_timeout(1000)

        await browser.close()

    save_judgments(existing)
    save_progress(progress)

    elapsed = time.time() - start_time
    print(f"\n{'=' * 60}")
    print(f"  COMPLETE!")
    print(f"  New judgments: {total_new}")
    print(f"  Duplicates: {total_dupes}")
    print(f"  Total in dataset: {len(existing)}")
    print(f"  Time: {elapsed/60:.1f} minutes")
    print(f"  Saved to: {OUTFILE}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--test", action="store_true", help="Test with 1 court only")
    args = parser.parse_args()
    asyncio.run(main(resume=args.resume, test=args.test))
