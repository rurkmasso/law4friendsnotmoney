"""
Malta law firms scraper — builds a database of all legal firms,
their lawyers, practice areas, and contact details.
Sources: lawyersinmalta.com, avukati.org, MBR (registered companies), direct firm websites.
"""
import re
from bs4 import BeautifulSoup
from scrapers.base import BaseScraper
from rich import print

SOURCES = [
    "https://lawyersinmalta.com/law-firms",
    "https://lawyersinmalta.com/advocates-in-malta",
    "https://avukati.org/find-a-lawyer",
]

# Known major Malta law firms for direct scraping
KNOWN_FIRMS = [
    {"name": "Ganado Advocates", "url": "https://www.ganado.com/team"},
    {"name": "Fenech & Fenech Advocates", "url": "https://fenechlaw.com/team"},
    {"name": "Camilleri Preziosi", "url": "https://camilleripreziosi.com/team"},
    {"name": "WH Partners", "url": "https://whpartners.eu/team"},
    {"name": "GANADO Advocates", "url": "https://www.ganado.com"},
    {"name": "Mamo TCV Advocates", "url": "https://mamotcv.com/team"},
    {"name": "Advocates Chetcuti Cauchi", "url": "https://chetcuticauchi.com/team"},
    {"name": "PKF Malta", "url": "https://pkfmalta.com/team"},
    {"name": "KPMG Malta Legal", "url": "https://home.kpmg/mt/en/home/services/tax/legal.html"},
    {"name": "Deloitte Malta Legal", "url": "https://www2.deloitte.com/mt/en/pages/legal.html"},
]

PRACTICE_AREA_KEYWORDS = {
    "Corporate & M&A": ["corporate", "mergers", "acquisitions", "company law", "kumpanija"],
    "Banking & Finance": ["banking", "finance", "fintech", "financial services", "bank"],
    "Gaming": ["gaming", "gambling", "igaming", "mga", "casino"],
    "Maritime": ["maritime", "shipping", "admiralty", "flag state", "vessel", "navigazzjoni"],
    "Tax": ["tax", "vat", "taxation", "fiscal", "taxxa", "fiskali"],
    "Employment": ["employment", "labour", "industrial relations", "xogħol", "era"],
    "Real Estate": ["property", "real estate", "conveyancing", "proprjetà", "kiri"],
    "Criminal": ["criminal", "defence", "prosecution", "kriminali", "akkuża"],
    "Family": ["family", "divorce", "custody", "matrimonial", "familja", "divorzju"],
    "IP & Technology": ["intellectual property", "trademark", "patent", "copyright", "technology"],
    "Data Protection": ["gdpr", "data protection", "privacy", "idpc"],
    "AML/Compliance": ["aml", "kyc", "compliance", "fiau", "anti-money laundering"],
    "EU Law": ["eu law", "european", "cjeu", "directive", "regulation"],
    "Litigation": ["litigation", "disputes", "arbitration", "mediation", "kawża"],
    "Immigration": ["immigration", "visa", "residence", "citizenship", "migrazzjoni"],
}


class LawFirmsScraper(BaseScraper):

    async def scrape(self) -> list[dict]:
        firms = {}

        # Scrape known firms directly
        for firm_info in KNOWN_FIRMS:
            try:
                firm = await self._scrape_firm(firm_info["name"], firm_info["url"])
                if firm:
                    firms[firm["name"]] = firm
                    print(f"[cyan]  {firm['name']}: {len(firm.get('lawyers', []))} lawyers[/cyan]")
            except Exception as e:
                print(f"[red]  {firm_info['name']} failed: {e}[/red]")

        # Scrape directory sites
        for source_url in SOURCES:
            try:
                directory_firms = await self._scrape_directory(source_url)
                for f in directory_firms:
                    if f["name"] not in firms:
                        firms[f["name"]] = f
                print(f"[cyan]  Directory {source_url}: {len(directory_firms)} firms[/cyan]")
            except Exception as e:
                print(f"[red]  {source_url} failed: {e}[/red]")

        result = list(firms.values())
        print(f"[green]Total law firms: {len(result)}[/green]")
        return result

    async def _scrape_firm(self, name: str, url: str) -> dict | None:
        resp = await self.get(url)
        soup = BeautifulSoup(resp.text, "lxml")

        # Get all lawyer names from team page
        lawyers = []
        for card in soup.select(".team-member, .lawyer, .person, article.team, .staff-member"):
            person_name = card.select_one("h2, h3, h4, .name, .title")
            role = card.select_one(".role, .position, .title, p")
            if person_name:
                lawyers.append({
                    "name": person_name.get_text(strip=True),
                    "role": role.get_text(strip=True) if role else "",
                })

        # Get contact details
        email_el = soup.find("a", href=re.compile(r"mailto:"))
        phone_el = soup.find("a", href=re.compile(r"tel:"))
        address_el = soup.select_one("address, .address, .contact-address")

        # Detect practice areas from page text
        page_text = soup.get_text().lower()
        practice_areas = [
            area for area, keywords in PRACTICE_AREA_KEYWORDS.items()
            if any(kw in page_text for kw in keywords)
        ]

        return {
            "name": name,
            "website": url.split("/team")[0].split("/lawyers")[0],
            "email": email_el["href"].replace("mailto:", "") if email_el else "",
            "phone": phone_el["href"].replace("tel:", "") if phone_el else "",
            "address": address_el.get_text(strip=True) if address_el else "",
            "practice_areas": practice_areas,
            "lawyers": lawyers,
            "lawyer_count": len(lawyers),
        }

    async def _scrape_directory(self, url: str) -> list[dict]:
        resp = await self.get(url)
        soup = BeautifulSoup(resp.text, "lxml")
        firms = []
        for item in soup.select(".firm, .law-firm, article, .listing"):
            name_el = item.select_one("h2, h3, .name")
            if not name_el:
                continue
            name = name_el.get_text(strip=True)
            if not name:
                continue
            link = item.select_one("a[href]")
            website = link["href"] if link else ""
            firms.append({
                "name": name,
                "website": website,
                "email": "",
                "phone": "",
                "address": "",
                "practice_areas": [],
                "lawyers": [],
                "lawyer_count": 0,
            })
        return firms
