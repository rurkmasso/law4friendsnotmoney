"use client";
import { motion } from "framer-motion";
import { Search, Scale, FileText, Bell, Users, BookOpen, FolderOpen, Settings, Zap } from "lucide-react";
import Link from "next/link";

const STEPS = [
  {
    icon: Search,
    title_mt: "Fittex bil-Malti jew bl-Ingliż",
    title_en: "Search in Maltese or English",
    desc_mt: "Ikteb mistoqsija b'lingwa normali — mhux kodiċi legali. Eż: 'X inhuma d-drittijiet tat-tenant f'Malta?'",
    desc_en: "Type a question in plain language — no legal codes needed. E.g. 'What are tenant rights in Malta?'",
    color: "text-[#c9a84c]",
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
    color: "text-[#4cc9a8]",
  },
  {
    icon: Scale,
    title_mt: "Ibni l-każ tiegħek",
    title_en: "Build your case",
    desc_mt: "Uża l-Case Builder biex tibni argument legali b'sezzjonijiet multipli — kull dikjarazzjoni ċċitata awtomatikament.",
    desc_en: "Use the Case Builder to build a legal argument with multiple sections — every claim auto-cited.",
    color: "text-[#a84cc9]",
  },
  {
    icon: FileText,
    title_mt: "Abbozza dokumenti",
    title_en: "Draft documents",
    desc_mt: "Agħżel template (kuntratt, opinjoni legali, ittra), daħħal id-dettalji, u niżżel DOCX bil-Malti jew bl-Ingliż.",
    desc_en: "Pick a template (contract, legal opinion, letter), enter details, download DOCX in Maltese or English.",
    color: "text-[#c9874c]",
  },
  {
    icon: FolderOpen,
    title_mt: "Organizza fi Matters",
    title_en: "Organise into Matters",
    desc_mt: "Salva r-riċerka, is-sentenzi, u l-liġijiet fl-istess matter biex tibqa' organizzat.",
    desc_en: "Save research, judgments, and laws into the same matter to stay organised.",
    color: "text-[#4cc94c]",
  },
  {
    icon: Bell,
    title_mt: "Stabbilixxi allerts",
    title_en: "Set up alerts",
    desc_mt: "Irċievi email meta jidhru sentenzi jew liġijiet ġodda relatati mat-termini tiegħek.",
    desc_en: "Get emailed when new judgments or laws appear matching your keywords.",
    color: "text-[#c94c4c]",
  },
  {
    icon: Settings,
    title_mt: "Personalizza",
    title_en: "Personalise",
    desc_mt: "Mur Settings biex tagħżel l-oqsma tal-prattika tiegħek u s-settur awtomatiku.",
    desc_en: "Go to Settings to choose your practice areas and default sector.",
    color: "text-[#8ac94c]",
  },
];

const TIPS = [
  { icon: Zap, mt: "Mistoqsija magħmula qabel? Ir-riżultat jiġi mis-cache — b'xejn u fil-mument.", en: "Asked before? Result comes from cache — instant and free." },
  { icon: Search, mt: "Uża s-suġġerimenti tal-autocomplete biex tifforma mistoqsija aħjar.", en: "Use autocomplete suggestions to sharpen your query." },
  { icon: Users, mt: "Ikklikkja fuq isem avukat fis-sentenza biex tara l-profil kollu tiegħu.", en: "Click a lawyer's name in a judgment to see their full profile." },
];

export default function HowToUsePage() {
  return (
    <div className="min-h-screen bg-[#0a0a14] text-white px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-sm text-white/40 hover:text-white/70">← Lura / Back</Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-[#c9a84c]">Kif Tuża</span> / How to Use
          </h1>
          <p className="text-white/40 text-sm mb-10">LexMalta — il-liġi Maltija f'idejk, b'xejn</p>

          {/* Steps */}
          <div className="flex flex-col gap-4 mb-12">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex gap-4 bg-white/5 border border-white/8 rounded-2xl p-5"
                >
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <span className="w-7 h-7 rounded-full bg-white/5 border border-white/10 text-xs
                                     font-bold flex items-center justify-center text-white/40">
                      {i + 1}
                    </span>
                    {i < STEPS.length - 1 && <div className="w-px flex-1 bg-white/5 min-h-4" />}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={16} className={step.color} />
                      <p className="font-semibold text-sm">{step.title_mt} / {step.title_en}</p>
                    </div>
                    <p className="text-sm text-white/50 mb-1">{step.desc_mt}</p>
                    <p className="text-xs text-white/30 italic">{step.desc_en}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Tips */}
          <div className="bg-[#c9a84c]/5 border border-[#c9a84c]/15 rounded-2xl p-5">
            <p className="text-xs uppercase tracking-widest text-[#c9a84c]/60 mb-4">Tips</p>
            <div className="flex flex-col gap-4">
              {TIPS.map((tip, i) => {
                const Icon = tip.icon;
                return (
                  <div key={i} className="flex gap-3">
                    <Icon size={15} className="text-[#c9a84c] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-white/70">{tip.mt}</p>
                      <p className="text-xs text-white/30 mt-0.5 italic">{tip.en}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-8 text-center">
            <Link href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#c9a84c] to-[#b8963a]
                         text-black font-bold rounded-2xl hover:from-[#d4b356] hover:to-[#c9a84c] transition-all">
              <Search size={16} /> Ibda Tfittxija
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
