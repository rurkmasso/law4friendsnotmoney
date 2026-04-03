"""
Master data scraper using Playwright (non-headless) to bypass Cloudflare.
Scrapes legislation, eCourts judgments, and lawyers.
Saves to both backend/data/ and frontend/public/data/ as static JSON.

Usage:
    python scripts/scrape_all_data.py                  # scrape everything
    python scripts/scrape_all_data.py --source laws    # just legislation
    python scripts/scrape_all_data.py --source ecourts # just judgments
    python scripts/scrape_all_data.py --source lawyers # just lawyers
    python scripts/scrape_all_data.py --source ecourts --from 1960 --to 2019  # historical
"""
import asyncio
import argparse
import json
import os
import sys
import urllib.parse
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
FRONTEND_DATA = os.path.join(ROOT, "..", "frontend", "public", "data")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(FRONTEND_DATA, exist_ok=True)


def save(filename, data):
    """Save JSON to both backend/data and frontend/public/data."""
    for path in [os.path.join(DATA_DIR, filename), os.path.join(FRONTEND_DATA, filename)]:
        with open(path, "w") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  Saved {len(data)} items to {filename}")


async def scrape_laws(page):
    """Scrape all 561+ chapters from legislation.mt via DataTables AJAX."""
    print("\n=== Scraping legislation.mt ===")

    captured = None
    def on_request(request):
        nonlocal captured
        if "LegislationPartial" in request.url and not captured:
            captured = request.post_data
    page.on("request", on_request)

    await page.goto("https://legislation.mt/Legislation", wait_until="networkidle", timeout=60000)
    await page.wait_for_timeout(5000)

    if not captured:
        print("  No AJAX captured — falling back to table scraping")
        return

    params = dict(urllib.parse.parse_qsl(captured))
    params["length"] = "1000"
    params["start"] = "0"

    response_text = await page.evaluate("""
        async (params) => {
            const formData = new URLSearchParams(params);
            const resp = await fetch("/Legislations/LegislationPartial", {
                method: "POST",
                headers: { "X-Requested-With": "XMLHttpRequest", "Content-Type": "application/x-www-form-urlencoded" },
                body: formData.toString()
            });
            return await resp.text();
        }
    """, params)

    data = json.loads(response_text)
    laws = []
    for item in data["data"]:
        title = item.get("ChapterTitle", "")
        # Clean HTML tags from title
        title = BeautifulSoup(title, "lxml").get_text(strip=True) if "<" in title else title
        laws.append({
            "chapter": item["ChapterText"],
            "title": title,
            "source_url": f'https://legislation.mt/{item["URL"]}' if item.get("URL") else "https://legislation.mt/Legislation",
        })

    save("legislation.json", laws)
    print(f"  Total: {len(laws)} laws")


