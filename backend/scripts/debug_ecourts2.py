"""Debug: submit a search and analyze the results page."""
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

        print("Loading eCourts...")
        await page.goto("https://ecourts.gov.mt/onlineservices/Judgements", wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(5000)

        # Select "date range" radio to enable date inputs
        print("Selecting date range option...")
        await page.locator('#judgementdateOption3').check()  # dateOptionAll
        await page.wait_for_timeout(1000)

        # Fill a narrow date range — 1 month
        print("Filling dates: Jan 2024...")
        await page.locator('#judgementDateFrom').fill("01/01/2024")
        await page.locator('#judgementDateTo').fill("31/01/2024")
        await page.wait_for_timeout(500)

        # Submit
        print("Searching...")
        await page.locator('#searchJudgement').click()
        await page.wait_for_timeout(8000)
        print(f"URL after search: {page.url}")

        content = await page.content()
        soup = BeautifulSoup(content, "lxml")

        # Check for results count
        print("\nLooking for result count...")
        for el in soup.select(".dataTables_info, .results-info, [class*='info'], .infos, .bootgrid-header"):
            txt = el.get_text(strip=True)[:200]
            if txt and any(c.isdigit() for c in txt):
                print(f"  {txt}")

        # Find the results table
        print("\nResults tables:")
        for table in soup.select("table"):
            tid = table.get("id", "")
            tcls = table.get("class", [])
            headers = [th.get_text(strip=True) for th in table.select("thead th, tr:first-child th")]
            rows = table.select("tbody tr")
            if headers or rows:
                print(f"  Table id={tid} class={tcls}")
                print(f"  Headers: {headers}")
                print(f"  Rows: {len(rows)}")
                if rows:
                    # First row
                    cells = rows[0].select("td")
                    for ci, c in enumerate(cells):
                        txt = c.get_text(strip=True)[:80]
                        links = c.select("a[href]")
                        link_info = [a.get("href", "")[:80] for a in links]
                        print(f"    Cell {ci}: {txt}")
                        if link_info:
                            print(f"      Links: {link_info}")

        # Check pagination
        print("\nPagination:")
        pag = soup.select(".pagination li, .paginate_button, .bootgrid-footer button, .bootgrid-footer .infoBar")
        for el in pag[:20]:
            print(f"  {el.get_text(strip=True)[:50]} class={el.get('class', '')}")

        # Look for total count in the pagination area
        footer = soup.select(".bootgrid-footer")
        for f in footer:
            print(f"  Footer: {f.get_text(strip=True)[:200]}")

        # Try to get total from JavaScript
        print("\nJavaScript data:")
        try:
            info = await page.evaluate("""
                () => {
                    const tables = document.querySelectorAll('table');
                    const results = [];
                    tables.forEach(t => {
                        const rows = t.querySelectorAll('tbody tr');
                        if (rows.length > 0) {
                            results.push({id: t.id, rows: rows.length});
                        }
                    });
                    // Check for bootgrid info
                    const infos = document.querySelectorAll('.infos');
                    infos.forEach(i => results.push({info: i.textContent.trim()}));
                    // Check for DataTables
                    const dtInfos = document.querySelectorAll('.dataTables_info');
                    dtInfos.forEach(i => results.push({dtInfo: i.textContent.trim()}));
                    return results;
                }
            """)
            for item in info:
                print(f"  {item}")
        except Exception as e:
            print(f"  Error: {e}")

        # Now try to navigate to page 2 or change page size
        print("\nTrying to see DataTables pagination...")
        try:
            # Check if there's a "show N entries" dropdown
            show_entries = await page.evaluate("""
                () => {
                    const selects = document.querySelectorAll('select[name*="length"], .dataTables_length select');
                    return Array.from(selects).map(s => ({
                        name: s.name || s.id,
                        options: Array.from(s.options).map(o => o.value)
                    }));
                }
            """)
            print(f"  Length selects: {show_entries}")
        except:
            pass

        # Save the results page
        with open("/tmp/ecourts_results.html", "w") as f:
            f.write(content)
        print("\nSaved to /tmp/ecourts_results.html")

        await browser.close()

asyncio.run(main())
