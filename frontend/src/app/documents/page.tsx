"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Search, ExternalLink, Scale } from "lucide-react";
import { getLaws, getJudgments, type Law, type Judgment } from "@/lib/api";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";

type Tab = "laws" | "judgments" | "regulatory";

const NAV_LINKS = [
  { href: "/laws", label_mt: "Liġijiet", label_en: "Laws" },
  { href: "/judgments", label_mt: "Sentenzi", label_en: "Judgments" },
  { href: "/lawyers", label_mt: "Avukati", label_en: "Lawyers" },
  { href: "/documents", label_mt: "Dokumenti", label_en: "Documents" },
  { href: "/draft", label_mt: "Abbozza", label_en: "Draft" },
  { href: "/case-builder", label_mt: "Ibni Każ", label_en: "Build Case" },
];

export default function DocumentsPage() {
  const [lang, setLang] = useLanguage();
  const [tab, setTab] = useState<Tab>("laws");
  const [q, setQ] = useState("");
  const [laws, setLaws] = useState<Law[]>([]);
  const [judgments, setJudgments] = useState<Judgment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async (query?: string) => {
    setLoading(true);
    try {
      if (tab === "laws") {
        const data = await getLaws(query);
        setLaws(data);
      } else if (tab === "judgments") {
        const data = await getJudgments({ q: query || "", page: 1 });
        setJudgments(data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [tab]);

  const TABS: { id: Tab; label_mt: string; label_en: string }[] = [
    { id: "laws", label_mt: "Liġijiet", label_en: "Laws" },
    { id: "judgments", label_mt: "Sentenzi", label_en: "Judgments" },
    { id: "regulatory", label_mt: "Regolatorji", label_en: "Regulatory" },
  ];

  const REGULATORY_BODIES = [
    { name: "FIAU", desc: "AML/CFT Guidance", url: "https://fiaumalta.org/publications", color: "text-gold" },
    { name: "MFSA", desc: "Financial Services", url: "https://www.mfsa.mt/publications", color: "text-navy" },
    { name: "MGA", desc: "Gaming Authority", url: "https://mga.org.mt/publications", color: "text-[#0d9488]" },
    { name: "MCCAA", desc: "Consumer Affairs", url: "https://mccaa.org.mt", color: "text-[#7c3aed]" },
    { name: "OHSA", desc: "Health & Safety", url: "https://ohsa.mt/legislation", color: "text-[#dc2626]" },
    { name: "IDPC", desc: "Data Protection", url: "https://idpc.org.mt", color: "text-[#ea580c]" },
    { name: "CFR", desc: "Tax Authority", url: "https://cfr.gov.mt", color: "text-[#16a34a]" },
    { name: "Transport Malta", desc: "Transport Law", url: "https://transport.gov.mt", color: "text-[#2563eb]" },
    { name: "MBR", desc: "Business Registry", url: "https://mbr.mt", color: "text-[#db2777]" },
    { name: "ERA", desc: "Employment Relations", url: "https://era.org.mt", color: "text-[#65a30d]" },
    { name: "PA Malta", desc: "Planning Authority", url: "https://pa.org.mt", color: "text-[#ca8a04]" },
    { name: "Parliament", desc: "Acts & Debates", url: "https://parliament.mt", color: "text-[#dc2626]" },
  ];

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

      <div className="max-w-4xl mx-auto px-4 py-10">
        <Link href="/" className="text-sm text-[#9ca3af] hover:text-[#6b7280]">← Lura / Back</Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
          <div className="flex items-center gap-3 mb-6">
            <FileText size={28} className="text-gold" />
            <div>
              <h1 className="text-2xl font-display font-bold text-[#1a1a2e]">Dokumenti / Documents</h1>
              <p className="text-[#9ca3af] text-sm">Il-korp kollu tal-liġi Maltija f&apos;post wieħed</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === t.id
                    ? "bg-gold text-white shadow-sm"
                    : "bg-white text-[#6b7280] border border-[#e5e0d5] hover:border-gold/30 hover:text-[#1a1a2e]"
                }`}>
                {t.label_mt} / {t.label_en}
              </button>
            ))}
          </div>

          {/* Search */}
          {tab !== "regulatory" && (
            <div className="flex gap-2 mb-6">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                <input value={q} onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchData(q)}
                  placeholder={tab === "laws" ? "Fittex kapitolu jew titlu..." : "Fittex referenza, partijiet, qorti..."}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-[#e5e0d5] rounded-xl text-sm
                             focus:outline-none focus:border-gold/50 placeholder:text-[#9ca3af] text-[#1a1a2e]" />
              </div>
              <button onClick={() => fetchData(q)}
                className="px-4 py-3 bg-gold hover:bg-gold/90 text-white rounded-xl font-semibold transition-colors">
                <Search size={16} />
              </button>
            </div>
          )}

          {/* Laws */}
          {tab === "laws" && (
            <div className="flex flex-col gap-2">
              {loading ? <p className="text-[#9ca3af] text-sm">Qed jgħabbi...</p> :
                laws.map((law) => (
                  <Link key={law.chapter} href={`/view?url=${encodeURIComponent(law.source_url)}&title=${encodeURIComponent(law.chapter + ' ' + law.title)}`}
                    className="flex items-center gap-4 px-4 py-3 bg-white hover:shadow-md border border-[#e5e0d5]
                               hover:border-navy/30 rounded-xl transition-all group shadow-sm">
                    <span className="text-xs font-mono text-navy w-16 shrink-0">{law.chapter}</span>
                    <span className="flex-1 text-sm text-[#6b7280] group-hover:text-[#1a1a2e] transition-colors truncate">{law.title}</span>
                    {law.last_amended && <span className="text-xs text-[#9ca3af] shrink-0">{law.last_amended.split("T")[0]}</span>}
                    <ExternalLink size={13} className="text-[#9ca3af] shrink-0" />
                  </Link>
                ))
              }
            </div>
          )}

          {/* Judgments */}
          {tab === "judgments" && (
            <div className="flex flex-col gap-2">
              {loading ? <p className="text-[#9ca3af] text-sm">Qed jgħabbi...</p> :
                judgments.map((j) => (
                  <Link key={j.reference} href={`/judgments/${j.reference}`}
                    className="flex items-center gap-4 px-4 py-3 bg-white hover:shadow-md border border-[#e5e0d5]
                               hover:border-gold/30 rounded-xl transition-all group shadow-sm">
                    <span className="text-xs font-mono text-gold w-28 shrink-0 truncate">{j.reference}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#6b7280] group-hover:text-[#1a1a2e] truncate transition-colors">{j.parties}</p>
                      <p className="text-xs text-[#9ca3af] mt-0.5">{j.court}</p>
                    </div>
                    <span className="text-xs text-[#9ca3af] shrink-0">{j.date}</span>
                    <ExternalLink size={13} className="text-[#9ca3af] shrink-0" />
                  </Link>
                ))
              }
            </div>
          )}

          {/* Regulatory */}
          {tab === "regulatory" && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {REGULATORY_BODIES.map((body) => (
                <a key={body.name} href={body.url} target="_blank" rel="noopener noreferrer"
                  className="bg-white hover:shadow-md border border-[#e5e0d5] hover:border-gold/30
                             rounded-2xl p-4 transition-all group shadow-sm">
                  <p className={`font-bold text-sm mb-1 ${body.color}`}>{body.name}</p>
                  <p className="text-xs text-[#6b7280] group-hover:text-[#1a1a2e] transition-colors">{body.desc}</p>
                  <ExternalLink size={12} className="text-[#9ca3af] mt-2" />
                </a>
              ))}
            </div>
          )}
        </motion.div>

        {/* Footer */}
        <div className="py-10 mt-10 text-center text-xs text-[#9ca3af] border-t border-[#e5e0d5]">
          <p>LexMalta — Powered by Rark Musso · B&apos;Xejn għal Dejjem</p>
        </div>
      </div>
    </div>
  );
}
