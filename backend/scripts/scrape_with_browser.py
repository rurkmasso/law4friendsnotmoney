"""
Browser-based scraper for sites that block plain HTTP requests.
Uses Playwright (headless Chromium) to render JS and bypass Cloudflare.

Usage:
    python scripts/scrape_with_browser.py --source legislation
    python scripts/scrape_with_browser.py --source ecourts
    python scripts/scrape_with_browser.py --source lawyers
    python scripts/scrape_with_browser.py --source mga
    python scripts/scrape_with_browser.py --source all
"""
import asyncio
import argparse
import json
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
from rich import print
from rich.progress import track
from sqlalchemy.ext.asyncio import AsyncSession
from database import AsyncSessionLocal
from rag.embeddings import embed
from models.law import Law
from models.judgment import Judgment
from models.lawyer import Lawyer
from models.document import Document


async def scrape_legislation(page) -> list[dict]:
    """Scrape legislation.mt using browser — gets all CAPs (chapters of the Laws of Malta)."""
    print("[bold cyan]Scraping legislation.mt with browser...[/bold cyan]")
    laws = []

    await page.goto("https://legislation.mt/Legislation", wait_until="networkidle", timeout=30000)
    await page.wait_for_timeout(3000)  # let DataTables render

    # Try to get all chapters from the DataTable
    # First, set the table to show all entries if possible
    try:
        # Look for "show entries" dropdown and set to max
        select = page.locator("select[name*='length'], select.form-control").first
        if await select.count() > 0:
            await select.select_option(value="-1")  # show all
            await page.wait_for_timeout(3000)
    except:
        pass

    # Get table rows
    rows = await page.locator("table tbody tr, #mainTable tbody tr, .dataTable tbody tr").all()
    print(f"[cyan]Found {len(rows)} table rows[/cyan]")

    for row in rows:
        cells = await row.locator("td").all()
        if len(cells) < 2:
            continue
        chapter = (await cells[0].inner_text()).strip()
        title = (await cells[1].inner_text()).strip()
        if chapter and title and len(title) > 3:
            # Try to get PDF link from row attributes
            pdf_link = await row.get_attribute("data-pdflink") or await row.get_attribute("pdfLink") or ""
            laws.append({
                "chapter": chapter,
                "title": title,
                "full_text": f"{chapter} {title}",
                "source_url": "https://legislation.mt/Legislation",
                "pdf_url": f"https://legislation.mt{pdf_link}" if pdf_link else None,
            })

    # If table approach didn't work, try scraping the links
    if not laws:
        print("[yellow]Table approach returned 0, trying links...[/yellow]")
        links = await page.locator("a[href*='/eli/'], a[href*='/cap/'], a[href*='/Legislation/']").all()
        for link in links:
            text = (await link.inner_text()).strip()
            href = await link.get_attribute("href") or ""
            if text and len(text) > 5:
                laws.append({
                    "chapter": "",
                    "title": text,
                    "full_text": text,
                    "source_url": f"https://legislation.mt{href}" if not href.startswith("http") else href,
                    "pdf_url": None,
                })

    print(f"[green]Legislation: {len(laws)} items[/green]")
    return laws


