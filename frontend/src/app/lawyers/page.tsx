"use client";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Briefcase, Mail, Building2, SlidersHorizontal, ArrowUpDown, Scale } from "lucide-react";
import { getLawyers, type Lawyer } from "@/lib/api";
import { useLanguage } from "@/lib/useLanguage";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type SortKey = "name" | "case_count" | "firm";

const PRACTICE_AREAS = [
  "Corporate & M&A", "Banking & Finance", "Gaming", "Maritime", "Tax",
  "Employment", "Real Estate", "Criminal", "Family", "IP & Technology",
  "Data Protection", "AML/Compliance", "EU Law", "Litigation", "Immigration",
];

const PROFESSIONS = ["Advocate", "Legal Procurator", "Notary"];

const NAV_LINKS = [
  { href: "/laws", label_mt: "Liġijiet", label_en: "Laws" },
  { href: "/judgments", label_mt: "Sentenzi", label_en: "Judgments" },
  { href: "/lawyers", label_mt: "Avukati", label_en: "Lawyers" },
  { href: "/documents", label_mt: "Dokumenti", label_en: "Documents" },
  { href: "/igaming", label_mt: "iGaming", label_en: "iGaming" },
];

export default function LawyersPage() {
  const [lang, setLang] = useLanguage();
  const [q, setQ] = useState("");
  const [data, setData] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [filterProfession, setFilterProfession] = useState("");
  const [filterArea, setFilterArea] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const results = await getLawyers(undefined, 1, 200);
        if (!cancelled) { setData(results); setFetchFailed(false); }
      } catch {
        if (!cancelled) { setData([]); setFetchFailed(true); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let results = [...data];

    // Text search
    if (q.trim()) {
      const lower = q.toLowerCase();
      results = results.filter(
        (l) =>
          l.full_name?.toLowerCase().includes(lower) ||
          l.firm?.toLowerCase().includes(lower) ||
          l.email?.toLowerCase().includes(lower) ||
          l.profession?.toLowerCase().includes(lower)
      );
    }

    // Profession filter
    if (filterProfession) {
      results = results.filter((l) => l.profession?.toLowerCase().includes(filterProfession.toLowerCase()));
    }

    // Practice area filter
    if (filterArea) {
      results = results.filter((l) => l.practice_areas?.some((a) => a.toLowerCase().includes(filterArea.toLowerCase())));
    }

    // Sort
    results.sort((a, b) => {
      let va: string | number = (a[sortKey as keyof Lawyer] as string | number) ?? "";
      let vb: string | number = (b[sortKey as keyof Lawyer] as string | number) ?? "";
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

    return results;
  }, [data, q, sortKey, sortAsc, filterProfession, filterArea]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  return (
    <div className="min-h-screen bg-cream text-[#1a1a2e]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-[#e5e0d5] shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Scale size={20} className="text-gold" />
            <span className="text-lg font-display font-bold text-[#1a1a2e]">
              <span className="text-gold">Ligi</span>4Friends
            </span>
          </Link>
          <div className="hidden lg:flex items-center gap-6 text-sm text-[#6b7280]">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href}
                className={`hover:text-gold transition-colors font-medium ${link.href === "/lawyers" ? "text-gold" : ""}`}>
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

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-sm text-[#9ca3af] hover:text-[#6b7280]">← Lura / Back</Link>
          <Link href="/law-firms" className="text-sm text-gold hover:text-gold/80 transition-colors">
            Ara l-Firmi Legali →
          </Link>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-display font-bold mb-1 text-[#1a1a2e]">
            <span className="text-gold">Avukati</span> ta&apos; Malta
          </h1>
          <p className="text-[#9ca3af] text-sm mb-6">
            Lista kompluta minn reġistru uffiċjali — aġġornata awtomatikament
          </p>

          {/* Search + Filter bar */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
              <input value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Fittex isem, firma, email..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-[#e5e0d5] rounded-xl text-sm
                           focus:outline-none focus:border-gold/50 placeholder:text-[#9ca3af] text-[#1a1a2e]" />
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 text-sm ${
                showFilters
                  ? "border-gold/50 bg-gold/10 text-gold"
                  : "border-[#e5e0d5] bg-white text-[#6b7280] hover:border-gold/30"
              }`}>
              <SlidersHorizontal size={15} /> Filtra
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-[#e5e0d5] rounded-2xl p-4 mb-4 shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#9ca3af] mb-2">Professjoni</p>
                  <div className="flex flex-wrap gap-2">
                    {PROFESSIONS.map((p) => (
                      <button key={p} onClick={() => setFilterProfession(filterProfession === p ? "" : p)}
                        className={`px-3 py-1 rounded-full text-xs transition-all border ${
                          filterProfession === p
                            ? "bg-gold/15 border-gold/40 text-gold"
                            : "bg-cream border-[#e5e0d5] text-[#6b7280] hover:border-gold/30"
                        }`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[#9ca3af] mb-2">Qasam tal-Prattika</p>
                  <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)}
                    className="w-full bg-white border border-[#e5e0d5] rounded-xl px-3 py-2 text-sm text-[#6b7280] focus:outline-none focus:border-gold/50">
                    <option value="">Kollha</option>
                    {PRACTICE_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {/* Sort bar + count */}
          <div className="flex items-center gap-1 mb-4 text-xs text-[#9ca3af]">
            {!loading && data.length > 0 && (
              <>
                <span>Showing {filtered.length} of {data.length} avukati</span>
                <span className="mx-2">·</span>
              </>
            )}
            <span>Issortja:</span>
            {(["name", "case_count", "firm"] as SortKey[]).map((key) => (
              <button key={key} onClick={() => toggleSort(key)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all ${
                  sortKey === key ? "text-gold bg-gold/10" : "hover:text-[#6b7280]"
                }`}>
                {key === "name" ? "Isem" : key === "case_count" ? "Kawżi" : "Firma"}
                {sortKey === key && <ArrowUpDown size={10} />}
              </button>
            ))}
          </div>

          {/* Lawyer list */}
          {loading ? (
            <p className="text-[#9ca3af] text-sm">Qed jgħabbi...</p>
          ) : data.length === 0 && fetchFailed ? (
            <div className="bg-white border border-[#e5e0d5] rounded-2xl shadow-sm p-10 text-center">
              <Briefcase size={36} className="text-[#9ca3af] mx-auto mb-3" />
              <p className="text-[#1a1a2e] font-semibold mb-1">Il-backend qed jgħabbi... / Backend loading...</p>
              <p className="text-[#6b7280] text-sm mb-3">Run the backend server to see data here</p>
              <p className="text-xs text-[#9ca3af] font-mono">Run: python3 main.py in /backend</p>
              <p className="text-xs text-[#9ca3af] font-mono mt-1">API: {API}/api/lawyers/</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((l) => (
                <Link key={l.warrant_number} href={`/lawyers/${l.warrant_number}`}
                  className="flex items-center gap-4 bg-white hover:shadow-md border border-[#e5e0d5]
                             hover:border-gold/30 rounded-2xl px-5 py-4 transition-all group shadow-sm">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20
                                  flex items-center justify-center shrink-0 text-gold font-bold text-sm">
                    {l.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#1a1a2e] group-hover:text-gold transition-colors">
                      {l.full_name}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-[#9ca3af]">
                      <span>{l.profession}</span>
                      {l.firm && <><span>·</span><span className="flex items-center gap-1"><Building2 size={11} />{l.firm}</span></>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {l.case_count > 0 && (
                      <span className="flex items-center gap-1 text-xs text-[#9ca3af]">
                        <Briefcase size={11} /> {l.case_count} kawżi
                      </span>
                    )}
                    {l.email && (
                      <span className="flex items-center gap-1 text-xs text-[#9ca3af]">
                        <Mail size={11} /> {l.email}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 max-w-32">
                    {l.practice_areas?.slice(0, 2).map((a) => (
                      <span key={a} className="px-2 py-0.5 bg-gold/8 text-gold/70 rounded-full text-xs border border-gold/15">{a}</span>
                    ))}
                  </div>
                </Link>
              ))}
              {filtered.length === 0 && data.length > 0 && (
                <p className="text-[#9ca3af] text-sm py-4">L-ebda avukat ma nstab.</p>
              )}
            </div>
          )}
        </motion.div>

        {/* Footer */}
        <div className="py-10 mt-10 text-center text-xs text-[#9ca3af] border-t border-[#e5e0d5]">
          <p>Ligi4Friends — Powered by Rark Musso · B&apos;Xejn għal Dejjem</p>
        </div>
      </div>
    </div>
  );
}
