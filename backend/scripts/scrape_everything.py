"""
ONE-COMMAND SCRAPER — run this to get ALL data for Ligi4Friends.

Opens a visible Chrome window (required to bypass Cloudflare).
Run from backend/ directory:

    cd backend
    python scripts/scrape_everything.py

Scrapes in order:
  1. All 654+ law chapters from legislation.mt (DataTables AJAX)
  2. Detailed metadata + PDF links for each law
  3. eCourts judgments (all available years)
  4. Lawyers (from judgments + online sources)
  5. Regulatory documents (FIAU, MFSA, MGA, IDPC, CFR)

Data saved to backend/data/ AND frontend/public/data/ automatically.
"""
import asyncio
import json
import os
import sys
import re
import urllib.parse
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
FRONTEND_DATA = os.path.join(ROOT, "..", "frontend", "public", "data")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(FRONTEND_DATA, exist_ok=True)

BASE_URL = "https://legislation.mt"
PDF_DIR = os.path.join(FRONTEND_DATA, "pdfs")
os.makedirs(PDF_DIR, exist_ok=True)


def save(filename, data):
    for path in [os.path.join(DATA_DIR, filename), os.path.join(FRONTEND_DATA, filename)]:
        with open(path, "w") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"    💾 Saved {len(data)} items → {filename}")


def load(filename):
    path = os.path.join(DATA_DIR, filename)
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return []


async def download_pdf(page, url, filename):
    """Download a PDF via the browser to bypass Cloudflare."""
    dest = os.path.join(PDF_DIR, filename)
    if os.path.exists(dest) and os.path.getsize(dest) > 1000:
        return True  # already downloaded
    try:
        result = await page.evaluate("""
            async (url) => {
                const resp = await fetch(url);
                if (!resp.ok) return null;
                const ct = resp.headers.get('content-type') || '';
                if (!ct.includes('pdf') && !ct.includes('octet')) return null;
                const buf = await resp.arrayBuffer();
                return Array.from(new Uint8Array(buf));
            }
        """, url)
        if result:
            with open(dest, "wb") as f:
                f.write(bytes(result))
            return True
    except:
        pass
    return False


# ────────────────────────────────────────────────────────────
# STEP 1: Scrape all law chapters from legislation.mt
# ────────────────────────────────────────────────────────────
async def scrape_all_laws(page):
    print("\n" + "=" * 60)
    print("  STEP 1: Scraping ALL law chapters from legislation.mt")
    print("=" * 60)

    # Capture the AJAX request that DataTables makes
    captured = None
    def on_request(request):
        nonlocal captured
        if "LegislationPartial" in request.url and not captured:
            captured = request.post_data
    page.on("request", on_request)

    await page.goto("https://legislation.mt/Legislation", wait_until="networkidle", timeout=60000)
    await page.wait_for_timeout(8000)  # extra time for Cloudflare + DataTables init

    laws = []

    if captured:
        print("  ✓ Captured DataTables AJAX request")
        params = dict(urllib.parse.parse_qsl(captured))
        params["length"] = "2000"  # get all at once
        params["start"] = "0"

        try:
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
            print(f"  ✓ Server reports {data.get('recordsTotal', '?')} total records")

            for item in data["data"]:
                title = item.get("ChapterTitle", "")
                if "<" in title:
                    title = BeautifulSoup(title, "lxml").get_text(strip=True)
                url = item.get("URL", "")
                laws.append({
                    "chapter": item.get("ChapterText", ""),
                    "title": title,
                    "source_url": f"https://legislation.mt/{url}" if url else "https://legislation.mt/Legislation",
                })
        except Exception as e:
            print(f"  ✗ AJAX approach failed: {e}")

    # Fallback: scrape visible table rows if AJAX didn't work
    if not laws:
        print("  ⚠ AJAX approach returned 0, falling back to table scraping...")

        # Try to show all entries
        try:
            select = page.locator("select[name*='length'], select.form-control").first
            if await select.count() > 0:
                options = await select.locator("option").all()
                # Pick the largest value
                for opt in reversed(options):
                    val = await opt.get_attribute("value")
                    if val:
                        await select.select_option(value=val)
                        await page.wait_for_timeout(5000)
                        break
        except:
            pass

        # Scrape all visible rows
        content = await page.content()
        soup = BeautifulSoup(content, "lxml")
        for row in soup.select("table tbody tr"):
            cells = row.select("td")
            if len(cells) >= 2:
                chapter = cells[0].get_text(strip=True)
                title = cells[1].get_text(strip=True)
                # Try to get link
                link = cells[1].select_one("a[href]")
                href = link["href"] if link else ""
                if chapter and title and len(title) > 3:
                    laws.append({
                        "chapter": chapter,
                        "title": title,
                        "source_url": f"https://legislation.mt{href}" if href and not href.startswith("http") else href or "https://legislation.mt/Legislation",
                    })

        # If still nothing, try paginating
        if not laws:
            print("  ⚠ No table rows found, trying page links...")
            for a in soup.select("a[href*='/eli/'], a[href*='/cap/']"):
                text = a.get_text(strip=True)
                href = a["href"]
                if text and len(text) > 5:
                    # Extract chapter from URL
                    cap_match = re.search(r'/cap/(\d+)', href)
                    chapter = f"Kap. {cap_match.group(1)}" if cap_match else ""
                    laws.append({
                        "chapter": chapter,
                        "title": text,
                        "source_url": href if href.startswith("http") else f"https://legislation.mt{href}",
                    })

    # Deduplicate
    seen = set()
    unique_laws = []
    for law in laws:
        key = law["chapter"]
        if key and key not in seen:
            seen.add(key)
            unique_laws.append(law)

    if unique_laws:
        save("legislation.json", unique_laws)
        print(f"  ✓ Got {len(unique_laws)} law chapters!")
    else:
        print("  ✗ Could not scrape laws. Check if legislation.mt is accessible.")
        # Keep existing data
        unique_laws = load("legislation.json")
        print(f"  Using existing data: {len(unique_laws)} laws")

    return unique_laws


