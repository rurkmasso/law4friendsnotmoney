"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileDown, Loader2 } from "lucide-react";
import { getTemplates, createDraft, type Language } from "@/lib/api";
import Link from "next/link";

export default function DraftPage() {
  const [lang, setLang] = useState<Language>("mt");
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
    <div className="min-h-screen bg-[#0f0f1a] text-white px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-sm text-white/40 hover:text-white/70">{t.back}</Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-[#c9a84c]">Abbozza</span> / Draft
          </h1>
          <p className="text-white/50 mb-8">{t.subtitle}</p>

          {/* Language toggle */}
          <div className="flex gap-2 mb-6">
            {(["mt", "en"] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  lang === l ? "bg-[#c9a84c] text-black" : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {l === "mt" ? "Malti" : "English"}
              </button>
            ))}
          </div>

          {/* Template select */}
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-4
                       text-white focus:outline-none focus:border-[#c9a84c]/60 transition-colors"
          >
            <option value="">{t.selectTemplate}</option>
            {templates.map((tmpl) => (
              <option key={tmpl.id} value={tmpl.id}>{tmpl.title}</option>
            ))}
          </select>

          {/* Instructions */}
          <label className="block text-sm text-white/50 mb-2">{t.instructionsLabel}</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder={t.instructionsPlaceholder}
            rows={5}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-6
                       text-white placeholder:text-white/20 focus:outline-none focus:border-[#c9a84c]/60
                       transition-colors resize-none"
          />

          <button
            onClick={handleDraft}
            disabled={loading || !docType || !instructions.trim()}
            className="w-full py-4 bg-[#c9a84c] hover:bg-[#b8963a] text-black font-semibold
                       rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> {t.generating}</>
            ) : (
              <><FileDown size={18} /> {t.generate}</>
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
