"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Briefcase, Mail, Phone, Building2, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { getLawyers, type Lawyer } from "@/lib/api";
import Link from "next/link";

type SortKey = "name" | "case_count" | "firm";

const PRACTICE_AREAS = [
  "Corporate & M&A", "Banking & Finance", "Gaming", "Maritime", "Tax",
  "Employment", "Real Estate", "Criminal", "Family", "IP & Technology",
  "Data Protection", "AML/Compliance", "EU Law", "Litigation", "Immigration",
];

const PROFESSIONS = ["Advocate", "Legal Procurator", "Notary"];

export default function LawyersPage() {
  const [q, setQ] = useState("");
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [filtered, setFiltered] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [filterProfession, setFilterProfession] = useState("");
  const [filterArea, setFilterArea] = useState("");

  const fetchLawyers = async (query?: string) => {
    setLoading(true);
    try {
      const results = await getLawyers(query, 1);
      setLawyers(results);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLawyers(); }, []);

  useEffect(() => {
    let data = [...lawyers];
    if (filterProfession) data = data.filter((l) => l.profession?.toLowerCase().includes(filterProfession.toLowerCase()));
    if (filterArea) data = data.filter((l) => l.practice_areas?.some((a) => a.toLowerCase().includes(filterArea.toLowerCase())));
    data.sort((a, b) => {
      let va: any = a[sortKey as keyof Lawyer] ?? "";
      let vb: any = b[sortKey as keyof Lawyer] ?? "";
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    setFiltered(data);
  }, [lawyers, sortKey, sortAsc, filterProfession, filterArea]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-sm text-white/40 hover:text-white/70">← Lura / Back</Link>
          <Link href="/law-firms" className="text-sm text-[#c9a84c] hover:text-[#d4b356] transition-colors">
            Ara l-Firmi Legali →
          </Link>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold mb-1">
            <span className="text-[#c9a84c]">Avukati</span> ta' Malta
          </h1>
          <p className="text-white/40 text-sm mb-6">
            Lista kompluta minn reġistru uffiċjali — aġġornata awtomatikament
          </p>

          {/* Search + Filter bar */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input value={q} onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchLawyers(q)}
                placeholder="Fittex isem, firma, email..."
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm
                           focus:outline-none focus:border-[#c9a84c]/50 placeholder:text-white/20" />
            </div>
            <button onClick={() => fetchLawyers(q)}
              className="px-4 py-3 bg-[#c9a84c] hover:bg-[#b8963a] text-black rounded-xl font-bold">
              <Search size={16} />
            </button>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 text-sm ${
                showFilters ? "border-[#c9a84c]/50 bg-[#c9a84c]/10 text-[#c9a84c]" : "border-white/10 bg-white/5 text-white/50"
              }`}>
              <SlidersHorizontal size={15} /> Filtra
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-white/40 mb-2">Professjoni</p>
                  <div className="flex flex-wrap gap-2">
                    {PROFESSIONS.map((p) => (
                      <button key={p} onClick={() => setFilterProfession(filterProfession === p ? "" : p)}
                        className={`px-3 py-1 rounded-full text-xs transition-all border ${
                          filterProfession === p ? "bg-[#c9a84c]/15 border-[#c9a84c]/40 text-[#c9a84c]" : "bg-white/5 border-white/10 text-white/50"
                        }`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-2">Qasam tal-Prattika</p>
                  <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/60">
                    <option value="">Kollha</option>
                    {PRACTICE_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {/* Sort bar */}
          <div className="flex items-center gap-1 mb-4 text-xs text-white/30">
            <span>{filtered.length} avukati</span>
            <span className="mx-2">·</span>
            <span>Issortja:</span>
            {(["name", "case_count", "firm"] as SortKey[]).map((key) => (
              <button key={key} onClick={() => toggleSort(key)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all ${
                  sortKey === key ? "text-[#c9a84c] bg-[#c9a84c]/10" : "hover:text-white/60"
                }`}>
                {key === "name" ? "Isem" : key === "case_count" ? "Kawżi" : "Firma"}
                {sortKey === key && <ArrowUpDown size={10} />}
              </button>
            ))}
          </div>

          {/* Lawyer list */}
          {loading ? (
            <p className="text-white/30 text-sm">Qed jgħabbi...</p>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((l) => (
                <Link key={l.warrant_number} href={`/lawyers/${l.warrant_number}`}
                  className="flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/8
                             hover:border-[#c9a84c]/20 rounded-2xl px-5 py-4 transition-all group">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/20
                                  flex items-center justify-center shrink-0 text-[#c9a84c] font-bold text-sm">
                    {l.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm group-hover:text-[#c9a84c] transition-colors">
                      {l.full_name}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                      <span>{l.profession}</span>
                      {l.firm && <><span>·</span><span className="flex items-center gap-1"><Building2 size={11} />{l.firm}</span></>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {l.case_count > 0 && (
                      <span className="flex items-center gap-1 text-xs text-white/30">
                        <Briefcase size={11} /> {l.case_count} kawżi
                      </span>
                    )}
                    {l.email && (
                      <span className="flex items-center gap-1 text-xs text-white/20">
                        <Mail size={11} /> {l.email}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 max-w-32">
                    {l.practice_areas?.slice(0, 2).map((a) => (
                      <span key={a} className="px-2 py-0.5 bg-[#c9a84c]/8 text-[#c9a84c]/60 rounded-full text-xs">{a}</span>
                    ))}
                  </div>
                </Link>
              ))}
              {filtered.length === 0 && !loading && (
                <p className="text-white/30 text-sm py-4">L-ebda avukat ma nstab.</p>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
