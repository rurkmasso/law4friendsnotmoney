"""
Download historical Maltese legal documents from public archives.
Sources: Google Books, Archive.org, Wayback Machine, legislation.mt, OAPEN, UM OAR.

These are pre-independence and colonial-era documents in Italian, French, and English.

Usage:
    python scripts/download_historical_laws.py
"""
import asyncio
import json
import os
import sys
import re
import ssl
import urllib.request

# Fix SSL cert verification on macOS
ssl._create_default_https_context = ssl._create_unverified_context

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")
FRONTEND_DATA = os.path.join(ROOT, "..", "frontend", "public", "data")
HIST_DIR = os.path.join(FRONTEND_DATA, "historical")
os.makedirs(HIST_DIR, exist_ok=True)

# Historical legal documents with direct download URLs
DOCUMENTS = [
    # === KNIGHTS PERIOD (1530-1798) ===
    {
        "id": "codice_de_rohan_v1",
        "title": "Diritto Municipale di Malta — Volume 1",
        "title_en": "Municipal Law of Malta — Volume 1 (Codice de Rohan)",
        "year": 1784,
        "era": "Knights of St John",
        "language": "it",
        "type": "Code",
        "description": "The most important pre-British legal codification of Malta. Compiled under Grand Master Emmanuel de Rohan-Polduc. Covers civil law, family law, criminal law, maritime law.",
        "source": "Google Books (Alessandrina Library, Rome)",
        "url": "https://books.google.com/books/download/Del_diritto_municipale_di_Malta.pdf?id=aQBVXijtkfYC&output=pdf",
        "filename": "codice_de_rohan_v1_1784.pdf",
    },
    {
        "id": "codice_de_rohan_v2",
        "title": "Diritto Municipale di Malta — Volume 2",
        "title_en": "Municipal Law of Malta — Volume 2 (Codice de Rohan)",
        "year": 1784,
        "era": "Knights of St John",
        "language": "it",
        "type": "Code",
        "description": "Second volume of the Codice de Rohan. Maritime law, commercial regulations, judicial procedures.",
        "source": "Google Books",
        "url": "https://books.google.com/books/download/Diritto_municipale_di_Malta.pdf?id=d1FyXJsyUYcC&output=pdf",
        "filename": "codice_de_rohan_v2_1784.pdf",
    },
    {
        "id": "codice_de_rohan_v1_alt",
        "title": "Diritto Municipale di Malta — Nuova Compilazione",
        "title_en": "Municipal Law of Malta — New Compilation",
        "year": 1784,
        "era": "Knights of St John",
        "language": "it",
        "type": "Code",
        "description": "Alternative edition of the Codice de Rohan from a different library digitization.",
        "source": "Google Books",
        "url": "https://books.google.com/books/download/Del_diritto_municipale_di_Malta.pdf?id=nr0SalLDZ4sC&output=pdf",
        "filename": "codice_de_rohan_nuova_1784.pdf",
    },

    # === BRITISH COLONIAL PERIOD (1800-1964) ===
    {
        "id": "malta_laws_1869",
        "title": "Laws Made by the Legislature of Malta (1869-1870)",
        "title_en": "Laws Made by the Legislature of Malta, Volume 16",
        "year": 1870,
        "era": "British Colonial",
        "language": "en",
        "type": "Statute Book",
        "description": "Official compilation of laws passed by the Malta Legislature during 1869-1870.",
        "source": "Google Books",
        "url": "https://books.google.com/books/download/Laws_Made_by_the_Legislature_of_Malta.pdf?id=LnUZAAAAYAAJ&output=pdf",
        "filename": "malta_laws_legislature_1869_70.pdf",
    },
    {
        "id": "malta_laws_collection",
        "title": "Laws of Malta — Historical Collection",
        "title_en": "Laws of Malta — Historical Collection",
        "year": 1854,
        "era": "British Colonial",
        "language": "en",
        "type": "Statute Book",
        "description": "Historical collection of Malta's laws from the British colonial period.",
        "source": "Google Books",
        "url": "https://books.google.com/books/download/Laws_of_Malta.pdf?id=cr3t2OH0x-MC&output=pdf",
        "filename": "laws_of_malta_historical.pdf",
    },
    {
        "id": "coleridge_laws",
        "title": "Coleridge's Laws — A Study of Coleridge in Malta",
        "title_en": "Coleridge's Laws: The British Administration of Malta 1804-1805",
        "year": 1805,
        "era": "British Colonial",
        "language": "en",
        "type": "Administrative Law",
        "description": "First published translations of laws and public notices drafted by Samuel Taylor Coleridge as Public Secretary of Malta (1804-1805). Covers early British legal administration.",
        "source": "OAPEN Library",
        "url": "https://library.oapen.org/bitstream/handle/20.500.12657/30310/646710.pdf",
        "filename": "coleridge_laws_malta_1805.pdf",
    },

    # === CONSTITUTIONS ===
    {
        "id": "malta_independence_order",
        "title": "Malta Independence Order 1964",
        "title_en": "Malta Independence Order 1964 — Original Gazette",
        "year": 1964,
        "era": "Independence",
        "language": "en",
        "type": "Constitution",
        "description": "The original Malta Independence Order as published in the Government Gazette. The founding constitutional document of independent Malta.",
        "source": "legislation.mt",
        "url": "https://legislation.mt/MediaCenter/PDFs/ORD/MaltaIndependenceOrder1964.pdf",
        "filename": "malta_independence_order_1964.pdf",
    },
    {
        "id": "constitution_wipo",
        "title": "Constitution of Malta (WIPO Edition)",
        "title_en": "Constitution of Malta — WIPO Consolidated Edition",
        "year": 1964,
        "era": "Independence",
        "language": "en",
        "type": "Constitution",
        "description": "Consolidated text of the Constitution of Malta as maintained by WIPO.",
        "source": "WIPO",
        "url": "https://www.wipo.int/edocs/lexdocs/laws/en/mt/mt010en.pdf",
        "filename": "constitution_malta_wipo.pdf",
    },

    # === COLONIAL REPORTS ===
    {
        "id": "colonial_reports_1913",
        "title": "Colonial Reports Annual — Malta 1913-1915",
        "title_en": "Colonial Reports Annual: Malta 1913-1915",
        "year": 1915,
        "era": "British Colonial",
        "language": "en",
        "type": "Report",
        "description": "British Colonial Office annual reports on Malta covering governance, laws, and administration during 1913-1915.",
        "source": "Archive.org",
        "url": "https://archive.org/download/colonial-reports-annual-1913-15/colonial-reports-annual-1913-15.pdf",
        "filename": "colonial_reports_malta_1913_15.pdf",
    },

    # === ACADEMIC / LEGAL HISTORY ===
    {
        "id": "de_rohan_reggimento",
        "title": "De Rohan's Reggimento di Malta",
        "title_en": "De Rohan's Government of Malta — Academic Study",
        "year": 1789,
        "era": "Knights of St John",
        "language": "en",
        "type": "Academic",
        "description": "Academic study of De Rohan's administrative and legal reforms in Malta, from the University of Malta repository.",
        "source": "University of Malta OAR",
        "url": "https://www.um.edu.mt/library/oar/bitstream/123456789/24850/1/De%20Rohan's%20Reggimento%20di%20Malta...pdf",
        "filename": "de_rohan_reggimento_malta.pdf",
    },
    {
        "id": "malta_quarantine_laws",
        "title": "Malta Quarantine Laws 1903",
        "title_en": "Quarantine Regulations of Malta, 1903",
        "year": 1903,
        "era": "British Colonial",
        "language": "en",
        "type": "Regulation",
        "description": "Quarantine laws and regulations in force in Malta during the early 1900s.",
        "source": "JSTOR / Archive.org",
        "url": "https://archive.org/download/jstor-4548682/jstor-4548682.pdf",
        "filename": "malta_quarantine_laws_1903.pdf",
    },
]


