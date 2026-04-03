"""
Enhanced lawyers scraper — extracts lawyers from multiple sources:
1. eCourts judgment data (lawyers appearing in cases)
2. Chamber of Advocates Malta website
3. Malta Law Society
4. Known law firm websites

Also keeps the existing judges data.

Usage:
    python scripts/scrape_lawyers_enhanced.py
"""
import asyncio
import json
import os
import sys
import re
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
FRONTEND_DATA = os.path.join(ROOT, "..", "frontend", "public", "data")

from playwright.async_api import async_playwright
from bs4 import BeautifulSoup


def save_json(filename, data):
    for path in [os.path.join(DATA_DIR, filename), os.path.join(FRONTEND_DATA, filename)]:
        with open(path, "w") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  Saved {len(data)} items to {filename}")


def extract_lawyers_from_judgments():
    """Extract unique lawyer names from eCourts judgment data."""
    print("\n=== Extracting lawyers from judgments ===")
    jfile = os.path.join(DATA_DIR, "ecourts_judgments.json")
    if not os.path.exists(jfile):
        print("  No judgments data found")
        return []

    with open(jfile) as f:
        judgments = json.load(f)

    # Track lawyer appearances
    lawyer_stats = defaultdict(lambda: {
        "case_count": 0,
        "courts": set(),
        "first_date": None,
        "last_date": None,
        "cases": [],
    })

    # Extract from parties field — lawyers often mentioned
    # Also look at the judge field to not count judges as lawyers
    judges = set()
    for j in judgments:
        judge = (j.get("judge") or "").strip()
        if judge:
            judges.add(judge.upper())

    print(f"  Processing {len(judgments)} judgments...")

    for j in judgments:
        # The parties field sometimes contains lawyer names in format:
        # "Plaintiff vs Defendant" or includes "Avv." prefix
        parties = j.get("parties", "")
        court = j.get("court", "")
        date = j.get("date", "")
        ref = j.get("reference", "")

        # Look for "Avv." or "Dr." prefixed names in the parties text
        # Common Malta patterns: "Avv. John Smith" "Dr. Jane Doe"
        avv_pattern = re.findall(r'(?:Avv\.|Avukat|Dr\.|Dott\.)\s+([A-Z][a-zA-ZàèìòùÀÈÌÒÙċĊġĠħĦżŻ\s\-\.]+?)(?:\s*[,;)\]]|$)', parties, re.IGNORECASE)
        for name in avv_pattern:
            name = name.strip().rstrip(".")
            if len(name) > 4 and name.upper() not in judges:
                stats = lawyer_stats[name.upper()]
                stats["case_count"] += 1
                stats["courts"].add(court)
                if not stats["first_date"] or date < stats["first_date"]:
                    stats["first_date"] = date
                if not stats["last_date"] or date > stats["last_date"]:
                    stats["last_date"] = date

    print(f"  Found {len(lawyer_stats)} unique lawyers from judgment text")
    return lawyer_stats


