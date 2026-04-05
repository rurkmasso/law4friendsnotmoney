"use client";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { FileText, Search, ExternalLink, ArrowUpDown } from "lucide-react";
import { getLaws, getJudgments, getRegulatoryDocs, type Law, type Judgment, type RegulatoryDoc } from "@/lib/api";
import { useLanguage } from "@/lib/useLanguage";
import Nav from "@/components/Nav";
import Link from "next/link";

type Tab = "laws" | "judgments" | "regulatory";

export default function DocumentsPage() {
  const [lang] = useLanguage();
  const [tab, setTab] = useState<Tab>("laws");
  const [q, setQ] = useState("");
  const [laws, setLaws] = useState<Law[]>([]);
  const [judgments, setJudgments] = useState<Judgment[]>([]);
  const [regDocs, setRegDocs] = useState<RegulatoryDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [regFilter, setRegFilter] = useState("All");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [lawsData, judgmentsData, regData] = await Promise.all([
          getLaws(),
          getJudgments(),
          getRegulatoryDocs(),
        ]);
        if (!cancelled) {
          setLaws(lawsData);
          setJudgments(judgmentsData);
          setRegDocs(regData);
          setFetchFailed(lawsData.length === 0 && judgmentsData.length === 0);
        }
      } catch {
        if (!cancelled) { setLaws([]); setJudgments([]); setRegDocs([]); setFetchFailed(true); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredLaws = useMemo(() => {
    if (!q.trim()) return laws;
    const lower = q.toLowerCase();
    return laws.filter(
      (law) =>
        law.chapter?.toLowerCase().includes(lower) ||
        law.title?.toLowerCase().includes(lower)
    );
  }, [laws, q]);

  const filteredJudgments = useMemo(() => {
    if (!q.trim()) return judgments;
    const lower = q.toLowerCase();
    return judgments.filter(
      (j) =>
        j.reference?.toLowerCase().includes(lower) ||
        j.parties?.toLowerCase().includes(lower) ||
        j.court?.toLowerCase().includes(lower) ||
        j.judge?.toLowerCase().includes(lower)
    );
  }, [judgments, q]);

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

  const currentTotal = tab === "laws" ? laws.length : judgments.length;
  const currentFiltered = tab === "laws" ? filteredLaws.length : filteredJudgments.length;

  return (
    <div className="min-h-screen bg-cream text-[#1a1a2e]">
      <Nav />

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
              <button key={t.id} onClick={() => { setTab(t.id); setQ(""); }}
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
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                <input value={q} onChange={(e) => setQ(e.target.value)}
                  placeholder={tab === "laws" ? "Fittex kapitolu jew titlu..." : "Fittex referenza, partijiet, qorti..."}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-[#e5e0d5] rounded-xl text-sm
                             focus:outline-none focus:border-gold/50 placeholder:text-[#9ca3af] text-[#1a1a2e]" />
              </div>
            </div>
          )}

          {/* Results count */}
          {!loading && tab !== "regulatory" && currentTotal > 0 && (
            <p className="text-xs text-[#9ca3af] mb-4 px-1">
              Showing {currentFiltered} of {currentTotal} results
            </p>
          )}

          {/* Backend error state */}
          {!loading && fetchFailed && laws.length === 0 && judgments.length === 0 && tab !== "regulatory" && (
            <div className="bg-white border border-[#e5e0d5] rounded-2xl shadow-sm p-10 text-center">
              <FileText size={36} className="text-[#9ca3af] mx-auto mb-3" />
              <p className="text-[#1a1a2e] font-semibold mb-1">Il-backend qed jgħabbi... / Backend loading...</p>
              <p className="text-[#6b7280] text-sm mb-3">Run the backend server to see data here</p>
              <p className="text-xs text-[#9ca3af] font-mono">Run: python3 main.py in /backend</p>
              <p className="text-xs text-[#9ca3af] font-mono mt-1">Data loads from static JSON files</p>
            </div>
          )}

          {/* Laws */}
          {tab === "laws" && (
            <div className="flex flex-col gap-2">
              {loading ? <p className="text-[#9ca3af] text-sm">Qed jgħabbi...</p> :
                filteredLaws.length === 0 && laws.length > 0 ? (
                  <p className="text-[#9ca3af] text-sm py-4">L-ebda riżultat.</p>
                ) :
                filteredLaws.map((law) => (
                  <Link key={law.chapter} href={`/detail?type=law&id=${encodeURIComponent(law.chapter)}`}
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
                filteredJudgments.length === 0 && judgments.length > 0 ? (
                  <p className="text-[#9ca3af] text-sm py-4">L-ebda riżultat.</p>
                ) :
                filteredJudgments.map((j) => (
                  <Link key={j.reference} href={`/detail?type=judgment&id=${encodeURIComponent(j.reference)}`}
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
            <div>
              {/* Source filter */}
              <div className="flex flex-wrap gap-2 mb-4">
                {["All", ...REGULATORY_BODIES.map(b => b.name)].map(src => (
                  <button key={src} onClick={() => setRegFilter(src)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      regFilter === src
                        ? "bg-gold/10 border-gold/30 text-gold"
                        : "bg-white border-[#e5e0d5] text-[#6b7280] hover:border-gold/20"
                    }`}>{src}</button>
                ))}
              </div>

              {/* Search in regulatory */}
              <div className="relative mb-4">
                <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                <input value={q} onChange={(e) => setQ(e.target.value)}
                  placeholder={lang === "mt" ? "Fittex dokumenti regolatorji..." : "Search regulatory documents..."}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-[#e5e0d5] rounded-xl text-sm
                             focus:outline-none focus:border-gold/50 placeholder:text-[#9ca3af] text-[#1a1a2e]" />
              </div>

              {/* Scraped regulatory docs */}
              {regDocs.length > 0 && (
                <>
                  <p className="text-xs text-[#9ca3af] mb-3">
                    {regDocs.filter(d => (regFilter === "All" || d.source === regFilter) && (!q.trim() || d.title.toLowerCase().includes(q.toLowerCase()))).length} {lang === "mt" ? "dokumenti" : "documents"}
                  </p>
                  <div className="flex flex-col gap-2 mb-6">
                    {regDocs
                      .filter(d => regFilter === "All" || d.source === regFilter)
                      .filter(d => !q.trim() || d.title.toLowerCase().includes(q.toLowerCase()) || d.description.toLowerCase().includes(q.toLowerCase()))
                      .slice(0, 100)
                      .map((doc, i) => (
                        <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-3 px-4 py-3 bg-white hover:shadow-md border border-[#e5e0d5]
                                     hover:border-gold/30 rounded-xl transition-all group shadow-sm">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            doc.source === "FIAU" ? "bg-gold/10 text-gold border border-gold/20" :
                            doc.source === "MFSA" ? "bg-navy/10 text-navy border border-navy/20" :
                            doc.source === "MGA" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                            doc.source === "IDPC" ? "bg-orange-50 text-orange-600 border border-orange-200" :
                            "bg-[#f5f3ee] text-[#6b7280] border border-[#e5e0d5]"
                          }`}>{doc.source}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#6b7280] group-hover:text-[#1a1a2e] truncate transition-colors">{doc.title}</p>
                            {doc.date && <p className="text-xs text-[#9ca3af] mt-0.5">{doc.date}</p>}
                          </div>
                          <span className="text-[10px] text-[#9ca3af] px-2 py-0.5 rounded bg-[#f5f3ee] shrink-0">{doc.doc_type}</span>
                          {doc.pdf_url && <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-semibold shrink-0">PDF</span>}
                          <ExternalLink size={12} className="text-[#9ca3af] shrink-0" />
                        </a>
                      ))}
                  </div>
                </>
              )}

              {/* Regulatory body links */}
              <p className="text-xs text-[#9ca3af] uppercase tracking-widest mb-3">
                {lang === "mt" ? "Korpi Regolatorji" : "Regulatory Bodies"}
              </p>
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
            </div>
          )}
        </motion.div>

        {/* Footer */}
        <div className="py-10 mt-10 text-center text-xs text-[#9ca3af] border-t border-[#e5e0d5]">
          <p>Tizzju — Powered by Rark Musso · B&apos;Xejn għal Dejjem</p>
        </div>
      </div>
    </div>
  );
}