def download_pdf(url, dest):
    """Download a PDF via urllib with proper headers."""
    if os.path.exists(dest) and os.path.getsize(dest) > 5000:
        return True

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/pdf,*/*",
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        resp = urllib.request.urlopen(req, timeout=60)
        data = resp.read()
        if len(data) > 1000:
            with open(dest, "wb") as f:
                f.write(data)
            return True
    except Exception as e:
        print(f"    Error: {e}")
    return False


def main():
    print("=" * 60)
    print("  Tizzju — Historical Law Downloader")
    print("  Powered by Rark Musso")
    print("=" * 60)

    downloaded = 0
    skipped = 0
    failed = 0
    results = []

    for doc in DOCUMENTS:
        dest = os.path.join(HIST_DIR, doc["filename"])
        print(f"\n  {doc['title_en']} ({doc['year']})")
        print(f"    Source: {doc['source']}")

        if os.path.exists(dest) and os.path.getsize(dest) > 5000:
            size_kb = os.path.getsize(dest) // 1024
            print(f"    Already downloaded ({size_kb}KB)")
            skipped += 1
            doc["local_file"] = doc["filename"]
            doc["size_kb"] = size_kb
            results.append(doc)
            continue

        ok = download_pdf(doc["url"], dest)
        if ok and os.path.exists(dest):
            size_kb = os.path.getsize(dest) // 1024
            print(f"    Downloaded: {size_kb}KB")
            downloaded += 1
            doc["local_file"] = doc["filename"]
            doc["size_kb"] = size_kb
            results.append(doc)
        else:
            print(f"    FAILED")
            failed += 1
            # Still add to index without local_file
            results.append(doc)

    # Save index
    index_path = os.path.join(FRONTEND_DATA, "historical_laws.json")
    with open(index_path, "w") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    # Also save to backend data
    with open(os.path.join(DATA_DIR, "historical_laws.json"), "w") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n{'=' * 60}")
    print(f"  Downloaded: {downloaded}")
    print(f"  Skipped: {skipped}")
    print(f"  Failed: {failed}")
    print(f"  Total docs: {len(results)}")
    print(f"  Saved to: {HIST_DIR}")
    print(f"  Index: {index_path}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
