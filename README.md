# LexMalta — Il-Liġi Maltija Miftuħa għal Kulħadd

> **Free. Forever. Powered by Rark Musso.**

The definitive open-source Maltese legal intelligence platform. Built for lawyers, law students, businesses, and citizens. Everything lex.mt has — and much more — at zero cost.

---

## What It Does

- **Search** 77,000+ court judgments, 500+ law chapters, EU law, and 15+ regulatory bodies in plain Maltese or English
- **Every answer is cited** — every claim links to the real source document
- **View PDFs & DOCX** inline in the browser
- **Draft legal documents** — contracts, opinions, letters in Maltese or English, downloaded as DOCX
- **Build a case** — multi-section legal argument tool with full citations exported to DOCX
- **Lawyer profiles** — full database of warranted advocates, legal procurators, and notaries, cross-referenced with their court cases
- **Law firms** — directory of all Malta law firms with practice areas and team members
- **Alerts** — get emailed when new judgments or laws match your keywords
- **Matter management** — save research per case/matter
- **6 sector modes** — Legal, Tax, Maritime, Planning, AML/Compliance, Fintech
- **Smart suggestions** — autocomplete, trending searches, daily feed, follow-up questions
- **Settings** — language, practice areas, alert frequency, display preferences
- **24/7 data refresh** — scrapers run automatically, data is always fresh

---

## Data Sources

### Maltese Law
| Source | Coverage |
|--------|----------|
| legislation.mt | All 500+ chapters of the Laws of Malta |
| eCourts.gov.mt | All judgments 1944 – present (77,000+) |
| National Archives Malta | Pre-1944 historical legal records |
| Government Gazette | Legal notices, new legislation |
| Parliament of Malta | Acts, bills, Hansard debates |

### Regulatory Bodies
| Body | Coverage |
|------|----------|
| FIAU | AML/CFT implementing procedures |
| MFSA | Financial services regulations & circulars |
| MGA | Gaming law & guidance |
| MCCAA | Consumer affairs & competition |
| OHSA | Occupational health & safety |
| ERA | Employment relations |
| IDPC | Data protection (GDPR Malta rulings) |
| CFR | Tax rulings & VAT guidance |
| Transport Malta | Aviation, maritime, road legislation |
| MBR | Business registry & company law |
| Planning Authority | Planning decisions & policies |
| Parliament | Hansard, bills, acts |

### EU & International Law
| Source | Coverage |
|--------|----------|
| EUR-Lex | EU regulations, directives relevant to Malta |
| CJEU | Court of Justice of the EU decisions |
| ECtHR | European Court of Human Rights — Malta cases |
| Council of Europe | Conventions Malta has signed |
| IMO | Maritime conventions (Malta is a flag state) |
| UN Treaties | Treaties Malta has ratified |
| WorldLII Malta | Aggregated international case law |

### Legal News (Real-Time)
- Times of Malta
- Malta Today
- The Malta Independent
- The Shift News
- Business Today Malta
- MaltaLegal.com

---

## Architecture

```
Scrapers (Python) → PostgreSQL + pgvector → RAG Pipeline → Claude API → Next.js UI
```

**Cost-saving design:**
- Embeddings: `sentence-transformers` (free, local — zero cost)
- Search: hybrid BM25 + vector (no LLM calls)
- Claude: only called when a user asks a question
- Model routing: Haiku for simple queries, Sonnet for complex legal reasoning
- Redis cache: same question = zero Claude cost on repeat
- Rate limiting: 20 queries/day anonymous, 200 registered

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12, FastAPI |
| Database | PostgreSQL 16 + pgvector |
| Cache | Redis 7 |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) |
| AI | Anthropic Claude (Haiku + Sonnet) |
| Frontend | Next.js 14, Tailwind CSS, Framer Motion |
| Scrapers | httpx, BeautifulSoup4 |
| Scheduler | APScheduler (24/7) |
| Deployment | GitHub Pages (frontend) + Railway (backend) |

