"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, Plus, Trash2, FileDown, Loader2, BookOpen, ChevronRight } from "lucide-react";
import { search, createDraft, type Language, type SearchResult } from "@/lib/api";
import CitationCard from "@/components/CitationCard";
import ReactMarkdown from "react-markdown";
import Link from "next/link";

interface CaseSection {
  id: string;
  heading: string;
  query: string;
  result: SearchResult | null;
  loading: boolean;
}

export default function CaseBuilderPage() {
  const [lang, setLang] = useState<Language>("mt");
  const [caseName, setCaseName] = useState("");
  const [sections, setSections] = useState<CaseSection[]>([
    { id: "1", heading: lang === "mt" ? "Fatti Rilevanti" : "Relevant Facts", query: "", result: null, loading: false },
    { id: "2", heading: lang === "mt" ? "Bażi Legali" : "Legal Basis", query: "", result: null, loading: false },
    { id: "3", heading: lang === "mt" ? "Preċedenti Rilevanti" : "Relevant Precedents", query: "", result: null, loading: false },
  ]);
  const [exporting, setExporting] = useState(false);

  const updateSection = (id: string, updates: Partial<CaseSection>) => {
    setSections((s) => s.map((sec) => sec.id === id ? { ...sec, ...updates } : sec));
  };

  const researchSection = async (section: CaseSection) => {
    if (!section.query.trim()) return;
    updateSection(section.id, { loading: true, result: null });
    try {
      const result = await search(section.query, lang);
      updateSection(section.id, { result, loading: false });
    } catch {
      updateSection(section.id, { loading: false });
    }
  };

  const addSection = () => {
    const newId = Date.now().toString();
    setSections((s) => [...s, {
      id: newId,
      heading: lang === "mt" ? "Taqsima Ġdida" : "New Section",
      query: "",
      result: null,
      loading: false,
    }]);
  };

  const removeSection = (id: string) => {
    setSections((s) => s.filter((sec) => sec.id !== id));
  };

  const exportCase = async () => {
    if (!caseName.trim()) return;
    setExporting(true);
    try {
      // Build full case text with all references
      const fullText = sections
        .filter((s) => s.result)
        .map((s) => `## ${s.heading}\n\n${s.result!.answer}\n\n**Sorsi:**\n${
          s.result!.sources.map((src, i) => `[${i+1}] ${src.title} — ${src.url}`).join("\n")
        }`)
        .join("\n\n---\n\n");

      const instructions = `Case name: ${caseName}\n\nFull research:\n${fullText}\n\nDraft a formal legal case summary with all references clearly cited.`;
      const res = await createDraft("legal_opinion", instructions, lang);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${caseName.replace(/\s+/g, "_")}_${lang}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-sm text-white/40 hover:text-white/70">← Lura / Back</Link>
          <button
            onClick={() => setLang(lang === "mt" ? "en" : "mt")}
            className="px-3 py-1.5 rounded-full border border-white/10 hover:border-[#c9a84c]/50 text-xs font-mono transition-all"
          >
            {lang === "mt" ? "EN" : "MT"}
          </button>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <Scale size={28} className="text-[#c9a84c]" />
            <h1 className="text-3xl font-bold">
              {lang === "mt" ? "Ibni l-Każ Tiegħek" : "Build Your Case"}
            </h1>
          </div>
          <p className="text-white/40 text-sm mb-8">
            {lang === "mt"
              ? "Kull sezzjoni tibni fuq l-oħra. Kull dikjarazzjoni ċċitata. Esporta bħala DOCX."
              : "Each section builds on the last. Every claim cited. Export as DOCX."}
          </p>

          {/* Case name */}
          <input
            value={caseName}
            onChange={(e) => setCaseName(e.target.value)}
            placeholder={lang === "mt" ? "Isem il-kawża / matters..." : "Case name / matter..."}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 mb-8 text-lg font-medium
                       focus:outline-none focus:border-[#c9a84c]/50 placeholder:text-white/20 transition-all"
          />

          {/* Sections */}
          <div className="flex flex-col gap-6">
            {sections.map((section, idx) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
              >
                {/* Section header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 bg-white/3">
                  <span className="w-7 h-7 rounded-full bg-[#c9a84c]/15 border border-[#c9a84c]/30
                                   text-[#c9a84c] text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    value={section.heading}
                    onChange={(e) => updateSection(section.id, { heading: e.target.value })}
                    className="flex-1 bg-transparent text-sm font-semibold focus:outline-none text-white/80"
                  />
                  {sections.length > 1 && (
                    <button onClick={() => removeSection(section.id)}
                      className="p-1.5 text-white/20 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="p-5">
                  {/* Query input */}
                  <div className="flex gap-2 mb-4">
                    <input
                      value={section.query}
                      onChange={(e) => updateSection(section.id, { query: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && researchSection(section)}
                      placeholder={lang === "mt" ? "Staqsi mistoqsija dwar din it-taqsima..." : "Research question for this section..."}
                      className="flex-1 bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm
                                 focus:outline-none focus:border-[#c9a84c]/40 placeholder:text-white/20"
                    />
                    <button
                      onClick={() => researchSection(section)}
                      disabled={section.loading || !section.query.trim()}
                      className="px-4 py-3 bg-[#c9a84c] hover:bg-[#b8963a] text-black font-semibold
                                 rounded-xl transition-all disabled:opacity-40 flex items-center gap-1.5 text-sm"
                    >
                      {section.loading ? <Loader2 size={15} className="animate-spin" /> : <><BookOpen size={15} /> {lang === "mt" ? "Ibħes" : "Research"}</>}
                    </button>
                  </div>

                  {/* Result */}
                  <AnimatePresence>
                    {section.result && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="prose prose-invert prose-sm max-w-none mb-4 leading-relaxed">
                          <ReactMarkdown>{section.result.answer}</ReactMarkdown>
                        </div>
                        {section.result.sources?.length > 0 && (
                          <CitationCard
                            citations={section.result.sources.map((s) => ({
                              type: s.type as any,
                              title: s.title,
                              url: s.url,
                              score: s.score,
                            }))}
                            language={lang}
                            onOpen={(c) => window.open(`/view?url=${encodeURIComponent(c.url)}&title=${encodeURIComponent(c.title)}`, "_blank")}
                          />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Add section */}
          <button
            onClick={addSection}
            className="w-full mt-4 py-3 border border-dashed border-white/15 hover:border-[#c9a84c]/30
                       rounded-2xl text-sm text-white/30 hover:text-white/60 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} /> {lang === "mt" ? "Żid Taqsima" : "Add Section"}
          </button>

          {/* Export */}
          <button
            onClick={exportCase}
            disabled={exporting || !caseName.trim() || !sections.some((s) => s.result)}
            className="w-full mt-6 py-4 bg-gradient-to-r from-[#c9a84c] to-[#b8963a]
                       hover:from-[#d4b356] hover:to-[#c9a84c] text-black font-bold rounded-2xl
                       transition-all disabled:opacity-40 flex items-center justify-center gap-2
                       shadow-lg shadow-[#c9a84c]/10"
          >
            {exporting
              ? <><Loader2 size={18} className="animate-spin" /> {lang === "mt" ? "Qed jesporta..." : "Exporting..."}</>
              : <><FileDown size={18} /> {lang === "mt" ? "Esporta l-Każ Sħiħ (DOCX)" : "Export Full Case (DOCX)"}</>
            }
          </button>
          <p className="text-xs text-center text-white/20 mt-3">
            {lang === "mt"
              ? "Il-DOCX ikun fih il-każ kollu b'referenzi sħaħ f'kull dikjarazzjoni."
              : "The DOCX will contain the full case with complete references on every claim."}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
