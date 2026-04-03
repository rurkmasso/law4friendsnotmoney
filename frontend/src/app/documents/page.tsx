"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Search, ExternalLink, Download } from "lucide-react";
import { getLaws, getJudgments, type Law, type Judgment } from "@/lib/api";
import Link from "next/link";

type Tab = "laws" | "judgments" | "regulatory";

export default function DocumentsPage() {
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
    { name: "FIAU", desc: "AML/CFT Guidance", url: "https://fiaumalta.org/publications", color: "text-[#c9a84c]" },
    { name: "MFSA", desc: "Financial Services", url: "https://www.mfsa.mt/publications", color: "text-[#4c9ac9]" },
    { name: "MGA", desc: "Gaming Authority", url: "https://mga.org.mt/publications", color: "text-[#4cc9a8]" },
    { name: "MCCAA", desc: "Consumer Affairs", url: "https://mccaa.org.mt", color: "text-[#a84cc9]" },
    { name: "OHSA", desc: "Health & Safety", url: "https://ohsa.mt/legislation", color: "text-[#c94c4c]" },
    { name: "IDPC", desc: "Data Protection", url: "https://idpc.org.mt", color: "text-[#c9874c]" },
    { name: "CFR", desc: "Tax Authority", url: "https://cfr.gov.mt", color: "text-[#4cc94c]" },
    { name: "Transport Malta", desc: "Transport Law", url: "https://transport.gov.mt", color: "text-[#4c7cc9]" },
    { name: "MBR", desc: "Business Registry", url: "https://mbr.mt", color: "text-[#c94c8a]" },
    { name: "ERA", desc: "Employment Relations", url: "https://era.org.mt", color: "text-[#8ac94c]" },
    { name: "PA Malta", desc: "Planning Authority", url: "https://pa.org.mt", color: "text-[#c9c44c]" },
    { name: "Parliament", desc: "Acts & Debates", url: "https://parliament.mt", color: "text-[#c94c4c]" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-sm text-white/40 hover:text-white/70">← Lura / Back</Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
          <div className="flex items-center gap-3 mb-6">
            <FileText size={28} className="text-[#c9a84c]" />
            <div>
              <h1 className="text-2xl font-bold">Dokumenti / Documents</h1>
              <p className="text-white/40 text-sm">Il-korp kollu tal-liġi Maltija f'post wieħed</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === t.id ? "bg-[#c9a84c] text-black" : "bg-white/5 text-white/50 hover:bg-white/10"
                }`}>
                {t.label_mt} / {t.label_en}
              </button>
            ))}
          </div>

          {/* Search */}
          {tab !== "regulatory" && (
            <div className="flex gap-2 mb-6">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input value={q} onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchData(q)}
                  placeholder={tab === "laws" ? "Fittex kapitolu jew titlu..." : "Fittex referenza, partijiet, qorti..."}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm
                             focus:outline-none focus:border-[#c9a84c]/50 placeholder:text-white/20" />
              </div>
              <button onClick={() => fetchData(q)}
                className="px-4 py-3 bg-[#c9a84c] hover:bg-[#b8963a] text-black rounded-xl font-semibold">
                <Search size={16} />
              </button>
            </div>
          )}

          {/* Laws */}
          {tab === "laws" && (
            <div className="flex flex-col gap-2">
              {loading ? <p className="text-white/30 text-sm">Qed jgħabbi...</p> :
                laws.map((law) => (
                  <Link key={law.chapter} href={`/view?url=${encodeURIComponent(law.source_url)}&title=${encodeURIComponent(law.chapter + ' ' + law.title)}`}
                    className="flex items-center gap-4 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/8
                               hover:border-[#4c9ac9]/30 rounded-xl transition-all group">
                    <span className="text-xs font-mono text-[#4c9ac9] w-16 shrink-0">{law.chapter}</span>
                    <span className="flex-1 text-sm text-white/70 group-hover:text-white transition-colors truncate">{law.title}</span>
                    {law.last_amended && <span className="text-xs text-white/20 shrink-0">{law.last_amended.split("T")[0]}</span>}
                    <ExternalLink size={13} className="text-white/20 shrink-0" />
                  </Link>
                ))
              }
            </div>
          )}

          {/* Judgments */}
          {tab === "judgments" && (
            <div className="flex flex-col gap-2">
              {loading ? <p className="text-white/30 text-sm">Qed jgħabbi...</p> :
                judgments.map((j) => (
                  <Link key={j.reference} href={`/judgments/${j.reference}`}
                    className="flex items-center gap-4 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/8
                               hover:border-[#c9a84c]/30 rounded-xl transition-all group">
                    <span className="text-xs font-mono text-[#c9a84c] w-28 shrink-0 truncate">{j.reference}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/70 group-hover:text-white truncate">{j.parties}</p>
                      <p className="text-xs text-white/30 mt-0.5">{j.court}</p>
                    </div>
                    <span className="text-xs text-white/20 shrink-0">{j.date}</span>
                    <ExternalLink size={13} className="text-white/20 shrink-0" />
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
                  className="bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/20
                             rounded-2xl p-4 transition-all group">
                  <p className={`font-bold text-sm mb-1 ${body.color}`}>{body.name}</p>
                  <p className="text-xs text-white/40 group-hover:text-white/60 transition-colors">{body.desc}</p>
                  <ExternalLink size={12} className="text-white/20 mt-2" />
                </a>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
