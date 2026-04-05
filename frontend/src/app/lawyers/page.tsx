"use client";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search, Briefcase, Building2, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown,
  Scale, ChevronRight, User, FileText,
} from "lucide-react";
import { getLawyers, getJudgments, type Lawyer, type Judgment } from "@/lib/api";
import { useLanguage } from "@/lib/useLanguage";
import Nav from "@/components/Nav";
import Link from "next/link";

type SortKey = "full_name" | "case_count" | "profession" | "firm";

const PROFESSIONS = [
  { key: "all", label_mt: "Kollha", label_en: "All" },
  { key: "advocate", label_mt: "Avukat", label_en: "Advocate" },
  { key: "judge", label_mt: "Imħallef", label_en: "Judge / Magistrate" },
  { key: "procurator", label_mt: "Prokutur", label_en: "Legal Procurator" },
  { key: "notary", label_mt: "Nutar", label_en: "Notary" },
];

const L = {
  mt: {
    title: "Avukati u Professjonisti Legali",
    sub: "Reġistru sħiħ — sortabbli u filtrabbli",
    search: "Fittex isem, firma, jew professjoni...",
    back: "← Lura / Back",
    loading: "Qed jgħabbi...",
    noResults: "L-ebda riżultat.",
    showing: "Qed juri",
    of: "minn",
    results: "riżultati",
    col_name: "Isem",
    col_profession: "Professjoni",
    col_cases: "Kawżi",
    col_courts: "Qrati",
    col_firm: "Firma",
    col_first: "L-Ewwel",
    col_last: "L-Aħħar",
    viewCases: "Ara l-kawżi",
  },
  en: {
    title: "Lawyers & Legal Professionals",
    sub: "Full register — sortable and filterable",
    search: "Search name, firm, or profession...",
    back: "← Back",
    loading: "Loading...",
    noResults: "No results.",
    showing: "Showing",
    of: "of",
    results: "results",
    col_name: "Name",
    col_profession: "Profession",
    col_cases: "Cases",
    col_courts: "Courts",
    col_firm: "Firm",
    col_first: "First",
    col_last: "Last",
    viewCases: "View cases",
  },
};

function SortIcon({ active, asc }: { active: boolean; asc: boolean }) {
  if (!active) return <ArrowUpDown size={11} className="text-[#ccc]" />;
  return asc ? <ArrowUp size={11} className="text-gold" /> : <ArrowDown size={11} className="text-gold" />;
}

