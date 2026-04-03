"use client";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { BookOpen, Search, ChevronRight, Scale } from "lucide-react";
import { getLaws, type Law } from "@/lib/api";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const L = {
  mt: {
    title: "Liġijiet ta' Malta",
    sub: "Il-kapitoli kollha tal-liġi Maltija",
    search: "Fittex kapitolu jew titlu...",
    back: "← Lura / Back",
    loading: "Qed jgħabbi...",
    noResults: "L-ebda riżultat.",
    showing: "Qed juri",
    of: "minn",
    results: "riżultati",
    backendTitle: "Il-backend qed jgħabbi...",
    backendSub: "Run the backend server to see data here",
  },
  en: {
    title: "Laws of Malta",
    sub: "All consolidated chapters of Maltese law",
    search: "Search chapter or title...",
    back: "← Back",
    loading: "Loading...",
    noResults: "No results.",
    showing: "Showing",
    of: "of",
    results: "results",
    backendTitle: "Backend loading...",
    backendSub: "Run the backend server to see data here",
  },
};

const NAV_LINKS = [
  { href: "/laws", label_mt: "Liġijiet", label_en: "Laws" },
  { href: "/judgments", label_mt: "Sentenzi", label_en: "Judgments" },
  { href: "/lawyers", label_mt: "Avukati", label_en: "Lawyers" },
  { href: "/documents", label_mt: "Dokumenti", label_en: "Documents" },
  { href: "/igaming", label_mt: "iGaming", label_en: "iGaming" },
];

export default function LawsPage() {
  const [lang, setLang] = useLanguage();
  const [q, setQ] = useState("");
  const [data, setData] = useState<Law[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);
  const t = L[lang];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const results = await getLaws(undefined, 1, 200);
        if (!cancelled) { setData(results); setFetchFailed(false); }
      } catch {
        if (!cancelled) { setData([]); setFetchFailed(true); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return data;
    const lower = q.toLowerCase();
    return data.filter(
      (law) =>
        law.chapter?.toLowerCase().includes(lower) ||
        law.title?.toLowerCase().includes(lower)
    );
  }, [data, q]);

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

      <div className="max-w-4xl mx-auto px-4 py-10">
        <Link href="/" className="text-sm text-[#9ca3af] hover:text-[#6b7280] mb-6 inline-block">{t.back}</Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-[#4c9ac9]/10 border border-[#4c9ac9]/20">
              <BookOpen size={22} className="text-[#4c9ac9]" />
            </div>
            <h1 className="text-3xl font-display font-bold text-[#1a1a2e]">{t.title}</h1>
          </div>
          <p className="text-[#9ca3af] text-sm mb-8 ml-14">{t.sub}</p>

          {/* Search */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t.search}
                className="w-full pl-10 pr-4 py-3 bg-white border border-[#e5e0d5] rounded-xl text-sm
                           focus:outline-none focus:border-[#4c9ac9]/50 placeholder:text-[#9ca3af] text-[#1a1a2e]"
              />
            </div>
          </div>

          {/* Results count */}
          {!loading && data.length > 0 && (
            <p className="text-xs text-[#9ca3af] mb-4 px-1">
              {t.showing} {filtered.length} {t.of} {data.length} {t.results}
            </p>
          )}

          {/* Results */}
          {loading ? (
            <p className="text-[#9ca3af] text-sm">{t.loading}</p>
          ) : data.length === 0 && fetchFailed ? (
            <div className="bg-white border border-[#e5e0d5] rounded-2xl shadow-sm p-10 text-center">
              <BookOpen size={36} className="text-[#9ca3af] mx-auto mb-3" />
              <p className="text-[#1a1a2e] font-semibold mb-1">{t.backendTitle}</p>
              <p className="text-[#6b7280] text-sm mb-3">{t.backendSub}</p>
              <p className="text-xs text-[#9ca3af] font-mono">Run: python3 main.py in /backend</p>
              <p className="text-xs text-[#9ca3af] font-mono mt-1">API: {API}/api/laws/</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-[#9ca3af] text-sm">{t.noResults}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((law) => (
                <a
                  key={law.chapter}
                  href={law.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 px-4 py-3 bg-white hover:shadow-md border border-[#e5e0d5]
                             hover:border-[#4c9ac9]/30 rounded-xl transition-all group shadow-sm"
                >
                  <span className="text-xs font-mono text-[#4c9ac9] w-20 shrink-0">{law.chapter}</span>
                  <span className="flex-1 text-sm text-[#6b7280] group-hover:text-[#1a1a2e] transition-colors truncate">{law.title}</span>
                  {law.last_amended && (
                    <span className="text-xs text-[#9ca3af] shrink-0">{law.last_amended.split("T")[0]}</span>
                  )}
                  <ChevronRight size={14} className="text-[#9ca3af] shrink-0 group-hover:text-[#6b7280] transition-colors" />
                </a>
              ))}
            </div>
          )}
        </motion.div>

        {/* Footer */}
        <div className="py-10 mt-10 text-center text-xs text-[#9ca3af] border-t border-[#e5e0d5]">
          <p>Ligi4Friends — Powered by Rark Musso</p>
        </div>
      </div>
    </div>
  );
}
