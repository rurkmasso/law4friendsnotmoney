"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Scale, Calculator, Ship, Building2, Shield, Coins } from "lucide-react";
import { search, type Language, type SearchResult } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import Link from "next/link";

const SECTORS = [
  {
    id: "legal",
    icon: Scale,
    name_mt: "Legali",
    name_en: "Legal",
    prompts_mt: ["Analizza kawża ta' kiri", "Abbozza kuntratt ta' xogħol", "Spjega l-proċedura ta' appell"],
    prompts_en: ["Analyse a lease dispute", "Draft employment contract", "Explain appeal procedure"],
    color: "#c9a84c",
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
    color: "#4cc9a8",
  },
  {
    id: "planning",
    icon: Building2,
    name_mt: "Ippjanar & Ambjent",
    name_en: "Planning & Environment",
    prompts_mt: ["Politika DC15", "Regoli ODZ", "Oġġezzjoni PA"],
    prompts_en: ["DC15 policy Malta", "ODZ rules Malta", "PA enforcement objection"],
    color: "#a84cc9",
  },
  {
    id: "compliance",
    icon: Shield,
    name_mt: "Konformità & AML",
    name_en: "Compliance & AML",
    prompts_mt: ["FIAU proċeduri AML/CFT", "GDPR Malta", "MiCA liċenzja"],
    prompts_en: ["FIAU AML/CFT procedures", "GDPR Malta obligations", "MiCA licence requirements"],
    color: "#c94c4c",
  },
  {
    id: "fintech",
    icon: Coins,
    name_mt: "Fintech & Crypto",
    name_en: "Fintech & Crypto",
    prompts_mt: ["Reġistrazzjoni CASP", "MiFID II Malta", "Fond ta' investiment"],
    prompts_en: ["CASP registration Malta", "MiFID II Malta", "Investment fund licensing"],
    color: "#c9874c",
  },
];

export default function SectorsPage() {
  const [lang, setLang] = useState<Language>("mt");
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
    <div className="min-h-screen bg-[#0f0f1a] text-white px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-sm text-white/40 hover:text-white/70">← Lura / Back</Link>
          <button
            onClick={() => setLang(lang === "mt" ? "en" : "mt")}
            className="px-3 py-1 rounded-full border border-white/20 text-xs font-mono hover:border-[#c9a84c]"
          >
            {lang === "mt" ? "EN" : "MT"}
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-2">
          <span className="text-[#c9a84c]">Setturi</span> Speċjalizzati
        </h1>
        <p className="text-white/50 mb-8">
          {lang === "mt" ? "Għażel settur — il-mistoqsija tiġi ottimizzata awtomatikament."
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
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all text-xs
                  ${activeSector.id === s.id
                    ? "border-[#c9a84c]/60 bg-[#c9a84c]/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
              >
                <Icon size={20} style={{ color: s.color }} />
                <span className="text-center leading-tight">
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
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10
                         rounded-full text-xs transition-colors"
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
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3
                       focus:outline-none focus:border-[#c9a84c]/60 placeholder:text-white/30"
          />
          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="px-5 py-3 bg-[#c9a84c] hover:bg-[#b8963a] text-black font-semibold rounded-xl disabled:opacity-50"
          >
            {loading ? "..." : lang === "mt" ? "Fittex" : "Search"}
          </button>
        </div>

        {/* Result */}
        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{result.answer}</ReactMarkdown>
            </div>
            <p className="text-xs text-white/30 mt-4 pt-4 border-t border-white/10">
              {lang === "mt" ? "Mhux parir legali. Ikkonsulta avukat." : "Not legal advice. Consult a warranted advocate."}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
