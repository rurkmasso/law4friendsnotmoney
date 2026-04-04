"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Scale, Calculator, Ship, Building2, Shield, Coins } from "lucide-react";
import { search, type Language, type SearchResult } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { useLanguage } from "@/lib/useLanguage";

const SECTORS = [
  {
    id: "legal",
    icon: Scale,
    name_mt: "Legali",
    name_en: "Legal",
    prompts_mt: ["Analizza kawża ta' kiri", "Abbozza kuntratt ta' xogħol", "Spjega l-proċedura ta' appell"],
    prompts_en: ["Analyse a lease dispute", "Draft employment contract", "Explain appeal procedure"],
    color: "#b8963a",
  },
  {
    id: "tax",
    icon: Calculator,
    name_mt: "Taxxa & Kontabilità",
    name_en: "Tax & Accounting",
    prompts_mt: ["Eżenzjoni ta' parteċipazzjoni", "VAT fuq servizzi diġitali", "Transfer pricing regoli"],
    prompts_en: ["Participation exemption rules", "VAT on digital services", "Transfer pricing rules"],
    color: "#4c9ac9",
  },
  {
    id: "maritime",
    icon: Ship,
    name_mt: "Marittimo & Navigazzjoni",
    name_en: "Maritime & Shipping",
    prompts_mt: ["Reġistrazzjoni ta' bastiment", "Maritime liens Malta", "Charterparty disputes"],
    prompts_en: ["Ship registration Malta", "Maritime liens Malta", "Charterparty disputes"],
    color: "#0d9488",
  },
  {
    id: "planning",
    icon: Building2,
    name_mt: "Ippjanar & Ambjent",
    name_en: "Planning & Environment",
    prompts_mt: ["Politika DC15", "Regoli ODZ", "Oġġezzjoni PA"],
    prompts_en: ["DC15 policy Malta", "ODZ rules Malta", "PA enforcement objection"],
    color: "#7c3aed",
  },
  {
    id: "compliance",
    icon: Shield,
    name_mt: "Konformità & AML",
    name_en: "Compliance & AML",
    prompts_mt: ["FIAU proċeduri AML/CFT", "GDPR Malta", "MiCA liċenzja"],
    prompts_en: ["FIAU AML/CFT procedures", "GDPR Malta obligations", "MiCA licence requirements"],
    color: "#dc2626",
  },
  {
    id: "fintech",
    icon: Coins,
    name_mt: "Fintech & Crypto",
    name_en: "Fintech & Crypto",
    prompts_mt: ["Reġistrazzjoni CASP", "MiFID II Malta", "Fond ta' investiment"],
    prompts_en: ["CASP registration Malta", "MiFID II Malta", "Investment fund licensing"],
    color: "#ea580c",
  },
];

export default function SectorsPage() {
  const [lang, setLang] = useLanguage();
  const [activeSector, setActiveSector] = useState(SECTORS[0]);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (q?: string) => {
    const finalQuery = q || query;
    if (!finalQuery.trim()) return;
    setLoading(true);
    setQuery(finalQuery);
    try {
      const res = await search(finalQuery, lang, { sector: activeSector.id });
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f3ee]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-[#e5e0d5] shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-display text-lg font-bold text-navy">
            Tizzju
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/sectors" className="text-sm text-gold font-medium">
              {lang === "mt" ? "Setturi" : "Sectors"}
            </Link>
            <Link href="/matter" className="text-sm text-[#6b7280] hover:text-[#1a1a2e] transition-colors">
              Matters
            </Link>
            <Link href="/alerts" className="text-sm text-[#6b7280] hover:text-[#1a1a2e] transition-colors">
              {lang === "mt" ? "Allerts" : "Alerts"}
            </Link>
            <button
              onClick={() => setLang(lang === "mt" ? "en" : "mt")}
              className="px-3 py-1 rounded-full border border-[#e5e0d5] text-xs font-mono text-[#6b7280] hover:border-gold/50 transition-colors"
            >
              {lang === "mt" ? "EN" : "MT"}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
          <h1 className="font-display text-3xl font-bold text-[#1a1a2e] mb-2">
            <span className="text-gold">{lang === "mt" ? "Setturi" : "Sectors"}</span>{" "}
            {lang === "mt" ? "Speċjalizzati" : "Specialised"}
          </h1>
          <p className="text-[#6b7280] mb-8 text-sm">
            {lang === "mt"
              ? "Għażel settur — il-mistoqsija tiġi ottimizzata awtomatikament."
              : "Select a sector — queries are automatically optimised for that domain."}
          </p>

          {/* Sector tabs */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-8">
            {SECTORS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => { setActiveSector(s); setResult(null); }}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all text-xs ${
                    activeSector.id === s.id
                      ? "border-gold/50 bg-white shadow-sm"
                      : "border-[#e5e0d5] bg-white hover:shadow-sm hover:border-gold/20"
                  }`}
                >
                  <Icon size={20} style={{ color: s.color }} />
                  <span className={`text-center leading-tight ${activeSector.id === s.id ? "text-[#1a1a2e] font-medium" : "text-[#6b7280]"}`}>
                    {lang === "mt" ? s.name_mt : s.name_en}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick prompts */}
          <div className="flex flex-wrap gap-2 mb-4">
            {(lang === "mt" ? activeSector.prompts_mt : activeSector.prompts_en).map((p) => (
              <button
                key={p}
                onClick={() => handleSearch(p)}
                className="px-3 py-1.5 bg-white hover:bg-[#f5f3ee] border border-[#e5e0d5]
                           hover:border-gold/30 rounded-full text-xs text-[#6b7280] hover:text-[#1a1a2e] transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex gap-2 mb-6">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={lang === "mt" ? `Staqsi dwar ${activeSector.name_mt}...` : `Ask about ${activeSector.name_en}...`}
              className="flex-1 bg-white border border-[#e5e0d5] rounded-xl px-4 py-3 text-[#1a1a2e]
                         focus:outline-none focus:border-gold/50 placeholder:text-[#9ca3af] text-sm"
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="px-5 py-3 bg-gold hover:bg-[#a8852f] text-white font-semibold rounded-xl disabled:opacity-50 transition-colors text-sm"
            >
              {loading ? "..." : lang === "mt" ? "Fittex" : "Search"}
            </button>
          </div>

          {/* Result */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-[#e5e0d5] rounded-2xl shadow-sm p-6"
            >
              <div className="prose prose-sm max-w-none text-[#1a1a2e] prose-headings:text-[#1a1a2e] prose-a:text-gold">
                <ReactMarkdown>{result.answer}</ReactMarkdown>
              </div>
              <p className="text-xs text-[#9ca3af] mt-4 pt-4 border-t border-[#e5e0d5]">
                {lang === "mt"
                  ? "Mhux parir legali. Ikkonsulta avukat."
                  : "Not legal advice. Consult a warranted advocate."}
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