async def scrape_ecourts(page, year_from=2020, year_to=2026):
    """Scrape eCourts judgments by date range."""
    print(f"\n=== Scraping eCourts ({year_from}-{year_to}) ===")

    # Load existing
    jfile = os.path.join(DATA_DIR, "ecourts_judgments.json")
    existing = []
    if os.path.exists(jfile):
        with open(jfile) as f:
            existing = json.load(f)
    existing_refs = {j.get("reference", "") for j in existing}
    print(f"  Existing: {len(existing)} judgments")

    await page.goto("https://ecourts.gov.mt/onlineservices", wait_until="networkidle", timeout=60000)
    await page.wait_for_timeout(5000)
    await page.goto("https://ecourts.gov.mt/onlineservices/Judgements", wait_until="networkidle", timeout=60000)
    await page.wait_for_timeout(5000)

    new_judgments = []

    for year in range(year_to, year_from - 1, -1):
        for half in [(1, 6), (7, 12)]:
            m1, m2 = half
            d_from = f"01/{m1:02d}/{year}"
            last_day = "28" if m2 == 2 else "30" if m2 in (4, 6, 9, 11) else "31"
            d_to = f"{last_day}/{m2:02d}/{year}"

            try:
                await page.goto("https://ecourts.gov.mt/onlineservices/Judgements",
                              wait_until="networkidle", timeout=30000)
                await page.wait_for_timeout(2000)

                await page.locator('input[value="dateOptionAll"]').check()
                await page.wait_for_timeout(500)

                df = page.locator('input[name="judgementDateFrom"]')
                dt = page.locator('input[name="judgementDateTo"]')
                await df.click()
                await df.fill(d_from)
                await dt.click()
                await dt.fill(d_to)

                await page.locator('button:has-text("Search"), button:has-text("Fittex")').first.click()
                await page.wait_for_timeout(6000)

                chunk = []
                for _ in range(20):
                    content = await page.content()
                    soup = BeautifulSoup(content, "lxml")

                    for row in soup.select("table tbody tr"):
                        tds = row.select("td")
                        if len(tds) < 5:
                            continue
                        texts = [td.get_text(strip=True) for td in tds]
                        if "no results" in " ".join(texts).lower():
                            continue
                        ref = texts[1]
                        if ref in existing_refs or ref in {j["reference"] for j in chunk}:
                            continue
                        chunk.append({
                            "date": texts[0],
                            "reference": ref,
                            "court": texts[2],
                            "parties": texts[3],
                            "judge": texts[4],
                            "source_url": "https://ecourts.gov.mt/onlineservices/Judgements",
                            "year": year,
                        })

                    next_btn = page.locator(".paginate_button.next")
                    if await next_btn.count() > 0:
                        cls = await next_btn.first.get_attribute("class") or ""
                        if "disabled" in cls:
                            break
                        await next_btn.first.click()
                        await page.wait_for_timeout(3000)
                    else:
                        break

                if chunk:
                    new_judgments.extend(chunk)
                    h = "1" if m1 == 1 else "2"
                    print(f"  {year} H{h}: {len(chunk)} new ({len(existing) + len(new_judgments)} total)")

                    # Save incrementally
                    save("ecourts_judgments.json", existing + new_judgments)

            except Exception as e:
                print(f"  {year} H{'1' if m1 == 1 else '2'}: {str(e)[:60]}")

    all_data = existing + new_judgments
    save("ecourts_judgments.json", all_data)
    print(f"  Total: {len(all_data)} judgments ({len(new_judgments)} new)")