# ────────────────────────────────────────────────────────────
# STEP 2: Enrich each law with detailed metadata
# ────────────────────────────────────────────────────────────
async def enrich_law_details(page, laws):
    print("\n" + "=" * 60)
    print("  STEP 2: Enriching laws with metadata + PDF links")
    print("=" * 60)

    existing = load("legislation_detailed.json")
    existing_chapters = {law["chapter"] for law in existing}
    to_scrape = [law for law in laws if law["chapter"] not in existing_chapters]

    print(f"  Already enriched: {len(existing)}")
    print(f"  To enrich: {len(to_scrape)}")

    results = list(existing)

    for i, law in enumerate(to_scrape):
        chapter = law["chapter"]
        title = law.get("title", "")
        source_url = law.get("source_url", "")

        print(f"  [{i+1}/{len(to_scrape)}] {chapter}: {title[:50]}...")

        cap_num = re.search(r'(\d+)', chapter)
        cap_num = cap_num.group(1) if cap_num else None

        meta = {
            "chapter": chapter,
            "title": title,
            "title_en": "",
            "title_mt": title,
            "type": "Chapter",
            "eli_link": f"eli/cap/{cap_num}" if cap_num else "",
            "keywords": [],
            "languages": ["English", "Maltese"],
            "format": "PDF",
            "status": "In Force",
            "effective_date": "",
            "publication_date": "",
            "indicative_publication_date": "",
            "pdf_url": "",
            "pdf_url_en": f"{BASE_URL}/eli/cap/{cap_num}/eng/pdf" if cap_num else "",
            "pdf_url_mt": f"{BASE_URL}/eli/cap/{cap_num}/mlt/pdf" if cap_num else "",
            "source_url": source_url,
            "relationships": [],
            "timeline": [],
        }

        # Try to visit the detail page for richer metadata
        if source_url and source_url != "https://legislation.mt/Legislation":
            try:
                await page.goto(source_url, wait_until="networkidle", timeout=20000)
                await page.wait_for_timeout(1500)
                content = await page.content()
                soup = BeautifulSoup(content, "lxml")

                # Extract metadata from definition lists
                for dt in soup.select("dt, .metadata-label, th"):
                    label = dt.get_text(strip=True).lower()
                    dd = dt.find_next_sibling("dd") or dt.find_next_sibling("td")
                    if not dd:
                        continue
                    value = dd.get_text(strip=True)

                    if "type" in label:
                        meta["type"] = value
                    elif "eli" in label:
                        a = dd.find("a")
                        meta["eli_link"] = a["href"] if a and a.get("href") else value
                    elif "keyword" in label:
                        meta["keywords"] = [k.strip() for k in value.split(",") if k.strip()]
                    elif "language" in label:
                        meta["languages"] = [l.strip() for l in value.split() if l.strip()]
                    elif "status" in label:
                        meta["status"] = value
                    elif "effective" in label:
                        meta["effective_date"] = value
                    elif "publication" in label and "indicative" in label:
                        meta["indicative_publication_date"] = value
                    elif "publication" in label:
                        meta["publication_date"] = value

                # Status badges
                for badge in soup.select(".badge, .tag, .status, [class*='status']"):
                    text = badge.get_text(strip=True)
                    if text in ("In Force", "Fis-Seħħ", "Repealed", "Imħassar"):
                        meta["status"] = text

                # English title
                for el in soup.select("h1, h2, .title, .act-title"):
                    text = el.get_text(strip=True)
                    if text and len(text) > 10 and not any(c in text for c in "ċġħżĊĠĦŻ"):
                        meta["title_en"] = text
                        break

                # PDF links from page
                for a in soup.select("a[href*='.pdf'], a[href*='pdf']"):
                    href = a["href"]
                    if not href.startswith("http"):
                        href = BASE_URL + (href if href.startswith("/") else "/" + href)
                    text = a.get_text(strip=True).lower()
                    if "english" in text or "/eng" in href:
                        meta["pdf_url_en"] = href
                    elif "maltese" in text or "/mlt" in href:
                        meta["pdf_url_mt"] = href

                # Keywords from meta tags
                for mt in soup.select("meta[name*='keyword'], meta[property*='keyword']"):
                    c = mt.get("content", "")
                    if c:
                        meta["keywords"] = [k.strip() for k in c.split(",") if k.strip()]

            except Exception as e:
                print(f"    ⚠ Could not fetch detail page: {str(e)[:50]}")

        meta["pdf_url"] = meta["pdf_url_en"] or meta["pdf_url_mt"]

        # Download PDFs locally
        if cap_num:
            for lang_code, pdf_field in [("en", "pdf_url_en"), ("mt", "pdf_url_mt")]:
                pdf_u = meta[pdf_field]
                if pdf_u:
                    fname = f"cap_{cap_num}_{lang_code}.pdf"
                    ok = await download_pdf(page, pdf_u, fname)
                    if ok:
                        meta[f"local_pdf_{lang_code}"] = fname
                        print(f"    PDF ({lang_code}): downloaded")

        results.append(meta)

        # Save checkpoint every 25
        if (i + 1) % 25 == 0:
            save("legislation_detailed.json", results)
            save("legislation.json", results)
            print(f"  --- Checkpoint: {len(results)} laws saved ---")

        await page.wait_for_timeout(1000)

    save("legislation_detailed.json", results)
    save("legislation.json", results)
    print(f"  ✓ {len(results)} laws with full metadata!")
    return results


