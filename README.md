# Ligi4Friends — Il-Liġi Maltija Miftuħa għal Kulħadd

> **Free. Forever. Powered by Rark Musso.**

The definitive open-source Maltese legal intelligence platform. Built for lawyers, law students, businesses, and citizens — at zero cost.

**Live:** [rurkmasso.github.io/ligi4friends](https://rurkmasso.github.io/ligi4friends)

---

## What It Does

- **Search** 77,000+ court judgments, 500+ law chapters, and regulatory documents in plain Maltese or English
- **Every answer is cited** — every claim links to the real source document
- **Detail pages** — click any law, judgment, or lawyer to see full metadata, PDFs, relationships, and timeline
- **View PDFs** inline — English and Maltese versions of every law from legislation.mt
- **Draft legal documents** — contracts, opinions, letters in Maltese or English, downloaded as DOCX
- **Build a case** — multi-section legal argument tool with full citations exported to DOCX
- **Lawyer profiles** — full database of warranted advocates, legal procurators, and notaries with case history
- **Law firms** — directory of Malta law firms with practice areas
- **Court calendar** — see what's happening in court every day
- **Sortable & filterable tables** — every list can be sorted by any field and filtered
- **Alerts** — get notified when new judgments or laws match your keywords
- **Matter management** — save research per case/matter
- **Bilingual** — full Maltese and English interface
- **Works offline** — static data loads from JSON, no backend required
- **iGaming** — dedicated section for Malta Gaming Authority regulations

---

## Data Sources

### Maltese Law
| Source | Coverage |
|--------|----------|
| legislation.mt | All 654+ chapters of the Laws of Malta (1,005 PDFs downloaded locally) |
| eCourts.gov.mt | Court judgments 1944 – present (77,000+ target, scraping by court) |
| lawyersregister.gov.mt | All warranted legal professionals |

### Regulatory Bodies
| Body | Coverage |
|------|----------|
| FIAU | AML/CFT implementing procedures |
| MFSA | Financial services regulations & circulars |
| MGA | Gaming law & guidance |
| MCCAA | Consumer affairs & competition |
| IDPC | Data protection (GDPR Malta rulings) |
| CFR | Tax rulings & VAT guidance |
| Transport Malta | Aviation, maritime, road legislation |

### EU & International Law
| Source | Coverage |
|--------|----------|
| EUR-Lex | EU regulations, directives relevant to Malta |
| CJEU | Court of Justice of the EU decisions |
| ECtHR | European Court of Human Rights — Malta cases |

---

## Architecture

```
Static JSON Data → Next.js UI (GitHub Pages) — works without backend
                ↕
Scrapers (Playwright) → PostgreSQL + pgvector → FastAPI → AI features (optional)
```

**Cost: $0/month.** Everything runs on free tiers:
- Frontend: GitHub Pages (free)
- Data: Static JSON files served alongside the frontend
- Backend: Render free tier (optional, for AI search)
- No paid API keys required

### How Data Flows

1. **Scrapers** (Playwright, non-headless) visit legislation.mt, ecourts.gov.mt, lawyersregister.gov.mt
2. Data saved to `backend/data/*.json` AND `frontend/public/data/*.json`
3. Next.js static export builds with the JSON data baked in
4. GitHub Actions deploys to Pages on every push to `main`
5. Frontend loads static JSON first, falls back to live API if backend is running

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (static export), Tailwind CSS, Framer Motion |
| Data | Static JSON (legislation, judgments, lawyers, firms) |
| Backend (optional) | Python 3.12, FastAPI |
| Database (optional) | PostgreSQL 16 + pgvector |
| Scrapers | Playwright (bypasses Cloudflare), BeautifulSoup4 |
| Deployment | GitHub Pages (frontend) + Render (backend) |
| CI/CD | GitHub Actions |

---

## Getting Started

### Prerequisites
- Node.js 18+ (frontend)
- Python 3.12+ (scrapers/backend)

### 1. Clone

```bash
git clone https://github.com/rurkmasso/ligi4friends.git
cd ligi4friends
```

### 2. Frontend (works immediately with existing data)

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
# → http://localhost:3000
```

### 3. Refresh Data (optional — run scrapers)

```bash
cd backend
pip install playwright beautifulsoup4 lxml
playwright install chromium

# Scrape everything (opens a browser window)
python scripts/scrape_all_data.py

# Or scrape selectively
python scripts/scrape_all_data.py --source laws      # legislation.mt
python scripts/scrape_all_data.py --source ecourts    # court judgments
python scripts/scrape_all_data.py --source lawyers    # lawyer register

# Scrape detailed law metadata + PDF links
python scripts/scrape_law_details.py
python scripts/scrape_law_details.py --limit 10       # test with 10
python scripts/scrape_law_details.py --resume          # resume from checkpoint

# Scrape historical judgments
python scripts/scrape_all_data.py --source ecourts --from 1960 --to 2019

# Enhanced lawyer scraper (extracts from judgments + online sources)
python scripts/scrape_lawyers_enhanced.py

# Regulatory documents (FIAU, MFSA, MGA, IDPC, CFR)
python scripts/scrape_regulatory_docs.py
```

### 4. Backend API (optional — for AI search)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
# → http://localhost:8000/docs
```

---

## Scripts Reference

| Script | What it does |
|--------|-------------|
| `scripts/scrape_all_data.py` | Master scraper — laws, judgments, lawyers |
| `scripts/scrape_all_data.py --source laws` | Scrape all 654+ law chapters from legislation.mt |
| `scripts/scrape_all_data.py --source ecourts` | Scrape eCourts judgments by date range |
| `scripts/scrape_all_data.py --source lawyers` | Scrape lawyer register + law firms |
| `scripts/scrape_law_details.py` | Enhanced scraper — metadata, PDF links, ELI, keywords, timeline |
| `scripts/scrape_law_details.py --resume` | Resume from last checkpoint |
| `scripts/scrape_ecourts_full.py` | Full eCourts scraper — all 77K+ judgments, by court, with resume |
| `scripts/scrape_ecourts_full.py --resume` | Resume from last checkpoint |
| `scripts/download_pdfs_v3.py` | Download all law PDFs (EN + MT) from legislation.mt |
| `scripts/scrape_lawyers_enhanced.py` | Extract lawyers from judgments + Chamber of Advocates + register |
| `scripts/scrape_regulatory_docs.py` | Scrape FIAU, MFSA, MGA, IDPC, CFR regulatory documents |
| `scripts/scrape_regulatory_docs.py --source fiau` | Scrape just FIAU |

---

## Pages

| Route | What it shows |
|-------|-------------|
| `/` | Homepage with search, stats, feature grid |
| `/laws` | All 654+ law chapters (sortable, filterable, links to detail) |
| `/judgments` | Court judgments (sortable by date/court/judge/parties) |
| `/lawyers` | Lawyer directory (sortable by name/cases/firm, filterable by profession) |
| `/detail?type=law&id=Kap.+1` | Law detail — metadata, PDF viewer, relationships |
| `/detail?type=judgment&id=REF` | Judgment detail — parties, court, judge, outcome |
| `/detail?type=lawyer&id=WN` | Lawyer detail — profile, stats, practice areas |
| `/documents` | Regulatory documents (FIAU, MFSA, MGA, etc.) |
| `/igaming` | iGaming/MGA dedicated section |
| `/draft` | Legal document drafting (DOCX export) |
| `/case-builder` | Build legal arguments with citations |
| `/calendar` | Court calendar |
| `/alerts` | Keyword alerts for new judgments/laws |
| `/matter` | Matter/case management workspace |
| `/view?url=...` | Inline PDF/DOCX viewer |

---

## API Reference

```
POST /api/search/              — AI search (MT/EN, with citations)
GET  /api/laws/                — List/search all laws
GET  /api/laws/summary/{ch}    — AI overview of a law
GET  /api/laws/{chapter}       — Full law with related cases
GET  /api/judgments/            — List/search judgments (filters: court, judge, date)
GET  /api/judgments/summary/{r} — AI overview of a judgment
GET  /api/judgments/{ref}      — Full judgment with cited laws & cases
GET  /api/lawyers/             — List/search warranted lawyers
GET  /api/lawyers/summary/{wn} — AI overview of a lawyer profile
GET  /api/lawyers/{warrant}    — Full lawyer profile + case history
POST /api/draft/               — Generate DOCX legal document
GET  /api/draft/templates      — List available document templates
POST /api/matter/              — Create matter workspace
POST /api/alerts/              — Set up keyword email alert
GET  /api/suggestions/autocomplete — Search autocomplete
GET  /api/suggestions/trending     — Today's top searches
GET  /api/documents/proxy-pdf      — Inline PDF proxy (CORS fix)
POST /api/scrape/run           — Trigger manual scrape (admin)
```

---

## Deployment

### Frontend → GitHub Pages (automatic)

Push to `main` → GitHub Actions builds Next.js → deploys to Pages.

```bash
git add -A && git commit -m "Update" && git push
```

### Backend → Render (optional)

1. Connect repo on [render.com](https://render.com)
2. Root directory: `backend`
3. Build: `pip install -r requirements-render.txt`
4. Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`

---

## Why This Exists

Some providers charge up to **€1,499/month** for access to public law.

**Public law belongs to everyone.**

This platform gives every Maltese citizen, law student, small business, and lawyer free access to the complete body of Maltese law — with search, document drafting, and real-time updates.

---

## Contributing

PRs welcome. If you find a missing data source, a broken scraper, or a wrong legal reference — open an issue or submit a fix.

---

## Disclaimer

Ligi4Friends is a legal research tool. Responses are for information only and do not constitute legal advice. Always consult a warranted advocate for legal matters.

*Dan is għar-riċerka legali biss. Mhux parir legali.*

---

**Powered by Rark Musso** · [github.com/rurkmasso/ligi4friends](https://github.com/rurkmasso/ligi4friends)
