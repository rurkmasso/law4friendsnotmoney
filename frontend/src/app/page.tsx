"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Scale, BookOpen, Users, FileText, Bell, TrendingUp, ChevronRight, ArrowRight, Zap, Dice1 } from "lucide-react";
import { search, type Language, type SearchResult } from "@/lib/api";
import { useLanguage } from "@/lib/useLanguage";
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
    nav: {
      laws: "Liġijiet",
      judgments: "Sentenzi",
      lawyers: "Avukati",
      documents: "Dokumenti",
      draft: "Abbozza",
      "case-builder": "Ibni Każ",
      igaming: "iGaming",
      calendar: "Kalendarju",
      settings: "Settings",
    },
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
    nav: {
      laws: "Laws",
      judgments: "Judgments",
      lawyers: "Lawyers",
      documents: "Documents",
      draft: "Draft",
      "case-builder": "Build Case",
      igaming: "iGaming",
      calendar: "Calendar",
      settings: "Settings",
    },
  },
};

export default function HomePage() {
  const [lang, setLang] = useLanguage();
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
      setFeed([...r.data.judgments, ...r.data.documents].slice(0, 5));
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
      axios.post(`${API}/api/suggestions/log-search`, { query: finalQuery }).catch(() => {});
      const res = await search(finalQuery, lang);
      setResult(res);
      const fu = await axios.get(`${API}/api/suggestions/smart-followups`, { params: { query: finalQuery, language: lang } });
      setFollowUps(fu.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const NAV_LINKS = Object.entries(t.nav).slice(0, 6);

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
              <Link key={key} href={`/${key}`}
                className="hover:text-gold transition-colors font-medium">{label}</Link>
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

      <div className="max-w-3xl mx-auto px-4">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="pt-16 pb-10 text-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="mb-6"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl
                            bg-gradient-to-br from-gold/15 to-gold/5 border border-gold/20 shadow-sm">
              <Scale size={28} className="text-gold" />
            </div>
          </motion.div>

          <h1 className="text-5xl font-display font-bold tracking-tight mb-3 text-[#1a1a2e]">
            <span className="text-gold">Ligi</span>4Friends
          </h1>
          <p className="text-lg text-[#6b7280] mb-1">{t.sub}</p>
          <p className="text-xs text-[#9ca3af] mt-1">Powered by Rark Musso</p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {t.stats.map((s) => (
              <span key={s} className="text-xs px-3 py-1.5 rounded-full bg-white border border-[#e5e0d5]
                                       text-[#6b7280] shadow-sm">
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
              <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder={t.placeholder}
                className="w-full pl-11 pr-4 py-4 bg-white border border-[#e5e0d5] rounded-2xl text-base
                           focus:outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/10
                           placeholder:text-[#9ca3af] shadow-sm transition-all text-[#1a1a2e]"
              />
              {/* Autocomplete */}
              <AnimatePresence>
                {suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#e5e0d5]
                               rounded-2xl overflow-hidden shadow-xl z-50"
                  >
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => { setQuery(s); setSuggestions([]); handleSearch(s); }}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-gold/5 transition-colors
                                   flex items-center gap-3 text-[#6b7280] hover:text-[#1a1a2e]
                                   border-b border-[#e5e0d5] last:border-0"
                      >
                        <Search size={13} className="text-[#9ca3af] shrink-0" />
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
              className="px-6 py-4 bg-gradient-to-r from-gold to-[#a07828] hover:from-[#c9a84c] hover:to-gold
                         text-white font-bold rounded-2xl transition-all disabled:opacity-50
                         shadow-md shadow-gold/20 flex items-center gap-2"
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
              <div className="bg-white border border-[#e5e0d5] rounded-2xl p-6 mb-4 shadow-sm">
                {result.cached && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-gold/70 mb-3">
                    <Zap size={11} /> {t.cached}
                  </span>
                )}
                <div className="prose prose-sm max-w-none leading-relaxed text-[#1a1a2e]">
                  <ReactMarkdown>{result.answer}</ReactMarkdown>
                </div>
                <p className="text-xs text-[#9ca3af] mt-4 pt-4 border-t border-[#e5e0d5]">{t.disclaimer}</p>
              </div>

              {/* Citations */}
              {result.sources?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-[#9ca3af] uppercase tracking-widest mb-2 px-1">Sorsi / Sources</p>
                  <CitationCard
                    citations={result.sources.map((s) => ({
                      type: s.type as any,
                      title: s.title,
                      url: s.url,
                      score: s.score,
                    }))}
                    language={lang}
                    onOpen={(c) => window.open(c.url, "_blank")}
                  />
                </div>
              )}

              {/* Smart follow-ups */}
              {followUps.length > 0 && (
                <div className="mb-8">
                  <p className="text-xs text-[#9ca3af] uppercase tracking-widest mb-2 px-1">{t.followUp}</p>
                  <div className="flex flex-col gap-2">
                    {followUps.map((fu) => (
                      <button
                        key={fu}
                        onClick={() => handleSearch(fu)}
                        className="text-left flex items-center gap-3 px-4 py-3 bg-white hover:bg-gold/5
                                   border border-[#e5e0d5] hover:border-gold/30 rounded-xl text-sm
                                   text-[#6b7280] hover:text-[#1a1a2e] transition-all group shadow-sm"
                      >
                        <ChevronRight size={14} className="text-gold group-hover:translate-x-0.5 transition-transform shrink-0" />
                        {fu}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* No result yet — show trending + feature grid + feed */}
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
                  <p className="text-xs text-[#9ca3af] uppercase tracking-widest mb-3 flex items-center gap-2">
                    <TrendingUp size={12} /> {t.trending}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {trending.map((item) => (
                      <button
                        key={item.query}
                        onClick={() => handleSearch(item.query)}
                        className="px-4 py-2 bg-white hover:bg-gold/5 border border-[#e5e0d5]
                                   hover:border-gold/30 rounded-full text-sm text-[#6b7280]
                                   hover:text-[#1a1a2e] transition-all shadow-sm"
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
                  { icon: Scale, label: lang === "mt" ? "Sentenzi" : "Judgments", sub: "1944 – llum", href: "/judgments", accent: "text-gold border-gold/20 bg-gold/5" },
                  { icon: BookOpen, label: lang === "mt" ? "Liġijiet" : "Laws", sub: "500+ kapitoli", href: "/laws", accent: "text-navy border-navy/20 bg-navy/5" },
                  { icon: Users, label: lang === "mt" ? "Avukati" : "Lawyers", sub: "1,000+", href: "/lawyers", accent: "text-emerald-600 border-emerald-200 bg-emerald-50" },
                  { icon: FileText, label: lang === "mt" ? "Abbozza" : "Draft", sub: "DOCX · MT/EN", href: "/draft", accent: "text-purple-600 border-purple-200 bg-purple-50" },
                  { icon: Dice1, label: "iGaming", sub: "MGA · CAP. 583", href: "/igaming", accent: "text-red-600 border-red-200 bg-red-50" },
                  { icon: Bell, label: lang === "mt" ? "Allerts" : "Alerts", sub: lang === "mt" ? "Sentenzi ġodda" : "New judgments", href: "/alerts", accent: "text-orange-600 border-orange-200 bg-orange-50" },
                ].map(({ icon: Icon, label, sub, href, accent }) => (
                  <Link
                    key={label}
                    href={href}
                    className="group bg-white hover:shadow-md border border-[#e5e0d5] hover:border-gold/30
                               rounded-2xl p-5 transition-all shadow-sm"
                  >
                    <div className={`inline-flex p-2 rounded-xl border mb-3 ${accent}`}>
                      <Icon size={18} />
                    </div>
                    <p className="font-semibold text-sm text-[#1a1a2e] group-hover:text-gold transition-colors">{label}</p>
                    <p className="text-xs text-[#9ca3af] mt-1">{sub}</p>
                  </Link>
                ))}
              </div>

              {/* Daily feed */}
              {feed.length > 0 && (
                <div className="mb-10">
                  <p className="text-xs text-[#9ca3af] uppercase tracking-widest mb-3">{t.newToday}</p>
                  <div className="flex flex-col gap-2">
                    {feed.map((item, i) => (
                      <a
                        key={i}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gold/5
                                   border border-[#e5e0d5] hover:border-gold/20 rounded-xl text-sm
                                   transition-all group shadow-sm"
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${item.type === "judgment" ? "bg-gold" : "bg-navy"}`} />
                        <span className="flex-1 text-[#6b7280] group-hover:text-[#1a1a2e] truncate transition-colors">{item.title}</span>
                        <span className="text-xs text-[#9ca3af] shrink-0">{item.date?.split("T")[0]}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="py-10 text-center text-xs text-[#9ca3af] border-t border-[#e5e0d5]">
          <p>Ligi4Friends — Powered by Rark Musso · Miftuħa għal Kulħadd · B'Xejn għal Dejjem</p>
          <p className="mt-1">Mhux parir legali. For legal research only.</p>
        </div>
      </div>
    </div>
  );
}