async def scrape_ecourts(page, start_year=2000) -> list[dict]:
    """Scrape ecourts.gov.mt judgments using browser to bypass Cloudflare."""
    print("[bold cyan]Scraping ecourts.gov.mt with browser...[/bold cyan]")
    judgments = []

    try:
        await page.goto("https://ecourts.gov.mt/onlineservices", wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(5000)

        # Check if we hit a Cloudflare challenge
        content = await page.content()
        if "challenge" in content.lower() or "cloudflare" in content.lower():
            print("[yellow]Cloudflare challenge detected, waiting for resolution...[/yellow]")
            await page.wait_for_timeout(10000)

        # Navigate to judgments search
        try:
            await page.goto("https://ecourts.gov.mt/onlineservices/Judgements/SearchJudgments",
                          wait_until="networkidle", timeout=60000)
        except:
            # Try alternative URL
            await page.goto("https://ecourts.gov.mt/onlineservices/Search/Judgements",
                          wait_until="networkidle", timeout=60000)

        await page.wait_for_timeout(3000)

        # Check if we got the page
        title = await page.title()
        print(f"[cyan]Page title: {title}[/cyan]")

        # Try to search for recent judgments
        from datetime import datetime
        current_year = datetime.now().year

        for year in range(current_year, max(start_year - 1, 1990), -1):
            try:
                # Fill in date range for the year
                date_from = page.locator("input[name*='DateFrom'], input[name*='dateFrom'], #DateFrom, input[type='date']").first
                if await date_from.count() > 0:
                    await date_from.fill(f"01/01/{year}")

                date_to = page.locator("input[name*='DateTo'], input[name*='dateTo'], #DateTo").first
                if await date_to.count() > 0:
                    await date_to.fill(f"31/12/{year}")

                # Click search button
                search_btn = page.locator("button[type='submit'], input[type='submit'], .btn-search, button:has-text('Search')").first
                if await search_btn.count() > 0:
                    await search_btn.click()
                    await page.wait_for_timeout(3000)

                # Get results
                rows = await page.locator("table tbody tr, .result-row, .judgment-item").all()
                year_count = 0
                for row in rows:
                    cells = await row.locator("td").all()
                    if len(cells) < 2:
                        text = (await row.inner_text()).strip()
                        if text and len(text) > 10:
                            judgments.append({
                                "reference": f"ECOURTS/{year}/{year_count}",
                                "court": "",
                                "judge": "",
                                "parties": text[:200],
                                "full_text": text,
                                "source_url": "https://ecourts.gov.mt/onlineservices",
                            })
                            year_count += 1
                        continue

                    texts = []
                    for cell in cells:
                        texts.append((await cell.inner_text()).strip())

                    if texts and any(t for t in texts if len(t) > 3):
                        judgments.append({
                            "reference": texts[0] if texts else f"ECOURTS/{year}/{year_count}",
                            "court": texts[1] if len(texts) > 1 else "",
                            "judge": texts[2] if len(texts) > 2 else "",
                            "parties": texts[3] if len(texts) > 3 else "",
                            "full_text": " ".join(texts),
                            "source_url": "https://ecourts.gov.mt/onlineservices",
                        })
                        year_count += 1

                if year_count > 0:
                    print(f"[cyan]eCourts {year}: {year_count} judgments[/cyan]")
                elif year < current_year - 3 and len(judgments) == 0:
                    print(f"[yellow]eCourts: no results found, stopping year scan[/yellow]")
                    break

            except Exception as e:
                print(f"[yellow]eCourts {year}: {e}[/yellow]")
                continue

    except Exception as e:
        print(f"[red]eCourts scrape failed: {e}[/red]")

    print(f"[green]eCourts: {len(judgments)} judgments[/green]")
    return judgments


async def scrape_lawyers(page) -> list[dict]:
    """Scrape lawyers from avukati.org (Chamber of Advocates) and lawyersregister.gov.mt."""
    print("[bold cyan]Scraping lawyer directories with browser...[/bold cyan]")
    lawyers = []

    # Try lawyersregister.gov.mt first
    try:
        await page.goto("https://lawyersregister.gov.mt", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(3000)
        title = await page.title()
        print(f"[cyan]Lawyers Register title: {title}[/cyan]")

        # Try to find the search/list
        rows = await page.locator("table tbody tr, .lawyer-item, .result-row").all()
        print(f"[cyan]Lawyers Register rows: {len(rows)}[/cyan]")

        for row in rows:
            cells = await row.locator("td").all()
            if len(cells) < 2:
                continue
            texts = [(await c.inner_text()).strip() for c in cells]
            lawyers.append({
                "warrant_number": texts[0] if texts else "",
                "full_name": texts[1] if len(texts) > 1 else texts[0],
                "profession": texts[2] if len(texts) > 2 else "Advocate",
                "firm": "",
                "email": "",
                "phone": "",
                "practice_areas": [],
                "source_url": "https://lawyersregister.gov.mt",
            })

    except Exception as e:
        print(f"[yellow]Lawyers Register: {e}[/yellow]")

    # Also try avukati.org
    try:
        await page.goto("https://www.avukati.org", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        soup = BeautifulSoup(content, "lxml")

        # Look for member links or listings
        member_links = soup.select("a[href*='member'], a[href*='lawyer'], a[href*='avukat']")
        print(f"[cyan]avukati.org member links: {len(member_links)}[/cyan]")

        # Try to find a members page
        for url in ["https://www.avukati.org/members", "https://www.avukati.org/en/members",
                     "https://www.avukati.org/directory"]:
            try:
                await page.goto(url, wait_until="networkidle", timeout=15000)
                await page.wait_for_timeout(2000)
                content = await page.content()
                soup = BeautifulSoup(content, "lxml")
                items = soup.select(".member-item, .lawyer-card, article, .entry")
                if items:
                    print(f"[cyan]Found {len(items)} members at {url}[/cyan]")
                    for item in items:
                        name = item.get_text(strip=True)
                        if name and len(name) > 3:
                            lawyers.append({
                                "warrant_number": f"AVUKATI-{len(lawyers)}",
                                "full_name": name[:100],
                                "profession": "Advocate",
                                "firm": "",
                                "email": "",
                                "phone": "",
                                "practice_areas": [],
                                "source_url": url,
                            })
                    break
            except:
                continue

    except Exception as e:
        print(f"[yellow]avukati.org: {e}[/yellow]")

    print(f"[green]Lawyers: {len(lawyers)} total[/green]")
    return lawyers


async def scrape_mga(page) -> list[dict]:
    """Scrape MGA licensed operators from mga.org.mt."""
    print("[bold cyan]Scraping MGA with browser...[/bold cyan]")
    operators = []

    try:
        await page.goto("https://www.mga.org.mt/gaming-sectors/licensees/", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(5000)

        content = await page.content()
        soup = BeautifulSoup(content, "lxml")

        # Look for licensee entries
        # MGA lists them in various formats — cards, tables, or list items
        items = soup.select("table tbody tr, .licensee-item, article, .company-card, .wp-block-table tr")

        if not items:
            # Try getting all text blocks that look like company entries
            all_text = soup.get_text(separator="\n")
            lines = [l.strip() for l in all_text.split("\n") if l.strip() and len(l.strip()) > 10]
            # Look for lines with licence-number-like patterns (MGA/...)
            import re
            for line in lines:
                if re.search(r'MGA/[A-Z0-9/]+', line):
                    licence_match = re.search(r'(MGA/[A-Z0-9/\-]+)', line)
                    licence = licence_match.group(1) if licence_match else ""
                    name = re.sub(r'MGA/[A-Z0-9/\-]+', '', line).strip()
                    if name:
                        operators.append({
                            "company_name": name,
                            "licence_number": licence,
                            "licence_type": "B2C Gaming Service",
                            "status": "Active",
                            "source_url": "https://www.mga.org.mt/gaming-sectors/licensees/",
                        })

        for item in items:
            cells = item.select("td")
            if cells and len(cells) >= 2:
                texts = [c.get_text(strip=True) for c in cells]
                operators.append({
                    "company_name": texts[0],
                    "licence_number": texts[1] if len(texts) > 1 else "",
                    "licence_type": texts[2] if len(texts) > 2 else "B2C Gaming Service",
                    "status": texts[3] if len(texts) > 3 else "Active",
                    "source_url": "https://www.mga.org.mt/gaming-sectors/licensees/",
                })

        print(f"[green]MGA operators: {len(operators)}[/green]")

    except Exception as e:
        print(f"[red]MGA scrape failed: {e}[/red]")

    return operators


async def store_laws(db: AsyncSession, laws: list[dict]):
    count = 0
    for item in track(laws, description="Storing laws..."):
        law = Law(
            chapter=item["chapter"],
            title=item["title"],
            full_text=item.get("full_text", ""),
            source_url=item.get("source_url", ""),
            embedding=embed(f"{item['chapter']} {item['title']} {item.get('full_text', '')[:2000]}"),
        )
        db.add(law)
        count += 1
        if count % 50 == 0:
            await db.commit()
    await db.commit()
    print(f"[green]Laws stored: {count}[/green]")


async def store_judgments(db: AsyncSession, judgments: list[dict]):
    count = 0
    for item in track(judgments, description="Storing judgments..."):
        j = Judgment(
            reference=item["reference"],
            court=item.get("court", ""),
            judge=item.get("judge", ""),
            parties=item.get("parties", ""),
            full_text=item.get("full_text", ""),
            source_url=item.get("source_url", ""),
            pdf_url=item.get("pdf_url"),
            embedding=embed(f"{item.get('reference')} {item.get('parties')} {item.get('full_text', '')[:2000]}"),
        )
        db.add(j)
        count += 1
        if count % 100 == 0:
            await db.commit()
    await db.commit()
    print(f"[green]Judgments stored: {count}[/green]")


async def store_lawyers(db: AsyncSession, lawyers: list[dict]):
    count = 0
    for item in track(lawyers, description="Storing lawyers..."):
        l = Lawyer(
            warrant_number=item.get("warrant_number", f"UNKNOWN-{count}"),
            full_name=item.get("full_name", ""),
            profession=item.get("profession", "Advocate"),
            firm=item.get("firm", ""),
            email=item.get("email", ""),
            phone=item.get("phone", ""),
            practice_areas=item.get("practice_areas", []),
            source_url=item.get("source_url", ""),
            embedding=embed(f"{item.get('full_name')} {item.get('firm', '')} {' '.join(item.get('practice_areas', []))}"),
        )
        db.add(l)
        count += 1
    await db.commit()
    print(f"[green]Lawyers stored: {count}[/green]")


async def main(source: str = "all"):
    print("[bold gold1]Ligi4Friends Browser Scraper — Powered by Rark Musso[/bold gold1]")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080},
        )
        page = await context.new_page()

        async with AsyncSessionLocal() as db:
            if source in ("all", "legislation"):
                laws = await scrape_legislation(page)
                if laws:
                    await store_laws(db, laws)

            if source in ("all", "ecourts"):
                judgments = await scrape_ecourts(page)
                if judgments:
                    await store_judgments(db, judgments)

            if source in ("all", "lawyers"):
                lawyers = await scrape_lawyers(page)
                if lawyers:
                    await store_lawyers(db, lawyers)

            if source in ("all", "mga"):
                operators = await scrape_mga(page)
                if operators:
                    for op in operators:
                        doc = Document(
                            title=f"MGA Licence: {op['company_name']}",
                            source="MGA",
                            doc_type="licence",
                            body=json.dumps(op),
                            full_text=f"{op['company_name']} {op['licence_number']} {op['licence_type']}",
                            source_url=op["source_url"],
                            embedding=embed(f"{op['company_name']} {op['licence_number']} MGA Malta iGaming"),
                        )
                        db.add(doc)
                    await db.commit()
                    print(f"[green]MGA operators stored: {len(operators)}[/green]")

        await browser.close()

    print("\n[bold green]Done![/bold green]")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default="all", choices=["all", "legislation", "ecourts", "lawyers", "mga"])
    args = parser.parse_args()
    asyncio.run(main(args.source))
