"use client";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Scale, ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, User, Calendar } from "lucide-react";
import { useLanguage } from "@/lib/useLanguage";
import { getJudgments, type Judgment } from "@/lib/api";
import Nav from "@/components/Nav";
import Link from "next/link";

const L = {
  mt: {
    title: "Sentenzi tal-Qorti",
    sub: "Fittex u esplora s-sentenzi tal-qrati Maltin — sortabbli u filtrabbli",
    search: "Fittex referenza, partijiet, imħallef...",
    back: "← Lura / Back",
    loading: "Qed jgħabbi...",
    noResults: "L-ebda riżultat.",
    showing: "Qed juri",
    of: "minn",
    results: "riżultati",
    col_date: "Data",
    col_ref: "Referenza",
    col_court: "Qorti",
    col_judge: "Imħallef",
    col_parties: "Partijiet",
    allCourts: "Il-Qorti kollha",
    allYears: "Is-Sena kollha",
  },
  en: {
    title: "Court Judgments",
    sub: "Search and explore Maltese court judgments — sortable and filterable",
    search: "Search reference, parties, judge...",
    back: "← Back",
    loading: "Loading...",
    noResults: "No results.",
    showing: "Showing",
    of: "of",
    results: "results",
    col_date: "Date",
    col_ref: "Reference",
    col_court: "Court",
    col_judge: "Judge",
    col_parties: "Parties",
    allCourts: "All Courts",
    allYears: "All Years",
  },
};

type SortKey = "date" | "reference" | "court" | "judge" | "parties";

function SortIcon({ active, asc }: { active: boolean; asc: boolean }) {
  if (!active) return <ArrowUpDown size={11} className="text-[#ccc]" />;
  return asc ? <ArrowUp size={11} className="text-gold" /> : <ArrowDown size={11} className="text-gold" />;
}