export default function LawyersPage() {
  const [lang] = useLanguage();
  const [q, setQ] = useState("");
  const [data, setData] = useState<Lawyer[]>([]);
  const [judgments, setJudgments] = useState<Judgment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("full_name");
  const [sortAsc, setSortAsc] = useState(true);
  const [profFilter, setProfFilter] = useState("all");
  const [expandedLawyer, setExpandedLawyer] = useState<string | null>(null);
  const t = L[lang];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [lawyers, judg] = await Promise.all([getLawyers(), getJudgments()]);
      if (!cancelled) {
        setData(lawyers);
        setJudgments(judg);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  // Find cases for a lawyer by matching their name in judgment parties/judge
  const getCasesForLawyer = (name: string) => {
    const lower = name.toLowerCase();
    return judgments.filter(j =>
      j.parties?.toLowerCase().includes(lower) ||
      j.judge?.toLowerCase().includes(lower)
    ).slice(0, 20);
  };

  const filtered = useMemo(() => {
    let results = [...data];

    if (q.trim()) {
      const lower = q.toLowerCase();
      results = results.filter(l =>
        l.full_name?.toLowerCase().includes(lower) ||
        l.firm?.toLowerCase().includes(lower) ||
        l.profession?.toLowerCase().includes(lower) ||
        l.warrant_number?.toLowerCase().includes(lower) ||
        (l.courts_active_in || []).some(c => c.toLowerCase().includes(lower))
      );
    }

    if (profFilter !== "all") {
      results = results.filter(l => l.profession?.toLowerCase().includes(profFilter));
    }

    results.sort((a, b) => {
      let va: string | number = "";
      let vb: string | number = "";
      if (sortKey === "case_count") {
        va = a.case_count || 0;
        vb = b.case_count || 0;
        return sortAsc ? (va as number) - (vb as number) : (vb as number) - (va as number);
      }
      va = ((a as any)[sortKey] || "").toString().toLowerCase();
      vb = ((b as any)[sortKey] || "").toString().toLowerCase();
      return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

    return results;
  }, [data, q, sortKey, sortAsc, profFilter]);

  return (
    <div className="min-h-screen bg-cream text-[#1a1a2e]">
      <Nav />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/" className="text-sm text-[#9ca3af] hover:text-[#6b7280] mb-6 inline-block">{t.back}</Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gold/10 border border-gold/20">
              <User size={22} className="text-gold" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#1a1a2e]">{t.title}</h1>
          </div>
          <p className="text-[#9ca3af] text-sm mb-6 ml-0 sm:ml-14">{t.sub}</p>

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
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[#9ca3af]">{lang === "mt" ? "Professjoni:" : "Profession:"}</span>
              {PROFESSIONS.map(p => (
                <button key={p.key} onClick={() => setProfFilter(p.key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                    profFilter === p.key
                      ? "bg-gold/10 border-gold/30 text-gold"
                      : "bg-white border-[#e5e0d5] text-[#6b7280] hover:border-gold/20"
                  }`}>{lang === "mt" ? p.label_mt : p.label_en}</button>
              ))}
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
              <div className="hidden md:grid grid-cols-[1fr_130px_60px_80px_90px_32px] gap-2 px-4 py-3 border-b border-[#e5e0d5] bg-[#f9f7f3] text-xs font-semibold text-[#6b7280]">
                <button onClick={() => toggleSort("full_name")} className="flex items-center gap-1 hover:text-[#1a1a2e] transition-colors">
                  {t.col_name} <SortIcon active={sortKey === "full_name"} asc={sortAsc} />
                </button>
                <button onClick={() => toggleSort("profession")} className="flex items-center gap-1 hover:text-[#1a1a2e] transition-colors">
                  {t.col_profession} <SortIcon active={sortKey === "profession"} asc={sortAsc} />
                </button>
                <button onClick={() => toggleSort("case_count")} className="flex items-center gap-1 hover:text-[#1a1a2e] transition-colors">
                  {t.col_cases} <SortIcon active={sortKey === "case_count"} asc={sortAsc} />
                </button>
                <span>{t.col_courts}</span>
                <span>{t.col_last}</span>
                <span></span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-[#e5e0d5]/50">
                {filtered.map((l) => {
                  const isJudge = l.profession?.toLowerCase().includes("judge") || l.profession?.toLowerCase().includes("magistr");
                  const expanded = expandedLawyer === l.warrant_number;
                  const cases = expanded ? getCasesForLawyer(l.full_name) : [];

                  return (
                    <div key={l.warrant_number}>
                      <div
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gold/5 transition-colors group cursor-pointer
                                   md:grid md:grid-cols-[1fr_130px_60px_80px_90px_32px] md:gap-2"
                        onClick={() => setExpandedLawyer(expanded ? null : l.warrant_number)}
                      >
                        {/* Avatar + name (always visible) */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-7 h-7 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0 text-gold font-bold text-[10px]">
                            {l.full_name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                          </div>
                          <div className="min-w-0 flex-1">
                            <Link href={`/detail?type=lawyer&id=${encodeURIComponent(l.warrant_number)}`}
                              className="text-sm text-[#6b7280] group-hover:text-[#1a1a2e] transition-colors hover:text-gold block truncate"
                              onClick={(e) => e.stopPropagation()}>
                              {l.full_name}
                            </Link>
                            {/* Mobile-only subtitle */}
                            <div className="flex items-center gap-2 mt-0.5 md:hidden">
                              <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                isJudge ? "text-purple-600 bg-purple-50" : "text-gold bg-gold/10"
                              }`}>{l.profession || "Advocate"}</span>
                              <span className="text-[10px] text-[#9ca3af] font-mono">{l.case_count || 0} {lang === "mt" ? "kawżi" : "cases"}</span>
                            </div>
                          </div>
                        </div>
                        {/* Desktop-only columns */}
                        <span className="hidden md:block">
                          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            isJudge ? "text-purple-600 bg-purple-50" : "text-gold bg-gold/10"
                          }`}>{l.profession || "Advocate"}</span>
                        </span>
                        <span className="hidden md:block text-xs font-mono text-[#1a1a2e] font-semibold">{l.case_count || 0}</span>
                        <span className="hidden md:block text-[10px] text-[#9ca3af]">
                          {(l.courts_active_in || []).length > 0
                            ? `${l.courts_active_in.length} ${lang === "mt" ? "qrati" : "courts"}`
                            : "—"}
                        </span>
                        <span className="hidden md:block text-[10px] text-[#9ca3af] font-mono">{l.last_case_date?.split("T")[0] || "—"}</span>
                        <ChevronRight size={14} className={`text-[#9ca3af] group-hover:text-gold transition-all shrink-0 ${expanded ? "rotate-90" : ""}`} />
                      </div>

                      {/* Expanded: show cases */}
                      {expanded && (
                        <div className="px-4 pb-4">
                          <div className="bg-cream border border-[#e5e0d5] rounded-xl p-3 ml-9">
                            {l.courts_active_in && l.courts_active_in.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {l.courts_active_in.map((c, i) => (
                                  <span key={i} className="text-[10px] bg-[#4c9ac9]/10 text-[#4c9ac9] px-2 py-0.5 rounded-full">{c}</span>
                                ))}
                              </div>
                            )}
                            <p className="text-xs font-semibold text-[#6b7280] mb-2">
                              {lang === "mt" ? "Kawżi Reċenti" : "Recent Cases"} ({cases.length > 0 ? cases.length : 0})
                            </p>
                            {cases.length > 0 ? (
                              <div className="space-y-1">
                                {cases.slice(0, 10).map((j) => (
                                  <Link key={j.reference} href={`/detail?type=judgment&id=${encodeURIComponent(j.reference)}`}
                                    className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg hover:bg-white transition-colors group/case">
                                    <Scale size={10} className="text-gold shrink-0" />
                                    <span className="font-mono text-[#4c9ac9] shrink-0">{j.reference}</span>
                                    <span className="text-[#6b7280] truncate group-hover/case:text-[#1a1a2e]">{j.parties}</span>
                                    <span className="text-[#9ca3af] shrink-0 ml-auto">{j.date}</span>
                                  </Link>
                                ))}
                                {cases.length > 10 && (
                                  <p className="text-[10px] text-[#9ca3af] px-2">+{cases.length - 10} {lang === "mt" ? "oħra" : "more"}...</p>
                                )}
                              </div>
                            ) : (
                              <p className="text-[10px] text-[#9ca3af]">
                                {lang === "mt" ? "L-ebda kawżi li jaqblu nstabu fid-data attwali." : "No matching cases found in current data."}
                              </p>
                            )}
                            <Link href={`/detail?type=lawyer&id=${encodeURIComponent(l.warrant_number)}`}
                              className="inline-flex items-center gap-1 mt-3 text-xs text-gold hover:text-gold/80 font-medium">
                              <FileText size={10} /> {lang === "mt" ? "Ara l-profil sħiħ" : "View full profile"} →
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
