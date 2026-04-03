"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Scale, BookOpen, Users, FileText, Bell, TrendingUp, Zap, ChevronRight, ArrowRight } from "lucide-react";
import { search, type Language, type SearchResult } from "@/lib/api";
import CitationCard from "@/components/CitationCard";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const LABELS = {
  mt: {
    tagline: "Il-Liġi Maltija",
    sub: "Miftuħa għal Kulħadd — B'Xejn għal Dejjem",
    stats: ["77,000+ Sentenzi", "500+ Kapitoli", "1,000+ Avukati", "15+ Korpi Regolatorji"],
    placeholder: "Staqsi bil-Malti jew bl-Ingliż...",
    search: "Fittex",
    trending: "Qed jinfittxew illum",
    newToday: "Ġdid illum",
    followUp: "Mistoqsijiet relatati",
    disclaimer: "Għar-riċerka legali biss. Mhux parir legali.",
    cached: "Mir-reġistru tal-cache",
    nav: { laws: "Liġijiet", judgments: "Sentenzi", lawyers: "Avukati", draft: "Abbozza", "case-builder": "Ibni Każ", settings: "Settings" },
  },
  en: {
    tagline: "Maltese Law",
    sub: "Open to Everyone — Free Forever",
    stats: ["77,000+ Judgments", "500+ Chapters", "1,000+ Lawyers", "15+ Regulatory Bodies"],
    placeholder: "Ask in Maltese or English...",
    search: "Search",
    trending: "Trending today",
    newToday: "New today",
    followUp: "Related questions",
    disclaimer: "For legal research only. Not legal advice.",
    cached: "Served from cache",
    nav: { laws: "Laws", judgments: "Judgments", lawyers: "Lawyers", draft: "Draft", "case-builder": "Build Case", settings: "Settings" },
  },
};