export default function JudgmentsPage() {
  const [lang] = useLanguage();
  const [q, setQ] = useState("");
  const [court, setCourt] = useState("All");
  const [year, setYear] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [data, setData] = useState<Judgment[]>([]);
  const [loading, setLoading] = useState(true);
  const t = L[lang];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const results = await getJudgments();
      if (!cancelled) { setData(results); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  // Derive unique courts and years from data
  const courts = useMemo(() => {
    const set = new Set<string>();
    data.forEach(j => { if (j.court) set.add(j.court); });
    return Array.from(set).sort();
  }, [data]);

  const years = useMemo(() => {
    const set = new Set<string>();
    data.forEach(j => {
      const dateStr = j.date || "";
      // Try to extract year from various date formats
      const y4 = dateStr.match(/(\d{4})/);
      if (y4) set.add(y4[1]);
    });
    return Array.from(set).sort().reverse();
  }, [data]);

  const filtered = useMemo(() => {
    let results = [...data];

    if (q.trim()) {
      const lower = q.toLowerCase();
      results = results.filter(j =>
        j.reference?.toLowerCase().includes(lower) ||
        j.parties?.toLowerCase().includes(lower) ||
        j.judge?.toLowerCase().includes(lower) ||
        j.court?.toLowerCase().includes(lower) ||
        j.outcome?.toLowerCase().includes(lower)
      );
    }
    if (court !== "All") {
      results = results.filter(j => j.court === court);
    }
    if (year !== "All") {
      results = results.filter(j => j.date?.includes(year));
    }

    results.sort((a, b) => {
      // Date sort: parse DD/MM/YYYY to ISO for correct ordering
      if (sortKey === "date") {
        const parse = (s: string) => {
          const m = (s || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          return m ? `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}` : "";
        };
        const va = parse(a.date || "");
        const vb = parse(b.date || "");
        return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
      }
      const va = (a[sortKey] || "").toLowerCase();
      const vb = (b[sortKey] || "").toLowerCase();
      return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

    return results;
  }, [data, q, court, year, sortKey, sortAsc]);

  return (
    <div className="min-h-screen bg-cream text-[#1a1a2e]">
      <Nav />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/" className="text-sm text-[#9ca3af] hover:text-[#6b7280] mb-6 inline-block">{t.back}</Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gold/10 border border-gold/20">
              <Scale size={22} className="text-gold" />
            </div>
            <h1 className="text-3xl font-display font-bold text-[#1a1a2e]">{t.title}</h1>
          </div>
          <p className="text-[#9ca3af] text-sm mb-6 ml-14">{t.sub}</p>

          {/* Search + Filters */}
          <div className="bg-white border border-[#e5e0d5] rounded-2xl shadow-sm p-4 mb-4">
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search}
                  className="w-full pl-10 pr-4 py-2.5 bg-cream border border-[#e5e0d5] rounded-xl text-sm
                             focus:outline-none focus:border-gold/50 placeholder:text-[#9ca3af] text-[#1a1a2e]" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-[#9ca3af]">{t.col_court}:</label>
                <select value={court} onChange={(e) => setCourt(e.target.value)}
                  className="text-xs bg-white border border-[#e5e0d5] rounded-lg px-2 py-1.5 text-[#6b7280] focus:outline-none focus:border-gold/50">
                  <option value="All">{t.allCourts}</option>
                  {courts.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-[#9ca3af]">{t.col_date}:</label>
                <select value={year} onChange={(e) => setYear(e.target.value)}
                  className="text-xs bg-white border border-[#e5e0d5] rounded-lg px-2 py-1.5 text-[#6b7280] focus:outline-none focus:border-gold/50">
                  <option value="All">{t.allYears}</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          </div>

          {!loading && data.length > 0 && (
            <p className="text-xs text-[#9ca3af] mb-2 px-1">
              {t.showing} {filtered.length} {t.of} {data.length} {t.results}
            </p>
          )}

          {/* Table */}
          {loading ? (
            <p className="text-[#9ca3af] text-sm py-8">{t.loading}</p>
          ) : filtered.length === 0 ? (
            <p className="text-[#9ca3af] text-sm py-8">{t.noResults}</p>
          ) : (
            <div className="bg-white border border-[#e5e0d5] rounded-2xl shadow-sm overflow-hidden">
              {/* Desktop header */}
              <div className="hidden md:grid grid-cols-[85px_110px_150px_140px_1fr_24px] gap-2 px-4 py-3 border-b border-[#e5e0d5] bg-[#f9f7f3] text-xs font-semibold text-[#6b7280]">
                <button onClick={() => toggleSort("date")} className="flex items-center gap-1 hover:text-[#1a1a2e] transition-colors">
                  {t.col_date} <SortIcon active={sortKey === "date"} asc={sortAsc} />
                </button>
                <button onClick={() => toggleSort("reference")} className="flex items-center gap-1 hover:text-[#1a1a2e] transition-colors">
                  {t.col_ref} <SortIcon active={sortKey === "reference"} asc={sortAsc} />
                </button>
                <button onClick={() => toggleSort("court")} className="flex items-center gap-1 hover:text-[#1a1a2e] transition-colors">
                  {t.col_court} <SortIcon active={sortKey === "court"} asc={sortAsc} />
                </button>
                <button onClick={() => toggleSort("judge")} className="flex items-center gap-1 hover:text-[#1a1a2e] transition-colors">
                  {t.col_judge} <SortIcon active={sortKey === "judge"} asc={sortAsc} />
                </button>
                <button onClick={() => toggleSort("parties")} className="flex items-center gap-1 hover:text-[#1a1a2e] transition-colors">
                  {t.col_parties} <SortIcon active={sortKey === "parties"} asc={sortAsc} />
                </button>
                <span></span>
              </div>

              <div className="divide-y divide-[#e5e0d5]/50">
                {filtered.slice(0, 500).map((j, i) => (
                  <Link
                    key={`${j.reference}-${i}`}
                    href={`/detail?type=judgment&id=${encodeURIComponent(j.reference)}`}
                    className="group block md:grid md:grid-cols-[85px_110px_150px_140px_1fr_24px] md:gap-2 md:items-center px-4 py-3 hover:bg-gold/5 transition-colors"
                  >
                    {/* Mobile layout */}
                    <div className="flex items-start justify-between gap-2 md:contents">
                      <div className="flex-1 min-w-0 md:contents">
                        <div className="flex items-center gap-2 flex-wrap md:contents">
                          <span className="text-[10px] font-mono text-[#9ca3af] md:block">{j.date || "—"}</span>
                          <span className="text-xs font-mono text-gold font-semibold md:truncate md:block">{j.reference}</span>
                        </div>
                        <p className="text-sm text-[#6b7280] group-hover:text-[#1a1a2e] transition-colors mt-0.5 md:truncate">{j.parties}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap md:contents">
                          <span className="text-[10px] text-[#9ca3af] md:truncate md:block">{j.court || "—"}</span>
                          <span className="text-[10px] text-[#9ca3af] md:truncate md:block hidden md:block">{j.judge || "—"}</span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-[#9ca3af] group-hover:text-gold transition-colors shrink-0 mt-1" />
                    </div>
                  </Link>
                ))}
                {filtered.length > 500 && (
                  <div className="px-4 py-3 text-xs text-[#9ca3af] text-center">
                    {lang === "mt" ? `Qed juri l-ewwel 500 minn ${filtered.length}. Uża l-filtri biex issib aktar.` : `Showing first 500 of ${filtered.length}. Use filters to narrow down.`}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>

        <div className="py-10 mt-10 text-center text-xs text-[#9ca3af] border-t border-[#e5e0d5]">
          <p>Tizzju — Powered by Rark Musso</p>
        </div>
      </div>
    </div>
  );
}