# ────────────────────────────────────────────────────────────
# STEP 3: Scrape eCourts judgments
# ────────────────────────────────────────────────────────────
async def scrape_ecourts(page, year_from=1960, year_to=2026):
    print("\n" + "=" * 60)
    print(f"  STEP 3: Scraping eCourts judgments ({year_from}-{year_to})")
    print("=" * 60)

    existing = load("ecourts_judgments.json")
    existing_refs = {j.get("reference", "") for j in existing}
    print(f"  Existing: {len(existing)} judgments")

    await page.goto("https://ecourts.gov.mt/onlineservices", wait_until="networkidle", timeout=60000)
    await page.wait_for_timeout(5000)

    new_judgments = []
    total_new = 0

    for year in range(year_to, year_from - 1, -1):
        for half in [(1, 6), (7, 12)]:
            m1, m2 = half
            d_from = f"01/{m1:02d}/{year}"
            last_day = "28" if m2 == 2 else "30" if m2 in (4, 6, 9, 11) else "31"
            d_to = f"{last_day}/{m2:02d}/{year}"
            h_label = f"H1" if m1 == 1 else "H2"

            try:
                await page.goto("https://ecourts.gov.mt/onlineservices/Judgements",
                              wait_until="networkidle", timeout=30000)
                await page.wait_for_timeout(2000)

                # Set date range
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
                pages_scraped = 0
                for _ in range(50):  # max 50 pages per half-year
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
                            "outcome": texts[5] if len(texts) > 5 else "",
                            "source_url": "https://ecourts.gov.mt/onlineservices/Judgements",
                            "year": year,
                        })

                    # Try next page
                    next_btn = page.locator(".paginate_button.next")
                    if await next_btn.count() > 0:
                        cls = await next_btn.first.get_attribute("class") or ""
                        if "disabled" in cls:
                            break
                        await next_btn.first.click()
                        await page.wait_for_timeout(3000)
                        pages_scraped += 1
                    else:
                        break

                if chunk:
                    new_judgments.extend(chunk)
                    for j in chunk:
                        existing_refs.add(j["reference"])
                    total_new += len(chunk)
                    print(f"  {year} {h_label}: +{len(chunk)} ({len(existing) + total_new} total, {pages_scraped} pages)")

                    # Save incrementally every 500 new
                    if total_new % 500 < len(chunk):
                        save("ecourts_judgments.json", existing + new_judgments)
                else:
                    print(f"  {year} {h_label}: 0 new")

            except Exception as e:
                print(f"  {year} {h_label}: ✗ {str(e)[:60]}")

    all_data = existing + new_judgments
    save("ecourts_judgments.json", all_data)
    print(f"  ✓ Total: {len(all_data)} judgments (+{total_new} new)")
    return all_data


