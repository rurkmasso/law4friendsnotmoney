"use client";
import { motion } from "framer-motion";
import { Search, Scale, FileText, Bell, Users, BookOpen, FolderOpen, Settings, Zap } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/useLanguage";

const STEPS = [
  {
    icon: Search,
    title_mt: "Fittex bil-Malti jew bl-Ingliż",
    title_en: "Search in Maltese or English",
    desc_mt: "Ikteb mistoqsija b'lingwa normali — mhux kodiċi legali. Eż: 'X inhuma d-drittijiet tat-tenant f'Malta?'",
    desc_en: "Type a question in plain language — no legal codes needed. E.g. 'What are tenant rights in Malta?'",
    color: "text-gold",
  },
  {
    icon: Scale,
    title_mt: "Irċievi tweġiba ċċitata",
    title_en: "Get a cited answer",
    desc_mt: "Kull tweġiba tiġi bil-kapitoli tal-liġi, referenzi tal-kawżi, u links għall-dokumenti oriġinali.",
    desc_en: "Every answer comes with law chapters, case references, and links to original documents.",
    color: "text-[#4c9ac9]",
  },
  {
    icon: BookOpen,
    title_mt: "Iftaħ id-dokumenti",
    title_en: "Open documents",
    desc_mt: "Ikklikkja fuq kwalunkwe sors biex tara l-PDF jew DOCX direttament fil-browser — mingħajr ma toħroġ.",
    desc_en: "Click any source to view the PDF or DOCX directly in the browser — without leaving the site.",
    color: "text-[#0d9488]",
  },
  {
    icon: Scale,
    title_mt: "Ibni l-każ tiegħek",
    title_en: "Build your case",
    desc_mt: "Uża l-Case Builder biex tibni argument legali b'sezzjonijiet multipli — kull dikjarazzjoni ċċitata awtomatikament.",
    desc_en: "Use the Case Builder to build a legal argument with multiple sections — every claim auto-cited.",
    color: "text-[#7c3aed]",
  },
  {
    icon: FileText,
    title_mt: "Abbozza dokumenti",
    title_en: "Draft documents",
    desc_mt: "Agħżel template (kuntratt, opinjoni legali, ittra), daħħal id-dettalji, u niżżel DOCX bil-Malti jew bl-Ingliż.",
    desc_en: "Pick a template (contract, legal opinion, letter), enter details, download DOCX in Maltese or English.",
    color: "text-[#ea580c]",
  },
  {
    icon: FolderOpen,
    title_mt: "Organizza fi Matters",
    title_en: "Organise into Matters",
    desc_mt: "Salva r-riċerka, is-sentenzi, u l-liġijiet fl-istess matter biex tibqa' organizzat.",
    desc_en: "Save research, judgments, and laws into the same matter to stay organised.",
    color: "text-[#16a34a]",
  },
  {
    icon: Bell,
    title_mt: "Stabbilixxi allerts",
    title_en: "Set up alerts",
    desc_mt: "Irċievi email meta jidhru sentenzi jew liġijiet ġodda relatati mat-termini tiegħek.",
    desc_en: "Get emailed when new judgments or laws appear matching your keywords.",
    color: "text-[#dc2626]",
  },
  {
    icon: Settings,
    title_mt: "Personalizza",
    title_en: "Personalise",
    desc_mt: "Mur Settings biex tagħżel l-oqsma tal-prattika tiegħek u s-settur awtomatiku.",
    desc_en: "Go to Settings to choose your practice areas and default sector.",
    color: "text-[#6b7280]",
  },
];

const TIPS = [
  { icon: Zap, mt: "Mistoqsija magħmula qabel? Ir-riżultat jiġi mis-cache — b'xejn u fil-mument.", en: "Asked before? Result comes from cache — instant and free." },
  { icon: Search, mt: "Uża s-suġġerimenti tal-autocomplete biex tifforma mistoqsija aħjar.", en: "Use autocomplete suggestions to sharpen your query." },
  { icon: Users, mt: "Ikklikkja fuq isem avukat fis-sentenza biex tara l-profil kollu tiegħu.", en: "Click a lawyer's name in a judgment to see their full profile." },
];

export default function HowToUsePage() {
  const [lang, setLang] = useLanguage();

  return (
    <div className="min-h-screen bg-[#f5f3ee]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-[#e5e0d5] shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-display text-lg font-bold text-navy">
            SacLigi
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/sectors" className="text-sm text-[#6b7280] hover:text-[#1a1a2e] transition-colors">
              {lang === "mt" ? "Setturi" : "Sectors"}
            </Link>
            <Link href="/matter" className="text-sm text-[#6b7280] hover:text-[#1a1a2e] transition-colors">
              Matters
            </Link>
            <Link href="/how-to-use" className="text-sm text-gold font-medium">
              {lang === "mt" ? "Kif Tuża" : "How to Use"}
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

      <div className="max-w-3xl mx-auto px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
          <h1 className="font-display text-3xl font-bold text-[#1a1a2e] mb-2">
            <span className="text-gold">{lang === "mt" ? "Kif Tuża" : "How to Use"}</span>
            {lang === "mt" ? " SacLigi" : " SacLigi"}
          </h1>
          <p className="text-[#6b7280] text-sm mb-10">
            {lang === "mt" ? "il-liġi Maltija f'idejk, b'xejn" : "Maltese law at your fingertips, free"}
          </p>

          {/* Steps */}
          <div className="flex flex-col gap-3 mb-12">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex gap-4 bg-white border border-[#e5e0d5] rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <span className="w-7 h-7 rounded-full bg-[#f5f3ee] border border-[#e5e0d5] text-xs
                                     font-bold flex items-center justify-center text-[#6b7280]">
                      {i + 1}
                    </span>
                    {i < STEPS.length - 1 && <div className="w-px flex-1 bg-[#e5e0d5] min-h-4" />}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={16} className={step.color} />
                      <p className="font-semibold text-sm text-[#1a1a2e]">
                        {lang === "mt" ? step.title_mt : step.title_en}
                      </p>
                    </div>
                    <p className="text-sm text-[#6b7280]">
                      {lang === "mt" ? step.desc_mt : step.desc_en}
                    </p>
                    {lang === "mt" && (
                      <p className="text-xs text-[#9ca3af] italic mt-0.5">{step.desc_en}</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Tips */}
          <div className="bg-white border border-[#e5e0d5] rounded-2xl shadow-sm p-5">
            <p className="text-xs uppercase tracking-widest text-gold mb-4 font-medium">Tips</p>
            <div className="flex flex-col gap-4">
              {TIPS.map((tip, i) => {
                const Icon = tip.icon;
                return (
                  <div key={i} className="flex gap-3">
                    <Icon size={15} className="text-gold shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-[#1a1a2e]">
                        {lang === "mt" ? tip.mt : tip.en}
                      </p>
                      {lang === "mt" && (
                        <p className="text-xs text-[#9ca3af] mt-0.5 italic">{tip.en}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gold hover:bg-[#a8852f]
                         text-white font-bold rounded-2xl transition-colors shadow-sm"
            >
              <Search size={16} />
              {lang === "mt" ? "Ibda Tfittxija" : "Start Searching"}
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
