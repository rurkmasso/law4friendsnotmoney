"use client";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Scale,
  Shield,
  ExternalLink,
  Loader2,
  BookOpen,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from "lucide-react";
import { useLanguage } from "@/lib/useLanguage";
import { getIGamingOperators, type IGamingOperator } from "@/lib/api";
import Link from "next/link";

type Operator = IGamingOperator;

type FilterKey = "All" | "B2C" | "B2B" | "Active" | "Suspended";

const LABELS = {
  mt: {
    title: "Intelliġenza iGaming",
    subtitle: "Operaturi MGA Liċenzjati u r-Regolamenti tal-iGaming",
    operators: "Operaturi Liċenzjati",
    regulations: "Liġijiet u Regolamenti tal-iGaming",
    searchPlaceholder: "Fittex operaturi, numru ta' liċenzja...",
    search: "Fittex",
    licenceNumber: "Numru ta' Liċenzja",
    type: "Tip",
    status: "Status",
    viewSource: "Ara s-Sors",
    noResults: "L-ebda operatur ma nstab. Ipprova termini differenti.",
    connecting: "Qed jingħaqad mal-backend...",
    back: "← Lura / Back",
    regulations_list: "Lista ta' Regolamenti",
    showing: "Qed juri",
    of: "minn",
    results: "riżultati",
    backendTitle: "Il-backend qed jgħabbi...",
    backendSub: "Run the backend server to see data here",
    nav: {
      laws: "Liġijiet",
      judgments: "Sentenzi",
      lawyers: "Avukati",
      igaming: "iGaming",
    },
    filters: {
      All: "Kollha",
      B2C: "B2C",
      B2B: "B2B",
      Active: "Attivi",
      Suspended: "Sospiżi",
    },
    statusLabels: {
      Active: "Attiv",
      Suspended: "Sospiż",
      Revoked: "Revokat",
    },
  },
  en: {
    title: "iGaming Intelligence",
    subtitle: "MGA Licensed Operators and iGaming Laws & Regulations",
    operators: "Licensed Operators",
    regulations: "iGaming Laws & Regulations",
    searchPlaceholder: "Search operators, licence number...",
    search: "Search",
    licenceNumber: "Licence Number",
    type: "Type",
    status: "Status",
    viewSource: "View Source",
    noResults: "No operators found. Try different search terms.",
    connecting: "Connecting to backend...",
    back: "← Lura / Back",
    regulations_list: "Regulations List",
    showing: "Showing",
    of: "of",
    results: "results",
    backendTitle: "Backend loading...",
    backendSub: "Run the backend server to see data here",
    nav: {
      laws: "Laws",
      judgments: "Judgments",
      lawyers: "Lawyers",
      igaming: "iGaming",
    },
    filters: {
      All: "All",
      B2C: "B2C",
      B2B: "B2B",
      Active: "Active",
      Suspended: "Suspended",
    },
    statusLabels: {
      Active: "Active",
      Suspended: "Suspended",
      Revoked: "Revoked",
    },
  },
};

const REGULATIONS = [
  {
    title: "Gaming Act (CAP. 583)",
    description: "The primary legislation governing gaming in Malta",
    url: "https://legislation.mt",
    tag: "Primary",
  },
  {
    title: "Player Protection Directives",
    description: "Rules safeguarding player rights, responsible gambling and dispute resolution",
    url: "https://www.mga.org.mt/en/legislation-regulations/",
    tag: "Directive",
  },
  {
    title: "AML/CFT Requirements",
    description: "Anti-money laundering and counter-terrorism financing obligations for operators",
    url: "https://www.mga.org.mt/en/legislation-regulations/",
    tag: "AML",
  },
  {
    title: "B2C Licence Conditions",
    description: "Terms and conditions for Business-to-Consumer gaming licence holders",
    url: "https://www.mga.org.mt/en/legislation-regulations/",
    tag: "B2C",
  },
  {
    title: "B2B Critical Supply Licence Conditions",
    description: "Requirements for Business-to-Business critical gaming supply providers",
    url: "https://www.mga.org.mt/en/legislation-regulations/",
    tag: "B2B",
  },
];