# ────────────────────────────────────────────────────────────
# STEP 4: Extract lawyers from judgment data + online sources
# ────────────────────────────────────────────────────────────
async def scrape_lawyers(page):
    print("\n" + "=" * 60)
    print("  STEP 4: Extracting lawyers from judgments + online sources")
    print("=" * 60)

    existing = load("lawyers.json")
    existing_names = {l["full_name"].upper() for l in existing}
    print(f"  Existing: {len(existing)} legal professionals")

    # Get judges from judgments to exclude them
    judgments = load("ecourts_judgments.json")
    judges = set()
    for j in judgments:
        judge = (j.get("judge") or "").strip()
        if judge:
            judges.add(judge.upper())

    # Extract lawyers from judgment parties
    lawyer_stats = defaultdict(lambda: {"case_count": 0, "courts": set(), "first_date": None, "last_date": None})

    for j in judgments:
        parties = j.get("parties", "")
        court = j.get("court", "")
        date = j.get("date", "")

        avv_pattern = re.findall(
            r'(?:Avv\.|Avukat|Dr\.|Dott\.)\s+([A-Z][a-zA-ZàèìòùÀÈÌÒÙċĊġĠħĦżŻ\s\-\.]+?)(?:\s*[,;)\]]|$)',
            parties, re.IGNORECASE
        )
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

    print(f"  Found {len(lawyer_stats)} lawyers from judgment text")

    # Try online sources
    online_lawyers = []

    # Chamber of Advocates
    try:
        await page.goto("https://www.avukati.org", wait_until="networkidle", timeout=20000)
        await page.wait_for_timeout(3000)
        content = await page.content()
        soup = BeautifulSoup(content, "lxml")
        for a in soup.select("a[href]"):
            text = a.get_text(strip=True)
            href = a.get("href", "")
            if "member" in href.lower() or "directory" in href.lower():
                if not href.startswith("http"):
                    href = "https://www.avukati.org" + href
                try:
                    await page.goto(href, wait_until="networkidle", timeout=20000)
                    await page.wait_for_timeout(2000)
                    dir_soup = BeautifulSoup(await page.content(), "lxml")
                    for item in dir_soup.select("tr, li, .member, .lawyer"):
                        name_el = item.select_one("td, a, .name, h3, h4")
                        if name_el:
                            n = name_el.get_text(strip=True)
                            if len(n) > 4 and not any(s in n.lower() for s in ["search", "home", "about"]):
                                online_lawyers.append(n)
                except:
                    pass
        print(f"  Chamber of Advocates: {len(online_lawyers)} names")
    except Exception as e:
        print(f"  Chamber: {str(e)[:50]}")

    # Merge all sources
    all_lawyers = list(existing)

    # Add from judgments
    for name_upper, stats in lawyer_stats.items():
        if name_upper not in existing_names:
            existing_names.add(name_upper)
            all_lawyers.append({
                "warrant_number": f"ECT-{len(all_lawyers)}",
                "full_name": name_upper.title(),
                "profession": "Advocate",
                "firm": "", "email": "", "phone": "",
                "practice_areas": [],
                "case_count": stats["case_count"],
                "courts_active_in": list(stats["courts"]),
                "first_case_date": stats["first_date"],
                "last_case_date": stats["last_date"],
                "source_url": "https://ecourts.gov.mt/onlineservices/Judgements",
            })
        else:
            for lawyer in all_lawyers:
                if lawyer["full_name"].upper() == name_upper:
                    lawyer["case_count"] = max(lawyer.get("case_count", 0), stats["case_count"])
                    break

    # Add from online
    for name in online_lawyers:
        if name.upper() not in existing_names:
            existing_names.add(name.upper())
            all_lawyers.append({
                "warrant_number": f"COA-{len(all_lawyers)}",
                "full_name": name,
                "profession": "Advocate",
                "firm": "", "email": "", "phone": "",
                "practice_areas": [],
                "case_count": 0,
                "courts_active_in": [],
                "first_case_date": None,
                "last_case_date": None,
                "source_url": "https://www.avukati.org",
            })

    save("lawyers.json", all_lawyers)
    print(f"  ✓ Total: {len(all_lawyers)} legal professionals")
    return all_lawyers


