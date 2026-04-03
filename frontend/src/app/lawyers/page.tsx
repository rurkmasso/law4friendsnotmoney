"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Briefcase, Phone, Mail } from "lucide-react";
import { getLawyers, type Lawyer } from "@/lib/api";
import Link from "next/link";

export default function LawyersPage() {
  const [q, setQ] = useState("");
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLawyers = async (query?: string) => {
    setLoading(true);
    try {
      const results = await getLawyers(query);
      setLawyers(results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLawyers(); }, []);

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-sm text-white/40 hover:text-white/70">← Lura / Back</Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-[#c9a84c]">Avukati</span> ta' Malta
          </h1>
          <p className="text-white/50 mb-8">
            Il-lista kompluta ta' avukati, prokuraturi legali u nutara — minn reġistru uffiċjali.
          </p>

          <div className="flex gap-2 mb-8">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchLawyers(q)}
              placeholder="Fittex isem, firma, jew speċjalizzazzjoni..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3
                         focus:outline-none focus:border-[#c9a84c]/60 placeholder:text-white/30"
            />
            <button
              onClick={() => fetchLawyers(q)}
              className="px-5 py-3 bg-[#c9a84c] hover:bg-[#b8963a] text-black font-semibold rounded-xl"
            >
              <Search size={18} />
            </button>
          </div>

          {loading ? (
            <p className="text-white/40">Qed jgħabbi...</p>
          ) : (
            <div className="grid gap-3">
              {lawyers.map((l) => (
                <Link
                  key={l.warrant_number}
                  href={`/lawyers/${l.warrant_number}`}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#c9a84c]/30
                             rounded-2xl p-5 transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold group-hover:text-[#c9a84c] transition-colors">
                        {l.full_name}
                      </p>
                      <p className="text-sm text-white/50 mt-1">{l.profession} · {l.firm || "—"}</p>
                    </div>
                    <span className="text-xs text-white/30 font-mono">{l.warrant_number}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-white/40">
                    {l.case_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Briefcase size={12} /> {l.case_count} kawżi
                      </span>
                    )}
                    {l.email && (
                      <span className="flex items-center gap-1">
                        <Mail size={12} /> {l.email}
                      </span>
                    )}
                    {l.practice_areas?.slice(0, 3).map((a) => (
                      <span key={a} className="px-2 py-0.5 bg-[#c9a84c]/10 text-[#c9a84c] rounded-full">
                        {a}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
