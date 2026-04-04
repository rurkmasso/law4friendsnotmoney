"use client";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { BookOpen, Search, ChevronRight, Scale, ArrowUpDown, ArrowUp, ArrowDown, FileText, CheckCircle, XCircle } from "lucide-react";
import { getLaws, type Law } from "@/lib/api";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";

const L = {
  mt: {
    title: "Liġijiet ta' Malta",
    sub: "Il-kapitoli kollha tal-liġi Maltija — sortabbli u filtrabbbli",
    search: "Fittex kapitolu, titlu, jew keyword...",
    back: "← Lura / Back",
    loading: "Qed jgħabbi...",
    noResults: "L-ebda riżultat.",
    showing: "Qed juri",
    of: "minn",
    results: "riżultati",
    col_chapter: "Kapitolu",
    col_title: "Titlu",
    col_status: "Status",
    col_type: "Tip",
    col_date: "Data",
    col_pdf: "PDF",
    col_keywords: "Keywords",
    all: "Kollha",
    inForce: "Fis-Seħħ",
    repealed: "Imħassar",
    hasPdf: "B'PDF",
  },
  en: {
    title: "Laws of Malta",
    sub: "All consolidated chapters — sortable and filterable",
    search: "Search chapter, title, or keyword...",
    back: "← Back",
    loading: "Loading...",
    noResults: "No results.",
    showing: "Showing",
    of: "of",
    results: "results",
    col_chapter: "Chapter",
    col_title: "Title",
    col_status: "Status",
    col_type: "Type",
    col_date: "Effective",
    col_pdf: "PDF",
    col_keywords: "Keywords",
    all: "All",
    inForce: "In Force",
    repealed: "Repealed",
    hasPdf: "Has PDF",
  },
};

const NAV_LINKS = [
  { href: "/laws", label_mt: "Liġijiet", label_en: "Laws" },
  { href: "/judgments", label_mt: "Sentenzi", label_en: "Judgments" },
  { href: "/lawyers", label_mt: "Avukati", label_en: "Lawyers" },
  { href: "/documents", label_mt: "Dokumenti", label_en: "Documents" },
  { href: "/igaming", label_mt: "iGaming", label_en: "iGaming" },
];

type SortKey = "chapter" | "title" | "status" | "effective_date" | "type";

function SortIcon({ active, asc }: { active: boolean; asc: boolean }) {
  if (!active) return <ArrowUpDown size={11} className="text-[#ccc]" />;
  return asc ? <ArrowUp size={11} className="text-[#4c9ac9]" /> : <ArrowDown size={11} className="text-[#4c9ac9]" />;
}