async def scrape_lawyers(page):
    """Scrape lawyers from lawyersregister.gov.mt and avukati.org."""
    print("\n=== Scraping lawyers ===")

    lawyers = []

    # Try lawyersregister.gov.mt (without www — SSL cert issue on www)
    try:
        await page.goto("https://lawyersregister.gov.mt", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(5000)

        title = await page.title()
        print(f"  Lawyers Register: {title}")

        # Check for search/listing
        content = await page.content()
        soup = BeautifulSoup(content, "lxml")

        # Look for the register table/list
        rows = await page.locator("table tbody tr, .lawyer-item, .result-row, .list-group-item").all()
        print(f"  Found {len(rows)} items")

        for row in rows:
            cells = await row.locator("td").all()
            if len(cells) >= 2:
                texts = [(await c.inner_text()).strip() for c in cells]
                lawyers.append({
                    "warrant_number": texts[0],
                    "full_name": texts[1] if len(texts) > 1 else "",
                    "profession": texts[2] if len(texts) > 2 else "Advocate",
                    "firm": texts[3] if len(texts) > 3 else "",
                    "email": "",
                    "phone": "",
                    "practice_areas": [],
                    "source_url": "https://lawyersregister.gov.mt",
                })

        # If table didn't work, try searching A-Z
        if not lawyers:
            # Search for each letter
            for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
                try:
                    search_input = page.locator("input[type='text'], input[name*='search'], input[placeholder*='Search']").first
                    if await search_input.count() > 0:
                        await search_input.fill(letter)
                        submit = page.locator("button[type='submit'], input[type='submit']").first
                        if await submit.count() > 0:
                            await submit.click()
                            await page.wait_for_timeout(3000)

                            rows = await page.locator("table tbody tr").all()
                            for row in rows:
                                cells = await row.locator("td").all()
                                if len(cells) >= 2:
                                    texts = [(await c.inner_text()).strip() for c in cells]
                                    name = texts[1] if len(texts) > 1 else texts[0]
                                    wn = texts[0] if texts[0] and len(texts[0]) < 20 else f"LR-{len(lawyers)}"
                                    if name and name not in {l["full_name"] for l in lawyers}:
                                        lawyers.append({
                                            "warrant_number": wn,
                                            "full_name": name,
                                            "profession": "Advocate",
                                            "firm": "",
                                            "email": "",
                                            "phone": "",
                                            "practice_areas": [],
                                            "source_url": "https://lawyersregister.gov.mt",
                                        })

                            if lawyers and len(lawyers) % 50 == 0:
                                print(f"  {letter}: {len(lawyers)} lawyers so far")
                except:
                    continue

    except Exception as e:
        print(f"  Lawyers Register error: {e}")

    print(f"  Lawyers from register: {len(lawyers)}")

    # Also try known Malta law firms
    known_firms = [
        {"firm": "Fenech & Fenech Advocates", "url": "https://www.fenechlaw.com"},
        {"firm": "Camilleri Preziosi", "url": "https://www.camilleripreziosi.com"},
        {"firm": "GANADO Advocates", "url": "https://www.ganado.com"},
        {"firm": "Mamo TCV Advocates", "url": "https://www.mamotcv.com"},
        {"firm": "WH Partners", "url": "https://www.whpartners.eu"},
        {"firm": "Chetcuti Cauchi Advocates", "url": "https://www.ccmalta.com"},
        {"firm": "GTG Advocates", "url": "https://www.gtgadvocates.com"},
        {"firm": "GVZH Advocates", "url": "https://www.gvzh.com.mt"},
        {"firm": "Aequitas Legal", "url": "https://www.aequitas.com.mt"},
        {"firm": "EMD Advocates", "url": "https://www.emd.com.mt"},
        {"firm": "DF Advocates", "url": "https://www.dfadvocates.com"},
        {"firm": "CSB Group", "url": "https://www.csbgroup.com"},
        {"firm": "PKF Malta", "url": "https://www.pkfmalta.com"},
        {"firm": "KPMG Malta", "url": "https://www.kpmg.com.mt"},
        {"firm": "PwC Malta", "url": "https://www.pwc.com/mt"},
        {"firm": "Deloitte Malta", "url": "https://www.deloitte.com/mt"},
        {"firm": "EY Malta", "url": "https://www.ey.com/mt"},
        {"firm": "Grant Thornton Malta", "url": "https://www.grantthornton.com.mt"},
    ]

    firms = []
    for kf in known_firms:
        firms.append({
            "name": kf["firm"],
            "website": kf["url"],
            "practice_areas": [],
            "source_url": kf["url"],
        })

    save("lawyers.json", lawyers)
    save("law_firms.json", firms)
    print(f"  Total: {len(lawyers)} lawyers, {len(firms)} firms")


async def main(source="all", year_from=2020, year_to=2026):
    print("=" * 60)
    print("  Ligi4Friends Data Scraper — Powered by Rark Musso")
    print("=" * 60)

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

        if source in ("all", "laws"):
            await scrape_laws(page)

        if source in ("all", "ecourts"):
            await scrape_ecourts(page, year_from, year_to)

        if source in ("all", "lawyers"):
            await scrape_lawyers(page)

        await browser.close()

    print("\n" + "=" * 60)
    print("  Done! Data saved to backend/data/ and frontend/public/data/")
    print("  Run: git add -A && git commit -m 'Update data' && git push")
    print("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default="all", choices=["all", "laws", "ecourts", "lawyers"])
    parser.add_argument("--from", dest="year_from", type=int, default=2020)
    parser.add_argument("--to", dest="year_to", type=int, default=2026)
    args = parser.parse_args()
    asyncio.run(main(args.source, args.year_from, args.year_to))