async def scrape_chamber_of_advocates(page):
    """Try to scrape from Chamber of Advocates Malta."""
    print("\n=== Scraping Chamber of Advocates ===")
    lawyers = []

    try:
        await page.goto("https://www.avukati.org", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(5000)

        content = await page.content()
        soup = BeautifulSoup(content, "lxml")

        # Look for lawyer directory/listing
        for a in soup.select("a[href]"):
            text = a.get_text(strip=True)
            href = a.get("href", "")
            if "member" in href.lower() or "directory" in href.lower() or "register" in href.lower():
                print(f"  Found directory link: {text} -> {href}")
                if not href.startswith("http"):
                    href = "https://www.avukati.org" + href
                try:
                    await page.goto(href, wait_until="networkidle", timeout=30000)
                    await page.wait_for_timeout(3000)
                    dir_content = await page.content()
                    dir_soup = BeautifulSoup(dir_content, "lxml")

                    for item in dir_soup.select("tr, li, .member, .lawyer, .advocate"):
                        name_el = item.select_one("td, a, .name, h3, h4")
                        if name_el:
                            name = name_el.get_text(strip=True)
                            if len(name) > 4 and not any(skip in name.lower() for skip in ["search", "home", "about", "contact"]):
                                lawyers.append({
                                    "full_name": name,
                                    "source_url": href,
                                })
                except Exception as e:
                    print(f"    Error: {str(e)[:60]}")

        print(f"  Chamber: {len(lawyers)} lawyers found")
    except Exception as e:
        print(f"  Chamber of Advocates: {str(e)[:60]}")

    return lawyers


async def scrape_lawyers_register(page):
    """Scrape from the official lawyers register."""
    print("\n=== Scraping Lawyers Register ===")
    lawyers = []

    try:
        # Try different URL variations
        urls = [
            "https://lawyersregister.gov.mt",
            "https://lawyersregister.gov.mt/register",
            "https://lawyersregister.gov.mt/search",
        ]

        for url in urls:
            try:
                await page.goto(url, wait_until="networkidle", timeout=30000)
                await page.wait_for_timeout(5000)

                # Try to search A-Z
                for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
                    try:
                        # Look for search functionality
                        search_inputs = await page.locator("input[type='text'], input[name*='search'], input[placeholder*='Search'], input[name*='name']").all()
                        if search_inputs:
                            await search_inputs[0].fill(letter)
                            submit_btns = await page.locator("button[type='submit'], input[type='submit'], button:has-text('Search'), button:has-text('Fittex')").all()
                            if submit_btns:
                                await submit_btns[0].click()
                                await page.wait_for_timeout(3000)

                                content = await page.content()
                                soup = BeautifulSoup(content, "lxml")

                                for row in soup.select("table tbody tr, .result-row, .list-group-item"):
                                    cells = row.select("td")
                                    if len(cells) >= 2:
                                        texts = [c.get_text(strip=True) for c in cells]
                                        name = texts[1] if len(texts) > 1 else texts[0]
                                        wn = texts[0] if texts[0] and len(texts[0]) < 20 else ""
                                        if name and len(name) > 3:
                                            lawyers.append({
                                                "warrant_number": wn,
                                                "full_name": name,
                                                "profession": texts[2] if len(texts) > 2 else "Advocate",
                                                "source_url": url,
                                            })

                                if lawyers and len(lawyers) % 100 == 0:
                                    print(f"    {letter}: {len(lawyers)} lawyers so far")

                    except Exception:
                        continue

                if lawyers:
                    break
            except Exception:
                continue

        print(f"  Register: {len(lawyers)} lawyers")
    except Exception as e:
        print(f"  Register error: {str(e)[:60]}")

    return lawyers


async def main():
    print("=" * 60)
    print("  Ligi4Friends — Enhanced Lawyer Scraper")
    print("  Powered by Rark Musso")
    print("=" * 60)

    # Load existing lawyers (judges)
    existing_file = os.path.join(DATA_DIR, "lawyers.json")
    existing = []
    if os.path.exists(existing_file):
        with open(existing_file) as f:
            existing = json.load(f)
    existing_names = {l["full_name"].upper() for l in existing}
    print(f"  Existing: {len(existing)} ({len([l for l in existing if l.get('profession') == 'Judge / Magistrate'])} judges)")

    # 1. Extract lawyers from judgment data
    judgment_lawyers = extract_lawyers_from_judgments()

    # 2. Try scraping online sources
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

        register_lawyers = await scrape_lawyers_register(page)
        chamber_lawyers = await scrape_chamber_of_advocates(page)

        await browser.close()

    # 3. Merge all sources
    all_lawyers = list(existing)  # Start with existing judges

    # Add lawyers from register
    for rl in register_lawyers:
        name = rl["full_name"].upper()
        if name not in existing_names:
            existing_names.add(name)
            all_lawyers.append({
                "warrant_number": rl.get("warrant_number", f"REG-{len(all_lawyers)}"),
                "full_name": rl["full_name"],
                "profession": rl.get("profession", "Advocate"),
                "firm": "",
                "email": "",
                "phone": "",
                "practice_areas": [],
                "case_count": 0,
                "courts_active_in": [],
                "first_case_date": None,
                "last_case_date": None,
                "source_url": rl.get("source_url", "https://lawyersregister.gov.mt"),
            })

    # Add lawyers from chamber
    for cl in chamber_lawyers:
        name = cl["full_name"].upper()
        if name not in existing_names:
            existing_names.add(name)
            all_lawyers.append({
                "warrant_number": f"COA-{len(all_lawyers)}",
                "full_name": cl["full_name"],
                "profession": "Advocate",
                "firm": "",
                "email": "",
                "phone": "",
                "practice_areas": [],
                "case_count": 0,
                "courts_active_in": [],
                "first_case_date": None,
                "last_case_date": None,
                "source_url": cl.get("source_url", "https://www.avukati.org"),
            })

    # Add lawyers from judgments (highest volume source)
    for name_upper, stats in judgment_lawyers.items():
        if name_upper not in existing_names:
            existing_names.add(name_upper)
            # Proper case the name
            name = name_upper.title()
            all_lawyers.append({
                "warrant_number": f"ECT-{len(all_lawyers)}",
                "full_name": name,
                "profession": "Advocate",
                "firm": "",
                "email": "",
                "phone": "",
                "practice_areas": [],
                "case_count": stats["case_count"],
                "courts_active_in": list(stats["courts"]),
                "first_case_date": stats["first_date"],
                "last_case_date": stats["last_date"],
                "source_url": "https://ecourts.gov.mt/onlineservices/Judgements",
            })
        else:
            # Update existing lawyer with case stats
            for lawyer in all_lawyers:
                if lawyer["full_name"].upper() == name_upper:
                    lawyer["case_count"] = max(lawyer.get("case_count", 0), stats["case_count"])
                    if stats["courts"]:
                        existing_courts = set(lawyer.get("courts_active_in") or [])
                        existing_courts.update(stats["courts"])
                        lawyer["courts_active_in"] = list(existing_courts)
                    if stats["first_date"]:
                        if not lawyer.get("first_case_date") or stats["first_date"] < lawyer["first_case_date"]:
                            lawyer["first_case_date"] = stats["first_date"]
                    if stats["last_date"]:
                        if not lawyer.get("last_case_date") or stats["last_date"] > lawyer["last_case_date"]:
                            lawyer["last_case_date"] = stats["last_date"]
                    break

    save_json("lawyers.json", all_lawyers)

    # Stats
    professions = defaultdict(int)
    for l in all_lawyers:
        professions[l.get("profession", "Unknown")] += 1

    print(f"\n{'=' * 60}")
    print(f"  Total: {len(all_lawyers)} legal professionals")
    for prof, count in sorted(professions.items(), key=lambda x: -x[1]):
        print(f"    {prof}: {count}")
    print(f"  With case data: {len([l for l in all_lawyers if l.get('case_count', 0) > 0])}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    asyncio.run(main())
