"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Scale, BookOpen, Users, FileText, Bell } from "lucide-react";
import { search, type Language, type SearchResult } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import Link from "next/link";

const LABELS = {
  mt: {
    tagline: "Il-Liġi Maltija — Miftuħa għal Kulħadd",
    subtitle: "77,000+ sentenzi · 500+ kapitoli · Avukati · Dokumenti Regolatorji",
    placeholder: "Staqsi bil-Malti jew bl-Ingliż...",
    search: "Fittex",
    free: "B'xejn. Għal dejjem.",
    sources: "Sorsi",
    lawyers: "Avukati",
    laws: "Liġijiet",
    judgments: "Sentenzi",
    draft: "Abbozza",
    alerts: "Allerts",
    disclaimer: "Ir-riżultati huma għar-riċerka legali biss. Mhux parir legali.",
  },
  en: {
    tagline: "Maltese Law — Open to Everyone",
    subtitle: "77,000+ judgments · 500+ chapters · Lawyers · Regulatory Documents",
    placeholder: "Ask in Maltese or English...",
    search: "Search",
    free: "Free. Forever.",
    sources: "Sources",
    lawyers: "Lawyers",
    laws: "Laws",
    judgments: "Judgments",
    draft: "Draft",
    alerts: "Alerts",
    disclaimer: "Results are for legal research only. Not legal advice.",
  },
};

export default function HomePage() {
  const [lang, setLang] = useState<Language>("mt");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const t = LABELS[lang];

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await search(query, lang);
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <span className="text-xl font-bold tracking-tight">
          <span className="text-[#c9a84c]">Lex</span>Malta
        </span>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/laws" className="hover:text-[#c9a84c] transition-colors">{t.laws}</Link>
          <Link href="/judgments" className="hover:text-[#c9a84c] transition-colors">{t.judgments}</Link>
          <Link href="/lawyers" className="hover:text-[#c9a84c] transition-colors">{t.lawyers}</Link>
          <Link href="/draft" className="hover:text-[#c9a84c] transition-colors">{t.draft}</Link>
          <Link href="/alerts" className="hover:text-[#c9a84c] transition-colors">{t.alerts}</Link>
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === "mt" ? "en" : "mt")}
            className="px-3 py-1 rounded-full border border-white/20 hover:border-[#c9a84c] transition-colors text-xs font-mono"
          >
            {lang === "mt" ? "EN" : "MT"}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-3xl mx-auto px-4 pt-20 pb-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Malta cross SVG */}
          <svg className="w-16 h-16 mx-auto mb-6 text-[#c9a84c]" viewBox="0 0 100 100" fill="currentColor">
            <path d="M50 5 L62 38 H95 L68 58 L80 91 L50 71 L20 91 L32 58 L5 38 H38 Z" />
          </svg>

          <h1 className="text-5xl font-bold mb-3 tracking-tight">
            <span className="text-[#c9a84c]">Lex</span>Malta
          </h1>
          <p className="text-xl text-white/80 mb-2">{t.tagline}</p>
          <p className="text-sm text-white/50 mb-2">{t.subtitle}</p>
          <span className="inline-block text-xs text-[#c9a84c] border border-[#c9a84c]/30 rounded-full px-3 py-1">
            {t.free}
          </span>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-10"
        >
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={t.placeholder}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-base
                         focus:outline-none focus:border-[#c9a84c]/60 placeholder:text-white/30 transition-colors"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-4 bg-[#c9a84c] hover:bg-[#b8963a] text-black font-semibold
                         rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Search size={18} />
              {loading ? "..." : t.search}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto px-4 pb-20"
        >
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-4">
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{result.answer}</ReactMarkdown>
            </div>
            <p className="text-xs text-white/30 mt-4 pt-4 border-t border-white/10">{t.disclaimer}</p>
          </div>

          {result.sources.length > 0 && (
            <div>
              <p className="text-xs text-white/40 mb-2 uppercase tracking-widest">{t.sources}</p>
              <div className="flex flex-col gap-2">
                {result.sources.map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10
                               rounded-xl px-4 py-3 text-sm transition-colors group"
                  >
                    <span className="text-xs text-white/40 font-mono w-5">[{i + 1}]</span>
                    <span className="flex-1 text-white/80 group-hover:text-white truncate">{s.title}</span>
                    <span className="text-xs text-white/30 uppercase">{s.type}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Feature grid */}
      {!result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="max-w-3xl mx-auto px-4 pb-20"
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { icon: Scale, label: lang === "mt" ? "Sentenzi tal-Qorti" : "Court Judgments", sub: "1944 – llum", href: "/judgments" },
              { icon: BookOpen, label: lang === "mt" ? "Liġijiet ta' Malta" : "Laws of Malta", sub: "500+ kapitoli", href: "/laws" },
              { icon: Users, label: lang === "mt" ? "Avukati" : "Lawyers", sub: lang === "mt" ? "1,000+ avukati" : "1,000+ lawyers", href: "/lawyers" },
              { icon: FileText, label: lang === "mt" ? "Abbozza Kuntratt" : "Draft Contract", sub: lang === "mt" ? "DOCX · bil-Malti/Ingliż" : "DOCX · MT/EN", href: "/draft" },
              { icon: Bell, label: lang === "mt" ? "Allerts" : "Alerts", sub: lang === "mt" ? "Sentenzi ġodda" : "New judgments", href: "/alerts" },
              { icon: Search, label: lang === "mt" ? "Fittex Kollox" : "Search Everything", sub: "FIAU · MFSA · MGA · ERA", href: "/search" },
            ].map(({ icon: Icon, label, sub, href }) => (
              <Link
                key={label}
                href={href}
                className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#c9a84c]/30
                           rounded-2xl p-5 transition-all group"
              >
                <Icon size={22} className="text-[#c9a84c] mb-3" />
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-white/40 mt-1">{sub}</p>
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
