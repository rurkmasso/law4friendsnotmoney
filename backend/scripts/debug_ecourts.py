"""Debug: understand ecourts.gov.mt search form and result structure."""
import asyncio
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import re

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            viewport={"width": 1920, "height": 1080},
        )
        page = await context.new_page()
        await page.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')

        print("1. Loading eCourts...")
        await page.goto("https://ecourts.gov.mt/onlineservices", wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(5000)
        print(f"   URL: {page.url}")
        print(f"   Title: {await page.title()}")

        print("\n2. Going to Judgements page...")
        await page.goto("https://ecourts.gov.mt/onlineservices/Judgements", wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(5000)
        print(f"   URL: {page.url}")

        # Get all form elements
        content = await page.content()
        soup = BeautifulSoup(content, "lxml")

        print("\n3. Form inputs:")
        for inp in soup.select("input, select, textarea"):
            name = inp.get("name", inp.get("id", ""))
            typ = inp.get("type", inp.name)
            val = inp.get("value", "")
            print(f"   {typ}: {name} = {val[:50]}")

        print("\n4. Radio buttons:")
        for radio in soup.select("input[type='radio']"):
            name = radio.get("name", "")
            val = radio.get("value", "")
            checked = "checked" if radio.get("checked") else ""
            label = ""
            lbl = radio.find_next("label")
            if lbl:
                label = lbl.get_text(strip=True)[:50]
            print(f"   {name} = {val} {checked} ({label})")

        print("\n5. Select dropdowns:")
        for sel in soup.select("select"):
            name = sel.get("name", sel.get("id", ""))
            opts = sel.select("option")
            print(f"   {name}: {len(opts)} options")
            for opt in opts[:10]:
                print(f"      {opt.get('value', '')} = {opt.get_text(strip=True)[:60]}")
            if len(opts) > 10:
                print(f"      ... and {len(opts)-10} more")

        print("\n6. Buttons:")
        for btn in soup.select("button, input[type='submit']"):
            print(f"   {btn.get('type', 'button')}: {btn.get_text(strip=True)[:50]} id={btn.get('id', '')}")

        # Try a search with just a month to see result count
        print("\n7. Trying search for January 2024...")
        try:
            # Look for date inputs
            date_from = page.locator('input[name="judgementDateFrom"], input[name="JudgementDateFrom"], #judgementDateFrom, #JudgementDateFrom').first
            date_to = page.locator('input[name="judgementDateTo"], input[name="JudgementDateTo"], #judgementDateTo, #JudgementDateTo').first

            if await date_from.count() > 0:
                await date_from.fill("01/01/2024")
                await date_to.fill("31/01/2024")
                print("   Filled dates")
            else:
                print("   No date inputs found, trying alternate approach...")
                # Print all visible inputs
                all_inputs = await page.locator("input:visible").all()
                for inp in all_inputs[:20]:
                    name = await inp.get_attribute("name") or await inp.get_attribute("id") or "?"
                    typ = await inp.get_attribute("type") or "text"
                    print(f"   Visible input: {name} ({typ})")

            # Click search
            search_btn = page.locator('button:has-text("Search"), button:has-text("Fittex"), input[type="submit"]').first
            if await search_btn.count() > 0:
                await search_btn.click()
                await page.wait_for_timeout(6000)
                print("   Clicked search")

                content = await page.content()
                soup = BeautifulSoup(content, "lxml")

                # Check for results info
                info = soup.select(".dataTables_info, .results-info, [class*='info']")
                for i in info:
                    txt = i.get_text(strip=True)
                    if txt:
                        print(f"   Info: {txt}")

                # Check table structure
                tables = soup.select("table")
                print(f"   Tables found: {len(tables)}")
                for t in tables:
                    headers = [th.get_text(strip=True) for th in t.select("th")]
                    rows = t.select("tbody tr")
                    if headers:
                        print(f"   Table headers: {headers}")
                        print(f"   Table rows: {len(rows)}")
                        if rows:
                            first_row = [td.get_text(strip=True)[:40] for td in rows[0].select("td")]
                            print(f"   First row: {first_row}")
                            # Check for links in first row
                            links = rows[0].select("a[href]")
                            for a in links:
                                print(f"   Link: {a.get('href', '')[:80]}")

                # Check pagination
                pag = soup.select(".paginate_button, .pagination a, [class*='page']")
                print(f"   Pagination elements: {len(pag)}")

                # Check for DataTables AJAX config
                scripts = soup.select("script")
                for s in scripts:
                    text = s.get_text()
                    if "ajax" in text.lower() and ("dataTable" in text or "DataTable" in text):
                        # Extract relevant parts
                        lines = [l.strip() for l in text.split("\n") if "ajax" in l.lower() or "url" in l.lower() or "serverSide" in l.lower()]
                        for l in lines[:5]:
                            print(f"   DataTable config: {l[:100]}")

                # Check for server-side processing info in JS
                print("\n8. Looking for AJAX/API endpoints...")
                js_content = await page.evaluate("""
                    () => {
                        // Check for DataTables instances
                        const tables = document.querySelectorAll('table');
                        const info = [];
                        if (window.jQuery) {
                            tables.forEach(t => {
                                try {
                                    const dt = window.jQuery(t).DataTable();
                                    const settings = dt.settings()[0];
                                    if (settings && settings.ajax) {
                                        info.push({ajax: typeof settings.ajax === 'string' ? settings.ajax : JSON.stringify(settings.ajax).substring(0, 200)});
                                    }
                                    info.push({serverSide: settings.oFeatures ? settings.oFeatures.bServerSide : 'unknown'});
                                    info.push({recordsTotal: settings._iRecordsTotal || 0});
                                    info.push({recordsFiltered: settings._iRecordsDisplay || 0});
                                } catch(e) { info.push({error: e.message}); }
                            });
                        }
                        return info;
                    }
                """)
                for item in js_content:
                    print(f"   {item}")

            else:
                print("   No search button found")

        except Exception as e:
            print(f"   Error: {e}")

        # Save page for inspection
        with open("/tmp/ecourts_page.html", "w") as f:
            f.write(await page.content())
        print("\n9. Saved HTML to /tmp/ecourts_page.html")

        await browser.close()

asyncio.run(main())