export default function LawsPage() {
  const [lang, setLang] = useLanguage();
  const [q, setQ] = useState("");
  const [data, setData] = useState<Law[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("chapter");
  const [sortAsc, setSortAsc] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [pdfFilter, setPdfFilter] = useState(false);
  const t = L[lang];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const results = await getLaws();
      if (!cancelled) setData(results);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = useMemo(() => {
    let results = [...data];

    // Text search
    if (q.trim()) {
      const lower = q.toLowerCase();
      results = results.filter(
        (law) =>
          law.chapter?.toLowerCase().includes(lower) ||
          law.title?.toLowerCase().includes(lower) ||
          law.title_en?.toLowerCase().includes(lower) ||
          (law.keywords || []).some(k => k.toLowerCase().includes(lower)) ||
          law.eli_link?.toLowerCase().includes(lower)
      );
    }

    // Status filter
    if (statusFilter === "inforce") {
      results = results.filter(l => !l.status || l.status.toLowerCase().includes("force") || l.status.toLowerCase().includes("seħħ"));
    } else if (statusFilter === "repealed") {
      results = results.filter(l => l.status && (l.status.toLowerCase().includes("repeal") || l.status.toLowerCase().includes("ħass")));
    }

    // PDF filter
    if (pdfFilter) {
      results = results.filter(l => l.pdf_url || l.pdf_url_en || l.pdf_url_mt);
    }

    // Sort
    results.sort((a, b) => {
      let va = (a[sortKey] || "").toString().toLowerCase();
      let vb = (b[sortKey] || "").toString().toLowerCase();
      // For chapter, try numeric sort
      if (sortKey === "chapter") {
        const na = parseInt(va.replace(/[^\d]/g, "")) || 0;
        const nb = parseInt(vb.replace(/[^\d]/g, "")) || 0;
        if (na !== nb) return sortAsc ? na - nb : nb - na;
      }
      return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

    return results;
  }, [data, q, sortKey, sortAsc, statusFilter, pdfFilter]);

  return (
    <div className="min-h-screen bg-cream text-[#1a1a2e]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-[#e5e0d5] shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Scale size={20} className="text-gold" />
            <span className="text-lg font-display font-bold text-[#1a1a2e]">
              <span className="text-gold">Tizz</span>ju
            </span>
          </Link>
          <div className="hidden lg:flex items-center gap-6 text-sm text-[#6b7280]">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href}
                className={`hover:text-gold transition-colors font-medium ${link.href === "/laws" ? "text-gold" : ""}`}>
                {lang === "mt" ? link.label_mt : link.label_en}
              </Link>
            ))}
          </div>
          <button onClick={() => setLang(lang === "mt" ? "en" : "mt")}
            className="px-3 py-1.5 rounded-full border border-[#e5e0d5] hover:border-gold/50
                       hover:bg-gold/5 text-xs font-mono text-[#6b7280] transition-all">
            {lang === "mt" ? "EN" : "MT"}
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/" className="text-sm text-[#9ca3af] hover:text-[#6b7280] mb-6 inline-block">{t.back}</Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-[#4c9ac9]/10 border border-[#4c9ac9]/20">
              <BookOpen size={22} className="text-[#4c9ac9]" />
            </div>
            <h1 className="text-3xl font-display font-bold text-[#1a1a2e]">{t.title}</h1>
          </div>
          <p className="text-[#9ca3af] text-sm mb-6 ml-14">{t.sub}</p>

          {/* Search + Filters */}
          <div className="bg-white border border-[#e5e0d5] rounded-2xl shadow-sm p-4 mb-4">
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t.search}
                  className="w-full pl-10 pr-4 py-2.5 bg-cream border border-[#e5e0d5] rounded-xl text-sm
                             focus:outline-none focus:border-[#4c9ac9]/50 placeholder:text-[#9ca3af] text-[#1a1a2e]"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[#9ca3af]">Status:</span>
              {[
                { key: "all", label: t.all },
                { key: "inforce", label: t.inForce },
                { key: "repealed", label: t.repealed },
              ].map(f => (
                <button key={f.key} onClick={() => setStatusFilter(f.key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                    statusFilter === f.key
                      ? "bg-[#4c9ac9]/10 border-[#4c9ac9]/30 text-[#4c9ac9]"
                      : "bg-white border-[#e5e0d5] text-[#6b7280] hover:border-[#4c9ac9]/20"
                  }`}>{f.label}</button>
              ))}
              <span className="text-[#e5e0d5]">|</span>
              <button onClick={() => setPdfFilter(!pdfFilter)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all border flex items-center gap-1 ${
                  pdfFilter
                    ? "bg-red-50 border-red-200 text-red-600"
                    : "bg-white border-[#e5e0d5] text-[#6b7280] hover:border-red-200"
                }`}>
                <FileText size={10} /> {t.hasPdf}
              </button>
            </div>
          </div>

          {/* Results count */}
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
              {/* Table header */}
              <div className="grid grid-cols-[80px_1fr_90px_70px_90px_50px] gap-2 px-4 py-3 border-b border-[#e5e0d5] bg-[#f9f7f3] text-xs font-semibold text-[#6b7280]">
                <button onClick={() => toggleSort("chapter")} className="flex items-center gap-1 hover:text-[#1a1a2e] transition-colors">
                  {t.col_chapter} <SortIcon active={sortKey === "chapter"} asc={sortAsc} />
                </button>
                <button onClick={() => toggleSort("title")} className="flex items-center gap-1 hover:text-[#1a1a2e] transition-colors">
                  {t.col_title} <SortIcon active={sortKey === "title"} asc={sortAsc} />
                </button>
                <button onClick={() => toggleSort("status")} className="flex items-center gap-1 hover:text-[#1a1a2e] transition-colors">
                  {t.col_status} <SortIcon active={sortKey === "status"} asc={sortAsc} />
                </button>
                <span>{t.col_pdf}</span>
                <button onClick={() => toggleSort("effective_date")} className="flex items-center gap-1 hover:text-[#1a1a2e] transition-colors">
                  {t.col_date} <SortIcon active={sortKey === "effective_date"} asc={sortAsc} />
                </button>
                <span></span>
              </div>

              {/* Table rows */}
              <div className="divide-y divide-[#e5e0d5]/50">
                {filtered.map((law) => {
                  const isInForce = !law.status || law.status.toLowerCase().includes("force") || law.status.toLowerCase().includes("seħħ");
                  const hasPdf = !!(law.pdf_url || law.pdf_url_en || law.pdf_url_mt);
                  return (
                    <Link
                      key={law.chapter}
                      href={`/detail?type=law&id=${encodeURIComponent(law.chapter)}`}
                      className="grid grid-cols-[80px_1fr_90px_70px_90px_50px] gap-2 px-4 py-3 hover:bg-[#4c9ac9]/5 transition-colors group items-center"
                    >
                      <span className="text-xs font-mono text-[#4c9ac9] font-semibold">{law.chapter}</span>
                      <span className="text-sm text-[#6b7280] group-hover:text-[#1a1a2e] transition-colors truncate">
                        {law.title}
                      </span>
                      <span>
                        {isInForce ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                            <CheckCircle size={9} /> {lang === "mt" ? "Fis-Seħħ" : "Active"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-medium">
                            <XCircle size={9} /> {lang === "mt" ? "Imħassar" : "Repealed"}
                          </span>
                        )}
                      </span>
                      <span>
                        {hasPdf && (
                          <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-bold">PDF</span>
                        )}
                      </span>
                      <span className="text-[10px] text-[#9ca3af] font-mono">{law.effective_date || ""}</span>
                      <ChevronRight size={14} className="text-[#9ca3af] group-hover:text-[#4c9ac9] transition-colors" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>

        {/* Footer */}
        <div className="py-10 mt-10 text-center text-xs text-[#9ca3af] border-t border-[#e5e0d5]">
          <p>Tizzju — Powered by Rark Musso</p>
        </div>
      </div>
    </div>
  );
}