---

## Getting Started

### Prerequisites
- Python 3.12+
- Node.js 18+
- Docker (for PostgreSQL + Redis)
- Anthropic API key

### 1. Clone

```bash
git clone https://github.com/rurkmasso/law4friendsnotmoney.git
cd law4friendsnotmoney
```

### 2. Backend

```bash
cd backend
cp ../.env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

pip install -r requirements.txt

# Start database + redis
docker-compose up postgres redis -d

# Run server
uvicorn main:app --reload
```

### 3. Populate the database

```bash
# Full ingest (takes a while — millions of documents)
python scripts/ingest_all.py

# Or by source
python scripts/ingest_all.py --source news
python scripts/ingest_all.py --source legislation
python scripts/ingest_all.py --source ecourts
python scripts/ingest_all.py --source lawyers

# Cross-reference lawyers ↔ cases ↔ laws
python scripts/cross_reference.py

# Start 24/7 scheduler (keeps data fresh)
python scripts/scheduler.py
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## Scripts Reference

| Script | What it does | When to run |
|--------|-------------|-------------|
| `scripts/ingest_all.py` | Full database population | First time setup |
| `scripts/ingest_all.py --source X` | Single source ingest | Selective refresh |
| `scripts/cross_reference.py` | Link lawyers ↔ cases ↔ laws | After ingest |
| `scripts/scheduler.py` | 24/7 continuous scraping | Production |

---

## API Reference

```
POST /api/search/          — AI search (MT/EN, with citations)
GET  /api/laws/            — List/search all laws
GET  /api/laws/{chapter}   — Full law with related cases
GET  /api/judgments/       — List/search judgments (filters: court, judge, date)
GET  /api/judgments/{ref}  — Full judgment with cited laws & cases
GET  /api/lawyers/         — List/search warranted lawyers
GET  /api/lawyers/{warrant}— Full lawyer profile + case history
POST /api/draft/           — Generate DOCX legal document
GET  /api/draft/templates  — List available document templates
POST /api/matter/          — Create matter workspace
POST /api/alerts/          — Set up keyword email alert
GET  /api/suggestions/autocomplete — Search autocomplete
GET  /api/suggestions/trending     — Today's top searches
GET  /api/suggestions/daily-feed   — New judgments & docs today
GET  /api/documents/proxy-pdf      — Inline PDF proxy (CORS fix)
POST /api/scrape/run       — Trigger manual scrape (admin)
```

---

## Deployment

### Frontend → GitHub Pages

```bash
cd frontend
npm run build
# Push to main — GitHub Actions deploys automatically
```

### Backend → Railway

1. Connect `rurkmasso/law4friendsnotmoney` on [railway.app](https://railway.app)
2. Set root to `backend`
3. Add PostgreSQL + Redis plugins
4. Set environment variables:
   - `ANTHROPIC_API_KEY`
   - `DATABASE_URL` (auto-set by Railway)
   - `REDIS_URL` (auto-set by Railway)

---

## Why This Exists

lex.mt charges up to €1,499/month for access to public law.

**Public law belongs to everyone.**

This platform gives every Maltese citizen, law student, small business, and lawyer free access to the complete body of Maltese, EU, and international law — with AI-powered research, document drafting, and real-time updates.

---

## Contributing

PRs welcome. If you find a missing data source, a broken scraper, or a wrong legal reference — open an issue or submit a fix.

```bash
git checkout -b your-feature
# make changes
git push origin your-feature
# open PR
```

---

## Disclaimer

LexMalta is a legal research tool. Responses are for information only and do not constitute legal advice. Always consult a warranted advocate for legal matters.

*Dan is għar-riċerka legali biss. Mhux parir legali.*

---

**Powered by Rark Musso** · [github.com/rurkmasso/law4friendsnotmoney](https://github.com/rurkmasso/law4friendsnotmoney)
