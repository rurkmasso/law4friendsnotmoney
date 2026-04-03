import httpx
import asyncio
from abc import ABC, abstractmethod
from tenacity import retry, stop_after_attempt, wait_exponential
from rich import print


class BaseScraper(ABC):
    headers = {
        "User-Agent": "Ligi4Friends-OpenSource/1.0 (https://github.com/rurkmasso/ligi4friends; educational/public-interest)",
    }

    def __init__(self):
        self.client = httpx.AsyncClient(headers=self.headers, timeout=30, follow_redirects=True)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
    async def get(self, url: str) -> httpx.Response:
        await asyncio.sleep(1)  # polite crawling
        return await self.client.get(url)

    @abstractmethod
    async def scrape(self):
        pass

    async def close(self):
        await self.client.aclose()