export default function HomePage() {
  const [lang, setLang] = useState<Language>("mt");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [trending, setTrending] = useState<{ query: string; count: number }[]>([]);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [feed, setFeed] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = LABELS[lang];

  useEffect(() => {
    axios.get(`${API}/api/suggestions/trending`).then((r) => setTrending(r.data)).catch(() => {});
    axios.get(`${API}/api/suggestions/daily-feed`).then((r) => {
      setFeed([...r.data.judgments, ...r.data.documents].slice(0, 4));
    }).catch(() => {});
  }, []);

  const handleQueryChange = async (val: string) => {
    setQuery(val);
    if (val.length < 2) { setSuggestions([]); return; }
    try {
      const res = await axios.get(`${API}/api/suggestions/autocomplete`, { params: { q: val } });
      setSuggestions(res.data);
    } catch { setSuggestions([]); }
  };

  const handleSearch = async (q?: string) => {
    const finalQuery = q || query;
    if (!finalQuery.trim()) return;
    setQuery(finalQuery);
    setSuggestions([]);
    setLoading(true);
    setResult(null);
    setFollowUps([]);
    try {
      // Log for trending
      axios.post(`${API}/api/suggestions/log-search`, { query: finalQuery }).catch(() => {});
      const res = await search(finalQuery, lang);
      setResult(res);
      // Get follow-ups
      const fu = await axios.get(`${API}/api/suggestions/smart-followups`, { params: { query: finalQuery, language: lang } });
      setFollowUps(fu.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4
                      border-b border-white/5 bg-[#0a0a14]/90 backdrop-blur-xl">
        <Link href="/" className="text-xl font-bold tracking-tight">
          <span className="text-[#c9a84c]">Lex</span>
          <span>Malta</span>
        </Link>
        <div className="hidden md:flex items-center gap-5 text-sm text-white/60">
          {Object.entries(t.nav).map(([key, label]) => (
            <Link key={key} href={`/${key}`}
              className="hover:text-[#c9a84c] transition-colors">{label}</Link>
          ))}
        </div>
        <button
          onClick={() => setLang(lang === "mt" ? "en" : "mt")}
          className="px-3 py-1.5 rounded-full border border-white/10 hover:border-[#c9a84c]/50
                     text-xs font-mono transition-all"
        >
          {lang === "mt" ? "EN" : "MT"}
        </button>
      </nav>

      <div className="max-w-3xl mx-auto px-4">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="pt-16 pb-10 text-center"
        >
          {/* Malta cross */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="mb-6"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl
                            bg-gradient-to-br from-[#c9a84c]/20 to-[#c9a84c]/5
                            border border-[#c9a84c]/20">
              <Scale size={28} className="text-[#c9a84c]" />
            </div>
          </motion.div>

          <h1 className="text-6xl font-black tracking-tighter mb-3">
            <span className="bg-gradient-to-r from-[#c9a84c] to-[#e8c878] bg-clip-text text-transparent">
              Lex
            </span>
            Malta
          </h1>
          <p className="text-xl text-white/60 mb-1">{t.sub}</p>
          <p className="text-xs text-white/20 mt-1">Powered by Rark Musso</p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-3 mt-5">
            {t.stats.map((s) => (
              <span key={s} className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/50">
                {s}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative mb-6"
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder={t.placeholder}
                className="w-full pl-11 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-base
                           focus:outline-none focus:border-[#c9a84c]/50 focus:bg-white/8
                           placeholder:text-white/25 transition-all"
              />
              {/* Autocomplete */}
              <AnimatePresence>
                {suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a2e] border border-white/10
                               rounded-2xl overflow-hidden shadow-2xl z-50"
                  >
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => { setQuery(s); setSuggestions([]); handleSearch(s); }}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition-colors
                                   flex items-center gap-3 text-white/70 hover:text-white border-b border-white/5 last:border-0"
                      >
                        <Search size={13} className="text-white/30 shrink-0" />
                        {s}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="px-6 py-4 bg-gradient-to-r from-[#c9a84c] to-[#b8963a] hover:from-[#d4b356] hover:to-[#c9a84c]
                         text-black font-bold rounded-2xl transition-all disabled:opacity-50
                         shadow-lg shadow-[#c9a84c]/20 flex items-center gap-2"
            >
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <Zap size={18} />
                </motion.div>
              ) : (
                <>{t.search}<ArrowRight size={16} /></>
              )}
            </button>
          </div>
        </motion.div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {/* Answer */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-4">
                {result.cached && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-[#c9a84c]/60 mb-3">
                    <Zap size={11} /> {t.cached}
                  </span>
                )}
                <div className="prose prose-invert prose-sm max-w-none leading-relaxed">
                  <ReactMarkdown>{result.answer}</ReactMarkdown>
                </div>
                <p className="text-xs text-white/20 mt-4 pt-4 border-t border-white/5">{t.disclaimer}</p>
              </div>

              {/* Citations */}
              {result.sources?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-white/30 uppercase tracking-widest mb-2 px-1">Sorsi</p>
                  <CitationCard
                    citations={result.sources.map((s) => ({
                      type: s.type as any,
                      title: s.title,
                      url: s.url,
                      score: s.score,
                    }))}
                    language={lang}
                    onOpen={(c) => window.open(`/view?url=${encodeURIComponent(c.url)}&title=${encodeURIComponent(c.title)}`, "_blank")}
                  />
                </div>
              )}

              {/* Smart follow-ups */}
              {followUps.length > 0 && (
                <div className="mb-8">
                  <p className="text-xs text-white/30 uppercase tracking-widest mb-2 px-1">{t.followUp}</p>
                  <div className="flex flex-col gap-2">
                    {followUps.map((fu) => (
                      <button
                        key={fu}
                        onClick={() => handleSearch(fu)}
                        className="text-left flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10
                                   border border-white/5 hover:border-[#c9a84c]/20 rounded-xl text-sm
                                   text-white/60 hover:text-white transition-all group"
                      >
                        <ChevronRight size={14} className="text-[#c9a84c] group-hover:translate-x-0.5 transition-transform shrink-0" />
                        {fu}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* No result yet — show trending + feed */}
          {!result && !loading && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Trending */}
              {trending.length > 0 && (
                <div className="mb-8">
                  <p className="text-xs text-white/30 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <TrendingUp size={12} /> {t.trending}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {trending.map((item) => (
                      <button
                        key={item.query}
                        onClick={() => handleSearch(item.query)}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10
                                   hover:border-[#c9a84c]/30 rounded-full text-sm text-white/60
                                   hover:text-white transition-all"
                      >
                        {item.query}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Feature grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                {[
                  { icon: Scale, label: lang === "mt" ? "Sentenzi" : "Judgments", sub: "1944 – llum", href: "/judgments", color: "text-[#c9a84c]" },
                  { icon: BookOpen, label: lang === "mt" ? "Liġijiet" : "Laws", sub: "500+ kapitoli", href: "/laws", color: "text-[#4c9ac9]" },
                  { icon: Users, label: lang === "mt" ? "Avukati" : "Lawyers", sub: "1,000+", href: "/lawyers", color: "text-[#4cc9a8]" },
                  { icon: FileText, label: lang === "mt" ? "Abbozza" : "Draft", sub: "DOCX · MT/EN", href: "/draft", color: "text-[#a84cc9]" },
                  { icon: Bell, label: lang === "mt" ? "Allerts" : "Alerts", sub: lang === "mt" ? "Sentenzi ġodda" : "New judgments", href: "/alerts", color: "text-[#c94c4c]" },
                  { icon: TrendingUp, label: lang === "mt" ? "Setturi" : "Sectors", sub: "Tax · Maritime · AML", href: "/sectors", color: "text-[#c9874c]" },
                ].map(({ icon: Icon, label, sub, href, color }) => (
                  <Link
                    key={label}
                    href={href}
                    className="group bg-white/5 hover:bg-white/8 border border-white/8 hover:border-white/20
                               rounded-2xl p-5 transition-all"
                  >
                    <Icon size={20} className={`${color} mb-3`} />
                    <p className="font-semibold text-sm text-white/80 group-hover:text-white transition-colors">{label}</p>
                    <p className="text-xs text-white/30 mt-1">{sub}</p>
                  </Link>
                ))}
              </div>

              {/* Daily feed */}
              {feed.length > 0 && (
                <div className="mb-10">
                  <p className="text-xs text-white/30 uppercase tracking-widest mb-3">{t.newToday}</p>
                  <div className="flex flex-col gap-2">
                    {feed.map((item, i) => (
                      <a
                        key={i}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10
                                   border border-white/5 rounded-xl text-sm transition-all group"
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${item.type === "judgment" ? "bg-[#c9a84c]" : "bg-[#4c9ac9]"}`} />
                        <span className="flex-1 text-white/60 group-hover:text-white truncate transition-colors">{item.title}</span>
                        <span className="text-xs text-white/20 shrink-0">{item.date?.split("T")[0]}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