# ────────────────────────────────────────────────────────────
# STEP 5: Scrape regulatory documents
# ────────────────────────────────────────────────────────────
async def scrape_regulatory(page):
    print("\n" + "=" * 60)
    print("  STEP 5: Scraping regulatory documents")
    print("=" * 60)

    existing = load("regulatory_docs.json")
    existing_urls = {d["url"] for d in existing}
    all_docs = list(existing)

    sources = {
        "FIAU": [
            ("https://fiaumalta.org/legislation/", "legislation"),
            ("https://fiaumalta.org/guidance/", "guidance"),
        ],
        "MFSA": [
            ("https://www.mfsa.mt/publications/circulars/", "circular"),
            ("https://www.mfsa.mt/publications/policy-and-guidance/", "guidance"),
        ],
        "MGA": [
            ("https://www.mga.org.mt/legislation-regulation/", "legislation"),
            ("https://www.mga.org.mt/publications/", "publication"),
        ],
        "IDPC": [
            ("https://idpc.org.mt/guidance/", "guidance"),
        ],
        "CFR": [
            ("https://cfr.gov.mt/en/Pages/Legislation-and-Guidelines.aspx", "guidance"),
        ],
    }

    for source_name, urls in sources.items():
        source_count = 0
        for url, doc_type in urls:
            try:
                await page.goto(url, wait_until="networkidle", timeout=25000)
                await page.wait_for_timeout(2000)
                content = await page.content()
                soup = BeautifulSoup(content, "lxml")

                for a in soup.select("a[href]"):
                    href = a.get("href", "")
                    text = a.get_text(strip=True)
                    if not text or len(text) < 10:
                        continue

                    is_doc = href.lower().endswith(".pdf") or any(
                        kw in text.lower() for kw in
                        ["act", "regulation", "directive", "guidance", "notice", "rule", "circular", "framework", "guideline"]
                    )
                    if not is_doc:
                        continue

                    if not href.startswith("http"):
                        base = url.rsplit("/", 1)[0] if "/" in url[8:] else url
                        href = base + "/" + href.lstrip("/") if not href.startswith("/") else url.split("//")[0] + "//" + url.split("//")[1].split("/")[0] + href

                    if href not in existing_urls:
                        existing_urls.add(href)
                        all_docs.append({
                            "title": text[:300],
                            "source": source_name,
                            "doc_type": doc_type,
                            "url": href,
                            "pdf_url": href if href.lower().endswith(".pdf") else "",
                            "date": "",
                            "description": f"{source_name} {doc_type}: {text[:200]}",
                        })
                        source_count += 1

            except Exception as e:
                print(f"  {source_name} {url}: ✗ {str(e)[:50]}")

        print(f"  {source_name}: +{source_count} docs")

    save("regulatory_docs.json", all_docs)
    print(f"  ✓ Total: {len(all_docs)} regulatory documents")
    return all_docs


# ────────────────────────────────────────────────────────────
# MAIN
# ────────────────────────────────────────────────────────────
async def main():
    print("=" * 60)
    print("  🏛️  Ligi4Friends — Complete Data Scraper")
    print("  Powered by Rark Musso")
    print("=" * 60)
    print("  This will scrape ALL data sources.")
    print("  A Chrome window will open — don't close it!")
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

        # Step 1: Get all law chapters
        laws = await scrape_all_laws(page)

        # Step 2: Enrich with metadata
        if laws:
            await enrich_law_details(page, laws)

        # Step 3: eCourts judgments
        judgments = await scrape_ecourts(page)

        # Step 4: Lawyers
        await scrape_lawyers(page)

        # Step 5: Regulatory docs
        await scrape_regulatory(page)

        await browser.close()

    # Final summary
    print("\n" + "=" * 60)
    print("  ✅ SCRAPING COMPLETE!")
    print("=" * 60)
    for fname in ["legislation.json", "ecourts_judgments.json", "lawyers.json", "regulatory_docs.json"]:
        data = load(fname)
        print(f"  {fname}: {len(data)} records")
    print()
    print("  Data saved to:")
    print(f"    {DATA_DIR}/")
    print(f"    {FRONTEND_DATA}/")
    print()
    print("  Next: git add -A && git commit -m 'Update data' && git push")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
