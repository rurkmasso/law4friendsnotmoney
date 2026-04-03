"use client";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Scale, ExternalLink, FileText, Loader2, ArrowUpDown } from "lucide-react";
import { useLanguage } from "@/lib/useLanguage";
import { getJudgments, type Judgment } from "@/lib/api";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const LABELS = {
  mt: {
    title: "Sentenzi tal-Qorti",
    subtitle: "Fittex u esplora s-sentenzi tal-qrati Maltin",
    placeholder: "Fittex referenza, partijiet, imħallef...",
    search: "Fittex",
    reference: "Referenza",
    court: "Qorti",
    judge: "Imħallef",
    parties: "Partijiet",
    date: "Data",
    outcome: "Riżultat",
    viewSource: "Ara s-Sors",
    noResults: "L-ebda sentenza ma nstabet. Ipprova termini differenti.",
    connecting: "Qed jingħaqad mal-backend...",
    results: "riżultati",
    back: "← Lura / Back",
    filterCourt: "Il-Qorti kollha",
    filterYear: "Is-Sena kollha",
    showing: "Qed juri",
    of: "minn",
    backendTitle: "Il-backend qed jgħabbi...",
    backendSub: "Run the backend server to see data here",
    nav: {
      laws: "Liġijiet",
      judgments: "Sentenzi",
      lawyers: "Avukati",
      documents: "Dokumenti",
      igaming: "iGaming",
    },
  },
  en: {
    title: "Court Judgments",
    subtitle: "Search and explore Maltese court judgments",
    placeholder: "Search reference, parties, judge...",
    search: "Search",
    reference: "Reference",
    court: "Court",
    judge: "Judge",
    parties: "Parties",
    date: "Date",
    outcome: "Outcome",
    viewSource: "View Source",
    noResults: "No judgments found. Try different search terms.",
    connecting: "Connecting to backend...",
    results: "results",
    back: "← Lura / Back",
    filterCourt: "All Courts",
    filterYear: "All Years",
    showing: "Showing",
    of: "of",
    backendTitle: "Backend loading...",
    backendSub: "Run the backend server to see data here",
    nav: {
      laws: "Laws",
      judgments: "Judgments",
      lawyers: "Lawyers",
      documents: "Documents",
      igaming: "iGaming",
    },
  },
};

const COURTS = [
  "All",
  "Civil Court",
  "Criminal Court",
  "Court of Appeal",
  "Constitutional Court",
  "Family Court",
  "Small Claims Tribunal",
];

const YEARS = ["All", "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016"];

