"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Scale, ExternalLink, ChevronLeft, ChevronRight, FileText, AlertCircle, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Judgment {
  reference: string;
  court: string;
  judge: string;
  parties: string;
  date: string;
  outcome: string;
  source_url: string;
}

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
    error: "Ma setgħetx tintlaħaq is-servizz. Ipprova aktar tard.",
    page: "Paġna",
    of: "minn",
    prev: "Preċedenti",
    next: "Li Jmiss",
    results: "riżultati",
    back: "← Lura / Back",
    filterCourt: "Il-Qorti kollha",
    filterYear: "Is-Sena kollha",
    nav: {
      laws: "Liġijiet",
      judgments: "Sentenzi",
      lawyers: "Avukati",
      documents: "Dokumenti",
      igaming: "iGaming",
      calendar: "Kalendarju",
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
    error: "Could not reach the service. Please try again later.",
    page: "Page",
    of: "of",
    prev: "Previous",
    next: "Next",
    results: "results",
    back: "← Lura / Back",
    filterCourt: "All Courts",
    filterYear: "All Years",
    nav: {
      laws: "Laws",
      judgments: "Judgments",
      lawyers: "Lawyers",
      documents: "Documents",
      igaming: "iGaming",
      calendar: "Calendar",
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

type Status = "idle" | "loading" | "success" | "error" | "empty";

export default function JudgmentsPage() {
  const [lang, setLang] = useLanguage();
  const [query, setQuery] = useState("");
  const [draftQuery, setDraftQuery] = useState("");
  const [court, setCourt] = useState("All");
  const [year, setYear] = useState("All");
  const [judgments, setJudgments] = useState<Judgment[]>([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<Status>("idle");
  const t = LABELS[lang];

  const fetchJudgments = useCallback(async (q: string, pg: number, courtFilter: string, yearFilter: string) => {
    setStatus("loading");
    try {
      const params: Record<string, string | number> = { page: pg };
      if (q.trim()) params.q = q.trim();
      if (courtFilter !== "All") params.court = courtFilter;
      if (yearFilter !== "All") params.year = yearFilter;

      const res = await axios.get<Judgment[]>(`${API}/api/judgments/`, { params, timeout: 8000 });
      const data = res.data;
      if (!data || data.length === 0) {
        setJudgments([]);
        setStatus("empty");
      } else {
        setJudgments(data);
        setStatus("success");
      }
    } catch {
      setJudgments([]);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    fetchJudgments("", 1, "All", "All");
  }, [fetchJudgments]);

  const handleSearch = () => {
    setQuery(draftQuery);
    setPage(1);
    fetchJudgments(draftQuery, 1, court, year);
  };

  const handleFilterChange = (newCourt: string, newYear: string) => {
    setCourt(newCourt);
    setYear(newYear);
    setPage(1);
    fetchJudgments(query, 1, newCourt, newYear);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchJudgments(query, newPage, court, year);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
              <span className="text-gold">Lex</span>Malta
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
                value={draftQuery}
                onChange={(e) => setDraftQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder={t.placeholder}
                className="w-full pl-10 pr-4 py-3 bg-white border border-[#e5e0d5] rounded-xl
                           focus:outline-none focus:border-[#b8963a]/50 text-[#1a1a2e]
                           placeholder:text-[#9ca3af] text-sm transition-all"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={status === "loading"}
              className="px-5 py-3 bg-[#b8963a] text-white rounded-xl font-semibold
                         hover:bg-[#a07828] transition-colors disabled:opacity-50 text-sm
                         flex items-center gap-2 shrink-0"
            >
              {status === "loading" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Search size={15} />
              )}
              {t.search}
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-[#e5e0d5]">
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#9ca3af] font-medium shrink-0">{t.court}:</label>
              <select
                value={court}
                onChange={(e) => handleFilterChange(e.target.value, year)}
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
                onChange={(e) => handleFilterChange(court, e.target.value)}
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

        {/* Results Count */}
        {status === "success" && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-[#9ca3af] mb-4 px-1"
          >
            {judgments.length} {t.results} · {t.page} {page}
          </motion.p>
        )}

        {/* Status States */}
        <AnimatePresence mode="wait">
          {status === "loading" && (
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

          {status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-white border border-[#e5e0d5] rounded-2xl shadow-sm p-10 text-center"
            >
              <AlertCircle size={36} className="text-[#9ca3af] mx-auto mb-3" />
              <p className="text-[#6b7280] text-sm">{t.error}</p>
              <button
                onClick={() => fetchJudgments(query, page, court, year)}
                className="mt-4 px-4 py-2 bg-[#b8963a] text-white rounded-xl font-semibold
                           hover:bg-[#a07828] text-sm transition-colors"
              >
                {t.search}
              </button>
            </motion.div>
          )}

          {status === "empty" && (
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

          {status === "success" && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              {judgments.map((j, i) => (
                <motion.div
                  key={`${j.reference}-${i}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  className="bg-white border border-[#e5e0d5] rounded-2xl shadow-sm p-5
                             hover:border-gold/30 hover:shadow-md transition-all group"
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
                        <p className="text-[#1a1a2e] font-semibold text-base mb-1.5 leading-snug truncate">
                          {j.parties}
                        </p>
                      )}

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6b7280]">
                        {j.court && (
                          <span className="flex items-center gap-1">
                            <Scale size={11} className="text-[#9ca3af]" />
                            {j.court}
                          </span>
                        )}
                        {j.judge && (
                          <span className="flex items-center gap-1">
                            <span className="text-[#9ca3af]">·</span>
                            {t.judge}: {j.judge}
                          </span>
                        )}
                        {j.date && (
                          <span className="flex items-center gap-1">
                            <span className="text-[#9ca3af]">·</span>
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
              ))}

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#e5e0d5]">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#e5e0d5]
                             text-sm text-[#6b7280] hover:border-gold/40 hover:text-[#1a1a2e]
                             disabled:opacity-40 disabled:cursor-not-allowed transition-all bg-white"
                >
                  <ChevronLeft size={14} />
                  {t.prev}
                </button>
                <span className="text-sm text-[#9ca3af]">
                  {t.page} {page}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={judgments.length < 20}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#e5e0d5]
                             text-sm text-[#6b7280] hover:border-gold/40 hover:text-[#1a1a2e]
                             disabled:opacity-40 disabled:cursor-not-allowed transition-all bg-white"
                >
                  {t.next}
                  <ChevronRight size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="py-10 text-center text-xs text-[#9ca3af] border-t border-[#e5e0d5] mt-10">
          <p>LexMalta — Powered by Rark Musso</p>
        </div>
      </div>
    </div>
  );
}