function StatusBadge({ status, labels }: { status: string; labels: Record<string, string> }) {
  const normalized = status?.trim() ?? "";
  if (normalized.toLowerCase().includes("active")) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full
                       bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 size={10} />
        {labels["Active"] ?? normalized}
      </span>
    );
  }
  if (normalized.toLowerCase().includes("suspend")) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full
                       bg-red-50 text-red-600 border border-red-200">
        <XCircle size={10} />
        {labels["Suspended"] ?? normalized}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full
                     bg-[#f5f3ee] text-[#6b7280] border border-[#e5e0d5]">
      <MinusCircle size={10} />
      {(labels["Revoked"] ?? normalized) || "Unknown"}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const isB2C = type?.toUpperCase().includes("B2C");
  const isB2B = type?.toUpperCase().includes("B2B");
  return (
    <span
      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
        isB2C
          ? "bg-navy/5 text-navy border-navy/20"
          : isB2B
          ? "bg-gold/10 border-gold/20"
          : "bg-[#f5f3ee] text-[#6b7280] border-[#e5e0d5]"
      }`}
      style={isB2B ? { color: "#b8963a" } : undefined}
    >
      {type || "—"}
    </span>
  );
}

export default function IGamingPage() {
  const [lang, setLang] = useLanguage();
  const [q, setQ] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("All");
  const [data, setData] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);
  const t = LABELS[lang];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const results = await getIGamingOperators();
      if (!cancelled) { setData(results); setFetchFailed(results.length === 0); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let results = data;

    // Text search
    if (q.trim()) {
      const lower = q.toLowerCase();
      results = results.filter(
        (op) =>
          op.company_name?.toLowerCase().includes(lower) ||
          op.licence_number?.toLowerCase().includes(lower) ||
          op.licence_type?.toLowerCase().includes(lower)
      );
    }

    // Filter buttons
    if (activeFilter === "B2C") {
      results = results.filter((op) => op.licence_type?.toUpperCase().includes("B2C"));
    } else if (activeFilter === "B2B") {
      results = results.filter((op) => op.licence_type?.toUpperCase().includes("B2B"));
    } else if (activeFilter === "Active") {
      results = results.filter((op) => op.status?.toLowerCase().includes("active"));
    } else if (activeFilter === "Suspended") {
      results = results.filter((op) => op.status?.toLowerCase().includes("suspend"));
    }

    return results;
  }, [data, q, activeFilter]);

  const FILTER_KEYS: FilterKey[] = ["All", "B2C", "B2B", "Active", "Suspended"];
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
                className={`hover:text-gold transition-colors font-medium ${key === "igaming" ? "text-gold" : ""}`}
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
            <div className="p-2.5 rounded-xl bg-navy/5 border border-navy/15">
              <Shield size={22} className="text-navy" />
            </div>
            <h1 className="text-3xl font-display font-bold text-[#1a1a2e]">{t.title}</h1>
          </div>
          <p className="text-[#6b7280] ml-14">{t.subtitle}</p>
        </motion.div>

        {/* ========== OPERATORS SECTION ========== */}
        <section className="mb-12">
          <h2 className="text-xl font-display font-bold text-[#1a1a2e] mb-4 flex items-center gap-2">
            <Shield size={16} style={{ color: "#b8963a" }} />
            {t.operators}
          </h2>

          {/* Search + Filters */}
          <div className="bg-white border border-[#e5e0d5] rounded-2xl shadow-sm p-4 mb-4">
            <div className="flex gap-3 mb-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-[#e5e0d5] rounded-xl
                             focus:outline-none focus:border-[#b8963a]/50 text-[#1a1a2e]
                             placeholder:text-[#9ca3af] text-sm transition-all"
                />
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-[#e5e0d5]">
              {FILTER_KEYS.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-4 py-1.5 rounded-xl text-sm font-semibold border transition-all ${
                    activeFilter === f
                      ? "bg-[#b8963a] text-white border-[#b8963a] shadow-sm"
                      : "bg-white text-[#6b7280] border-[#e5e0d5] hover:border-[#b8963a]/40 hover:text-[#1a1a2e]"
                  }`}
                >
                  {t.filters[f]}
                </button>
              ))}
            </div>
          </div>

          {/* Results count */}
          {!loading && data.length > 0 && (
            <p className="text-xs text-[#9ca3af] mb-4 px-1">
              {t.showing} {filtered.length} {t.of} {data.length} {t.results}
            </p>
          )}

          {/* Operator Results */}
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16 gap-4"
              >
                <Loader2 size={28} className="text-gold animate-spin" />
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
                <Shield size={36} className="text-[#9ca3af] mx-auto mb-3" />
                <p className="text-[#1a1a2e] font-semibold mb-1">
                  {lang === "mt" ? "L-ebda data tal-operaturi għadha" : "No operator data yet"}
                </p>
                <p className="text-[#6b7280] text-sm">
                  {lang === "mt" ? "Ħaddex l-MGA scraper biex tniżżel id-data" : "Run the MGA scraper to download operator data"}
                </p>
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
                <Shield size={32} className="text-[#9ca3af] mx-auto mb-3" />
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
                <Shield size={32} className="text-[#9ca3af] mx-auto mb-3" />
                <p className="text-[#6b7280] text-sm">{t.noResults}</p>
              </motion.div>
            )}

            {!loading && filtered.length > 0 && (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-3"
              >
                {filtered.map((op, i) => (
                  <motion.div
                    key={`${op.licence_number}-${i}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.5) }}
                    className="bg-white border border-[#e5e0d5] rounded-2xl shadow-sm p-5
                               hover:border-gold/30 hover:shadow-md transition-all group"
                  >
                    {/* Company name */}
                    <p className="font-bold text-[#1a1a2e] text-base mb-2 leading-snug group-hover:text-gold/90 transition-colors">
                      {op.company_name || "—"}
                    </p>

                    {/* Licence number */}
                    {op.licence_number && (
                      <p className="font-mono text-sm mb-3 px-2 py-1 rounded-lg bg-[#f5f3ee] border border-[#e5e0d5] inline-block"
                         style={{ color: "#b8963a" }}>
                        {op.licence_number}
                      </p>
                    )}

                    {/* Badges row */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {op.licence_type && <TypeBadge type={op.licence_type} />}
                      {op.status && <StatusBadge status={op.status} labels={t.statusLabels} />}
                    </div>

                    {/* Source link */}
                    {op.source_url && (
                      <a
                        href={op.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-[#9ca3af]
                                   hover:text-gold transition-colors mt-1"
                      >
                        <ExternalLink size={11} />
                        {t.viewSource}
                      </a>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ========== REGULATIONS SECTION ========== */}
        <section>
          <h2 className="text-xl font-display font-bold text-[#1a1a2e] mb-4 flex items-center gap-2">
            <BookOpen size={16} className="text-navy" />
            {t.regulations}
          </h2>

          <div className="flex flex-col gap-3">
            {REGULATIONS.map((reg, i) => (
              <motion.a
                key={reg.title}
                href={reg.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="bg-white border border-[#e5e0d5] rounded-2xl shadow-sm p-5
                           hover:border-navy/30 hover:shadow-md transition-all group flex items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="p-2 rounded-xl bg-navy/5 border border-navy/10 shrink-0 mt-0.5">
                    <BookOpen size={16} className="text-navy" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-semibold text-[#1a1a2e] group-hover:text-navy transition-colors">
                        {reg.title}
                      </p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-navy/5 text-navy border border-navy/15 font-medium shrink-0">
                        {reg.tag}
                      </span>
                    </div>
                    <p className="text-sm text-[#6b7280] leading-relaxed">{reg.description}</p>
                  </div>
                </div>
                <ExternalLink
                  size={14}
                  className="text-[#9ca3af] group-hover:text-navy transition-colors shrink-0"
                />
              </motion.a>
            ))}
          </div>

          {/* MGA link */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 p-5 bg-navy/5 border border-navy/15 rounded-2xl flex items-center justify-between"
          >
            <div>
              <p className="font-semibold text-navy text-sm">Malta Gaming Authority</p>
              <p className="text-xs text-[#6b7280] mt-0.5">
                {lang === "mt"
                  ? "Is-sit uffiċjali tal-MGA — liċenzji, regolamenti u gwida"
                  : "Official MGA portal — licences, regulations and guidance"}
              </p>
            </div>
            <a
              href="https://www.mga.org.mt"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#b8963a] text-white rounded-xl font-semibold
                         hover:bg-[#a07828] text-sm transition-colors flex items-center gap-2 shrink-0 ml-4"
            >
              <ExternalLink size={13} />
              mga.org.mt
            </a>
          </motion.div>
        </section>

        {/* Footer */}
        <div className="py-10 text-center text-xs text-[#9ca3af] border-t border-[#e5e0d5] mt-12">
          <p>Ligi4Friends — Powered by Rark Musso</p>
        </div>
      </div>
    </div>
  );
}