export default function JudgmentsPage() {
  const [lang, setLang] = useLanguage();
  const [q, setQ] = useState("");
  const [court, setCourt] = useState("All");
  const [year, setYear] = useState("All");
  const [sortKey, setSortKey] = useState<"date" | "reference" | "court" | "judge" | "parties">("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [data, setData] = useState<Judgment[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);
  const t = LABELS[lang];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const results = await getJudgments();
        if (!cancelled) { setData(results); setFetchFailed(results.length === 0); }
      } catch {
        if (!cancelled) { setData([]); setFetchFailed(true); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let results = data;
    const lower = q.toLowerCase();
    if (q.trim()) {
      results = results.filter(
        (j) =>
          j.reference?.toLowerCase().includes(lower) ||
          j.parties?.toLowerCase().includes(lower) ||
          j.judge?.toLowerCase().includes(lower) ||
          j.court?.toLowerCase().includes(lower) ||
          j.outcome?.toLowerCase().includes(lower)
      );
    }
    if (court !== "All") {
      results = results.filter((j) => j.court?.toLowerCase().includes(court.toLowerCase()));
    }
    if (year !== "All") {
      results = results.filter((j) => j.date?.startsWith(year));
    }
    // Sort
    results.sort((a, b) => {
      const va = (a[sortKey] || "").toLowerCase();
      const vb = (b[sortKey] || "").toLowerCase();
      return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    return results;
  }, [data, q, court, year, sortKey, sortAsc]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString(lang === "mt" ? "mt-MT" : "en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const NAV_LINKS = Object.entries(t.nav);

  return (
    <div className="min-h-screen bg-cream text-[#1a1a2e]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-[#e5e0d5] shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Scale size={20} className="text-gold" />
            <span className="text-lg font-display font-bold text-[#1a1a2e]">
              <span className="text-gold">Ligi</span>4Friends
            </span>
          </Link>
          <div className="hidden lg:flex items-center gap-6 text-sm text-[#6b7280]">
            {NAV_LINKS.map(([key, label]) => (
              <Link
                key={key}
                href={`/${key}`}
                className={`hover:text-gold transition-colors font-medium ${key === "judgments" ? "text-gold" : ""}`}
              >
                {label}
              </Link>
            ))}
          </div>
          <button
            onClick={() => setLang(lang === "mt" ? "en" : "mt")}
            className="px-3 py-1.5 rounded-full border border-[#e5e0d5] hover:border-gold/50
                       hover:bg-gold/5 text-xs font-mono text-[#6b7280] transition-all"
          >
            {lang === "mt" ? "EN" : "MT"}
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link href="/" className="text-sm text-[#9ca3af] hover:text-[#1a1a2e] transition-colors mb-6 inline-block">
          {t.back}
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gold/10 border border-gold/20">
              <Scale size={22} className="text-gold" />
            </div>
            <h1 className="text-3xl font-display font-bold text-[#1a1a2e]">{t.title}</h1>
          </div>
          <p className="text-[#6b7280] ml-14">{t.subtitle}</p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-[#e5e0d5] rounded-2xl shadow-sm p-4 mb-4"
        >
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t.placeholder}
                className="w-full pl-10 pr-4 py-3 bg-white border border-[#e5e0d5] rounded-xl
                           focus:outline-none focus:border-[#b8963a]/50 text-[#1a1a2e]
                           placeholder:text-[#9ca3af] text-sm transition-all"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-[#e5e0d5]">
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#9ca3af] font-medium shrink-0">{t.court}:</label>
              <select
                value={court}
                onChange={(e) => setCourt(e.target.value)}
                className="text-sm bg-white border border-[#e5e0d5] rounded-lg px-3 py-1.5
                           focus:outline-none focus:border-[#b8963a]/50 text-[#1a1a2e] cursor-pointer"
              >
                {COURTS.map((c) => (
                  <option key={c} value={c}>
                    {c === "All" ? t.filterCourt : c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#9ca3af] font-medium shrink-0">{t.date}:</label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="text-sm bg-white border border-[#e5e0d5] rounded-lg px-3 py-1.5
                           focus:outline-none focus:border-[#b8963a]/50 text-[#1a1a2e] cursor-pointer"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y === "All" ? t.filterYear : y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Results Count + Sort */}
        {!loading && data.length > 0 && (
          <div className="flex items-center gap-2 mb-4 px-1 flex-wrap">
            <p className="text-xs text-[#9ca3af]">
              {t.showing} {filtered.length} {t.of} {data.length} {t.results}
            </p>
            <span className="text-xs text-[#9ca3af]">·</span>
            <span className="text-xs text-[#9ca3af]">Sort:</span>
            {(["date", "reference", "court", "judge", "parties"] as const).map((key) => (
              <button key={key} onClick={() => { if (sortKey === key) setSortAsc(!sortAsc); else { setSortKey(key); setSortAsc(true); } }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-all ${
                  sortKey === key ? "text-gold bg-gold/10 font-medium" : "text-[#9ca3af] hover:text-[#6b7280]"
                }`}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
                {sortKey === key && <ArrowUpDown size={10} />}
              </button>
            ))}
          </div>
        )}

        {/* Status States */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 gap-4"
            >
              <Loader2 size={32} className="text-gold animate-spin" />
              <p className="text-sm text-[#9ca3af]">{t.connecting}</p>
            </motion.div>
          )}

          {!loading && data.length === 0 && fetchFailed && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-white border border-[#e5e0d5] rounded-2xl shadow-sm p-10 text-center"
            >
              <Scale size={36} className="text-[#9ca3af] mx-auto mb-3" />
              <p className="text-[#1a1a2e] font-semibold mb-1">{t.backendTitle}</p>
              <p className="text-[#6b7280] text-sm mb-3">{t.backendSub}</p>
              <p className="text-xs text-[#9ca3af] font-mono">Run: python3 main.py in /backend</p>
              <p className="text-xs text-[#9ca3af] font-mono mt-1">API: {API}/api/judgments/</p>
            </motion.div>
          )}

          {!loading && data.length === 0 && !fetchFailed && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-white border border-[#e5e0d5] rounded-2xl shadow-sm p-10 text-center"
            >
              <FileText size={36} className="text-[#9ca3af] mx-auto mb-3" />
              <p className="text-[#6b7280] text-sm">{t.noResults}</p>
            </motion.div>
          )}

          {!loading && filtered.length === 0 && data.length > 0 && (
            <motion.div
              key="no-filter"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-white border border-[#e5e0d5] rounded-2xl shadow-sm p-10 text-center"
            >
              <FileText size={36} className="text-[#9ca3af] mx-auto mb-3" />
              <p className="text-[#6b7280] text-sm">{t.noResults}</p>
            </motion.div>
          )}

          {!loading && filtered.length > 0 && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              {filtered.map((j, i) => (
                <Link
                  key={`${j.reference}-${i}`}
                  href={`/detail?type=judgment&id=${encodeURIComponent(j.reference)}`}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.5), duration: 0.3 }}
                    className="bg-white border border-[#e5e0d5] rounded-2xl shadow-sm p-5
                               hover:border-gold/30 hover:shadow-md transition-all group cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Reference */}
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="font-mono text-sm font-semibold px-2.5 py-0.5 rounded-lg
                                       bg-gold/10 border border-gold/20"
                            style={{ color: "#b8963a" }}
                          >
                            {j.reference || "—"}
                          </span>
                          {j.outcome && (
                            <span className="text-xs text-[#9ca3af] bg-[#f5f3ee] px-2 py-0.5 rounded-full border border-[#e5e0d5]">
                              {j.outcome}
                            </span>
                          )}
                        </div>

                        {/* Parties */}
                        {j.parties && (
                          <p className="text-[#1a1a2e] font-semibold text-base mb-1.5 leading-snug truncate group-hover:text-gold transition-colors">
                            {j.parties}
                          </p>
                        )}

                        {/* Meta row — each data point in its own labeled field */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6b7280]">
                          {j.court && (
                            <span className="flex items-center gap-1 bg-[#f5f3ee] px-2 py-0.5 rounded">
                              <Scale size={11} className="text-[#9ca3af]" />
                              {j.court}
                            </span>
                          )}
                          {j.judge && (
                            <span className="flex items-center gap-1 bg-[#f5f3ee] px-2 py-0.5 rounded">
                              {t.judge}: {j.judge}
                            </span>
                          )}
                          {j.date && (
                            <span className="flex items-center gap-1 bg-[#f5f3ee] px-2 py-0.5 rounded">
                              {formatDate(j.date)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* External link */}
                      {j.source_url && (
                        <a
                          href={j.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 flex items-center gap-1.5 text-xs font-medium
                                     text-[#9ca3af] hover:text-gold transition-colors
                                     px-3 py-2 rounded-xl border border-[#e5e0d5]
                                     hover:border-gold/30 hover:bg-gold/5 group-hover:text-gold"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={12} />
                          {t.viewSource}
                        </a>
                      )}
                    </div>
                  </motion.div>
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="py-10 text-center text-xs text-[#9ca3af] border-t border-[#e5e0d5] mt-10">
          <p>Ligi4Friends — Powered by Rark Musso</p>
        </div>
      </div>
    </div>
  );
}
