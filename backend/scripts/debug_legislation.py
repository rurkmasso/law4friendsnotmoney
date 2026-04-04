"""Debug: what does legislation.mt actually serve for a law page?"""
import asyncio
from playwright.async_api import async_playwright

BASE = "https://legislation.mt"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            accept_downloads=True,
        )
        page = await context.new_page()
        await page.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')

        # Go to main page first
        print("1. Going to legislation.mt...")
        await page.goto(BASE, wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(5000)
        print(f"   Title: {await page.title()}")
        print(f"   URL: {page.url}")

        # Now try a specific law page
        law_url = f"{BASE}/eli/cap/1/eng"
        print(f"\n2. Going to {law_url}...")
        resp = await page.goto(law_url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(5000)
        print(f"   Title: {await page.title()}")
        print(f"   URL: {page.url}")
        print(f"   Status: {resp.status if resp else 'None'}")

        # Get page content
        content = await page.content()
        print(f"   Content length: {len(content)}")

        # Check for Cloudflare
        if "challenge" in content.lower():
            print("   ⚠ CLOUDFLARE CHALLENGE DETECTED")
        if "turnstile" in content.lower():
            print("   ⚠ TURNSTILE DETECTED")

        # Find all links with 'pdf' in them
        print("\n3. Links with 'pdf':")
        links = await page.evaluate("""
            () => {
                return Array.from(document.querySelectorAll('a')).filter(a =>
                    a.href.toLowerCase().includes('pdf') ||
                    a.textContent.toLowerCase().includes('pdf')
                ).map(a => ({href: a.href, text: a.textContent.trim(), target: a.target}))
            }
        """)
        for link in links:
            print(f"   {link}")

        # Find all buttons
        print("\n4. All buttons:")
        buttons = await page.evaluate("""
            () => {
                return Array.from(document.querySelectorAll('button, [role="button"], .btn')).map(b => ({
                    text: b.textContent.trim().substring(0, 100),
                    class: b.className,
                    id: b.id,
                }))
            }
        """)
        for btn in buttons[:20]:
            print(f"   {btn}")

        # Find download-related elements
        print("\n5. Download-related elements:")
        downloads = await page.evaluate("""
            () => {
                const els = document.querySelectorAll('[download], a[href*="download"], a[href*="Download"], a[href*="GetPdf"]');
                return Array.from(els).map(e => ({tag: e.tagName, href: e.href, text: e.textContent.trim().substring(0, 100)}))
            }
        """)
        for dl in downloads:
            print(f"   {dl}")

        # Try the PDF URL directly
        pdf_url = f"{BASE}/eli/cap/1/eng/pdf"
        print(f"\n6. Going to PDF URL: {pdf_url}...")
        resp2 = await page.goto(pdf_url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(5000)
        print(f"   Title: {await page.title()}")
        print(f"   URL: {page.url}")
        if resp2:
            print(f"   Status: {resp2.status}")
            ct = resp2.headers.get("content-type", "")
            print(f"   Content-Type: {ct}")
        content2 = await page.content()
        print(f"   Content length: {len(content2)}")
        if "challenge" in content2.lower():
            print("   ⚠ CLOUDFLARE CHALLENGE on PDF page too")

        # Check if there's an iframe or embed
        print("\n7. Iframes/embeds on PDF page:")
        frames = await page.evaluate("""
            () => {
                const iframes = Array.from(document.querySelectorAll('iframe')).map(i => ({src: i.src, id: i.id}));
                const embeds = Array.from(document.querySelectorAll('embed, object')).map(e => ({src: e.src || e.data, type: e.type}));
                return {iframes, embeds};
            }
        """)
        print(f"   Iframes: {frames.get('iframes', [])}")
        print(f"   Embeds: {frames.get('embeds', [])}")

        # Save the HTML for inspection
        with open("/tmp/legislation_law_page.html", "w") as f:
            f.write(content)
        with open("/tmp/legislation_pdf_page.html", "w") as f:
            f.write(content2)
        print("\n8. Saved HTML to /tmp/legislation_law_page.html and /tmp/legislation_pdf_page.html")

        await browser.close()

asyncio.run(main())
