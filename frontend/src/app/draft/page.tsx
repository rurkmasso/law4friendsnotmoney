"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileDown, Loader2, Scale } from "lucide-react";
import { getTemplates, createDraft, type Language } from "@/lib/api";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/laws", label_mt: "Liġijiet", label_en: "Laws" },
  { href: "/judgments", label_mt: "Sentenzi", label_en: "Judgments" },
  { href: "/lawyers", label_mt: "Avukati", label_en: "Lawyers" },
  { href: "/documents", label_mt: "Dokumenti", label_en: "Documents" },
  { href: "/draft", label_mt: "Abbozza", label_en: "Draft" },
  { href: "/case-builder", label_mt: "Ibni Każ", label_en: "Build Case" },
];

export default function DraftPage() {
  const [lang, setLang] = useLanguage();
  const [templates, setTemplates] = useState<{ id: string; title: string }[]>([]);
  const [docType, setDocType] = useState("");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);

  const t = {
    mt: {
      title: "Abbozza Dokument Legali",
      subtitle: "Iġġenera kuntratti u dokumenti legali bil-Malti jew bl-Ingliż, ibbażati fuq il-Liġi Maltija.",
      selectTemplate: "Agħżel tip ta' dokument",
      instructionsLabel: "Dettalji speċifiċi",
      instructionsPlaceholder: "Eż: Kuntratt ta' xogħol bejn XYZ Ltd u John Borg, €25,000 fis-sena, jibda 1 ta' Mejju 2026...",
      generate: "Iġġenera DOCX",
      generating: "Qed jabbozza...",
      back: "← Lura",
    },
    en: {
      title: "Draft a Legal Document",
      subtitle: "Generate contracts and legal documents in Maltese or English, grounded in Maltese law.",
      selectTemplate: "Select document type",
      instructionsLabel: "Specific details",
      instructionsPlaceholder: "E.g. Employment contract between XYZ Ltd and John Borg, €25,000/year, starting 1 May 2026...",
      generate: "Generate DOCX",
      generating: "Drafting...",
      back: "← Back",
    },
  }[lang];

  useEffect(() => {
    getTemplates().then(setTemplates).catch(console.error);
  }, []);

  const handleDraft = async () => {
    if (!docType || !instructions.trim()) return;
    setLoading(true);
    try {
      const res = await createDraft(docType, instructions, lang);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${docType}_${lang}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream text-[#1a1a2e]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-[#e5e0d5] shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Scale size={20} className="text-gold" />
            <span className="text-lg font-display font-bold text-[#1a1a2e]">
              <span className="text-gold">Lex</span>Malta
            </span>
          </Link>
          <div className="hidden lg:flex items-center gap-6 text-sm text-[#6b7280]">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href}
                className="hover:text-gold transition-colors font-medium">
                {lang === "mt" ? link.label_mt : link.label_en}
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

      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link href="/" className="text-sm text-[#9ca3af] hover:text-[#6b7280]">{t.back}</Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
          <h1 className="text-3xl font-display font-bold mb-2 text-[#1a1a2e]">
            <span className="text-gold">Abbozza</span> / Draft
          </h1>
          <p className="text-[#6b7280] mb-8">{t.subtitle}</p>

          {/* Template select */}
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full bg-white border border-[#e5e0d5] rounded-xl px-4 py-3 mb-4
                       text-[#1a1a2e] focus:outline-none focus:border-gold/50 transition-colors"
          >
            <option value="">{t.selectTemplate}</option>
            {templates.map((tmpl) => (
              <option key={tmpl.id} value={tmpl.id}>{tmpl.title}</option>
            ))}
          </select>

          {/* Instructions */}
          <label className="block text-sm text-[#6b7280] mb-2">{t.instructionsLabel}</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder={t.instructionsPlaceholder}
            rows={5}
            className="w-full bg-white border border-[#e5e0d5] rounded-xl px-4 py-3 mb-6
                       text-[#1a1a2e] placeholder:text-[#9ca3af] focus:outline-none focus:border-gold/50
                       transition-colors resize-none"
          />

          <button
            onClick={handleDraft}
            disabled={loading || !docType || !instructions.trim()}
            className="w-full py-4 bg-gold hover:bg-gold/90 text-white font-semibold
                       rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> {t.generating}</>
            ) : (
              <><FileDown size={18} /> {t.generate}</>
            )}
          </button>
        </motion.div>

        {/* Footer */}
        <div className="py-10 mt-10 text-center text-xs text-[#9ca3af] border-t border-[#e5e0d5]">
          <p>LexMalta — Powered by Rark Musso · B&apos;Xejn għal Dejjem</p>
        </div>
      </div>
    </div>
  );
}
