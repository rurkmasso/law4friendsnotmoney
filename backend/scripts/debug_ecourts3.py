"""Debug: submit search on ecourts and save the results page HTML."""
import asyncio
from playwright.async_api import async_playwright

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

        # Go to eCourts main first
        print("Loading eCourts main page...")
        await page.goto("https://ecourts.gov.mt/onlineservices", wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(5000)

        # Go to judgements
        print("Loading Judgements page...")
        await page.goto("https://ecourts.gov.mt/onlineservices/Judgements", wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(5000)

        # Take screenshot before search
        await page.screenshot(path="/tmp/ecourts_before.png")
        print("Screenshot saved: /tmp/ecourts_before.png")

        # "any day" should be default (dateOptionAlways)
        # Let's just click search with defaults to get recent results
        print("\nSubmitting search with 'any day' (all time)...")
        await page.locator('#judgementdateOption4').check()  # any day
        await page.wait_for_timeout(500)

        # Click search
        await page.locator('#searchJudgement').click()
        print("Clicked search, waiting 10s...")
        await page.wait_for_timeout(10000)

        # Take screenshot after search
        await page.screenshot(path="/tmp/ecourts_after.png", full_page=True)
        print("Screenshot saved: /tmp/ecourts_after.png")
        print(f"URL: {page.url}")

        # Save HTML
        content = await page.content()
        with open("/tmp/ecourts_search_results.html", "w") as f:
            f.write(content)
        print(f"HTML saved ({len(content)} chars)")

        # Look for tables
        tables_info = await page.evaluate("""
            () => {
                const tables = document.querySelectorAll('table');
                return Array.from(tables).map(t => {
                    const headers = Array.from(t.querySelectorAll('th')).map(th => th.textContent.trim());
                    const rows = t.querySelectorAll('tbody tr');
                    const firstRowCells = rows.length > 0 ?
                        Array.from(rows[0].querySelectorAll('td')).map(td => td.textContent.trim().substring(0, 50)) : [];
                    return {
                        id: t.id,
                        className: t.className.substring(0, 100),
                        headers: headers,
                        rowCount: rows.length,
                        firstRow: firstRowCells
                    };
                });
            }
        """)
        print(f"\nTables found: {len(tables_info)}")
        for t in tables_info:
            print(f"  id='{t['id']}' class='{t['className']}'")
            print(f"  Headers: {t['headers']}")
            print(f"  Rows: {t['rowCount']}")
            if t['firstRow']:
                print(f"  First row: {t['firstRow']}")

        # Look for DataTables info
        dt_info = await page.evaluate("""
            () => {
                const infos = document.querySelectorAll('.dataTables_info');
                return Array.from(infos).map(i => i.textContent.trim());
            }
        """)
        print(f"\nDataTables info: {dt_info}")

        # Look for pagination
        pag_info = await page.evaluate("""
            () => {
                const pags = document.querySelectorAll('.dataTables_paginate, .pagination, .paginate_button');
                return Array.from(pags).map(p => ({
                    class: p.className.substring(0, 50),
                    text: p.textContent.trim().substring(0, 100)
                }));
            }
        """)
        print(f"\nPagination: {pag_info[:5]}")

        # Check if results are in a different area
        results = await page.evaluate("""
            () => {
                // Check for various result containers
                const selectors = ['#results', '#searchResults', '.results', '#JudgementsGrid',
                    '#judgementResults', '.search-results', '[class*="result"]', '[id*="result"]',
                    '[id*="judgement"]', '[id*="Judgement"]'];
                const found = {};
                selectors.forEach(s => {
                    const el = document.querySelector(s);
                    if (el) {
                        found[s] = {
                            tag: el.tagName,
                            children: el.children.length,
                            text: el.textContent.trim().substring(0, 200)
                        };
                    }
                });
                return found;
            }
        """)
        print(f"\nResult containers: {JSON.stringify(results) if results else 'none'}")
        for sel, info in results.items():
            print(f"  {sel}: {info['tag']} ({info['children']} children)")
            print(f"    Text: {info['text'][:150]}")

        await browser.close()

import json
JSON = type('', (), {'stringify': staticmethod(json.dumps)})()
asyncio.run(main())
