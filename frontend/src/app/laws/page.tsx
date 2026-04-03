"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, Search, ExternalLink, ChevronRight } from "lucide-react";
import { getLaws, type Law } from "@/lib/api";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";

const L = {
  mt: {
    title: "Liġijiet ta' Malta",
    sub: "Il-kapitoli kollha tal-liġi Maltija",
    search: "Fittex kapitolu jew titlu...",
    back: "← Lura",
    loading: "Qed jgħabbi...",
    noResults: "L-ebda riżultat.",
    btn: "Fittex",
  },
  en: {
    title: "Laws of Malta",
    sub: "All consolidated chapters of Maltese law",
    search: "Search chapter or title...",
    back: "← Back",
    loading: "Loading...",
    noResults: "No results.",
    btn: "Search",
  },
};

export default function LawsPage() {
  const [lang, setLang] = useLanguage();
  const [q, setQ] = useState("");
  const [laws, setLaws] = useState<Law[]>([]);
  const [loading, setLoading] = useState(true);
  const t = L[lang];

  const fetch = async (query?: string) => {
    setLoading(true);
    try {
      const data = await getLaws(query);
      setLaws(data);
    } catch { setLaws([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-sm text-white/40 hover:text-white/70 transition-colors">{t.back}</Link>
          <button onClick={() => setLang(lang === "mt" ? "en" : "mt")}
            className="px-3 py-1.5 rounded-full border border-white/10 hover:border-[#c9a84c]/50 text-xs font-mono transition-all">
            {lang === "mt" ? "EN" : "MT"}
          </button>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <BookOpen size={28} className="text-[#4c9ac9]" />
            <h1 className="text-3xl font-bold">{t.title}</h1>
          </div>
          <p className="text-white/40 text-sm mb-8">{t.sub}</p>

          {/* Search */}
          <div className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetch(q)}
                placeholder={t.search}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm
                           focus:outline-none focus:border-[#4c9ac9]/50 placeholder:text-white/20"
              />
            </div>
            <button onClick={() => fetch(q)}
              className="px-5 py-3 bg-[#4c9ac9] hover:bg-[#3a7fb0] text-white rounded-xl font-semibold transition-colors">
              <Search size={16} />
            </button>
          </div>

          {/* Results */}
          {loading ? (
            <p className="text-white/30 text-sm">{t.loading}</p>
          ) : laws.length === 0 ? (
            <p className="text-white/30 text-sm">{t.noResults}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {laws.map((law) => (
                <a
                  key={law.chapter}
                  href={law.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/8
                             hover:border-[#4c9ac9]/30 rounded-xl transition-all group"
                >
                  <span className="text-xs font-mono text-[#4c9ac9] w-20 shrink-0">{law.chapter}</span>
                  <span className="flex-1 text-sm text-white/70 group-hover:text-white transition-colors truncate">{law.title}</span>
                  {law.last_amended && (
                    <span className="text-xs text-white/20 shrink-0">{law.last_amended.split("T")[0]}</span>
                  )}
                  <ChevronRight size={14} className="text-white/20 shrink-0 group-hover:text-white/50 transition-colors" />
                </a>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
