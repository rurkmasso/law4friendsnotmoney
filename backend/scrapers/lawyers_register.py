"""
Scraper for lawyersregister.gov.mt — official Malta register of warranted lawyers.
Also cross-references Chamber of Advocates (avukati.org).
"""
from bs4 import BeautifulSoup
from scrapers.base import BaseScraper
from rich import print

REGISTER_URL = "https://lawyersregister.gov.mt"
CHAMBER_URL = "https://avukati.org/find-a-lawyer"


class LawyersRegisterScraper(BaseScraper):

    async def scrape(self) -> list[dict]:
        lawyers = {}

        # Primary: official govt register
        govt_lawyers = await self._scrape_govt_register()
        for l in govt_lawyers:
            lawyers[l["warrant_number"]] = l
        print(f"[green]Govt register: {len(govt_lawyers)} lawyers[/green]")

        # Supplement: Chamber of Advocates (adds emails, firms, specialisations)
        chamber_lawyers = await self._scrape_chamber()
        for l in chamber_lawyers:
            key = l.get("warrant_number") or l["full_name"]
            if key in lawyers:
                lawyers[key].update({k: v for k, v in l.items() if v})
            else:
                lawyers[key] = l
        print(f"[green]After Chamber merge: {len(lawyers)} total lawyers[/green]")

        return list(lawyers.values())

    async def _scrape_govt_register(self) -> list[dict]:
        lawyers = []
        page = 1
        while True:
            resp = await self.get(f"{REGISTER_URL}?page={page}")
            soup = BeautifulSoup(resp.text, "lxml")
            rows = soup.select("table tr, .lawyer-row, li.lawyer")
            if not rows:
                break
            for row in rows:
                cells = row.select("td, span, div")
                if not cells:
                    continue
                text = [c.get_text(strip=True) for c in cells]
                if len(text) < 2:
                    continue
                lawyers.append({
                    "warrant_number": text[0] if text else "",
                    "full_name": text[1] if len(text) > 1 else "",
                    "profession": text[2] if len(text) > 2 else "Advocate",
                    "source_url": REGISTER_URL,
                })
            next_page = soup.find("a", string=lambda t: t and "next" in t.lower())
            if not next_page:
                break
            page += 1
        return lawyers

    async def _scrape_chamber(self) -> list[dict]:
        lawyers = []
        resp = await self.get(CHAMBER_URL)
        soup = BeautifulSoup(resp.text, "lxml")
        for card in soup.select(".lawyer-card, .member-card, article.lawyer"):
            name = card.select_one("h2, h3, .name")
            firm = card.select_one(".firm, .organisation")
            email = card.select_one("a[href^='mailto:']")
            phone = card.select_one(".phone, .tel")
            areas = card.select(".practice-area, .tag, .specialisation")
            lawyers.append({
                "full_name": name.get_text(strip=True) if name else "",
                "firm": firm.get_text(strip=True) if firm else "",
                "email": email["href"].replace("mailto:", "") if email else "",
                "phone": phone.get_text(strip=True) if phone else "",
                "practice_areas": [a.get_text(strip=True) for a in areas],
                "source_url": CHAMBER_URL,
            })
        return lawyers
