"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Plus, X } from "lucide-react";
import { createAlert } from "@/lib/api";
import Link from "next/link";

export default function AlertsPage() {
  const [email, setEmail] = useState("");
  const [keyword, setKeyword] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const addKeyword = () => {
    if (keyword.trim() && !keywords.includes(keyword.trim())) {
      setKeywords([...keywords, keyword.trim()]);
      setKeyword("");
    }
  };

  const handleSubmit = async () => {
    if (!email || keywords.length === 0) return;
    setLoading(true);
    try {
      await createAlert(email, keywords);
      setSuccess(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white px-4 py-10">
      <div className="max-w-xl mx-auto">
        <Link href="/" className="text-sm text-white/40 hover:text-white/70">← Lura / Back</Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
          <Bell size={32} className="text-[#c9a84c] mb-4" />
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-[#c9a84c]">Allerts</span> Legali
          </h1>
          <p className="text-white/50 mb-8">
            Irċievi email meta jidhru sentenzi, liġijiet, jew aħbarijiet legali ġodda relatati mat-termini tiegħek.
          </p>

          {success ? (
            <div className="bg-[#c9a84c]/10 border border-[#c9a84c]/30 rounded-2xl p-6 text-center">
              <Bell size={24} className="text-[#c9a84c] mx-auto mb-3" />
              <p className="font-semibold">Alert maħluq!</p>
              <p className="text-sm text-white/50 mt-1">Tibgħatlek email meta jidher kontenut ġdid.</p>
            </div>
          ) : (
            <>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@tiegħek.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-4
                           focus:outline-none focus:border-[#c9a84c]/60 placeholder:text-white/30"
              />

              <div className="flex gap-2 mb-3">
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                  placeholder="Żid kelma ewlenija (eż. 'kiri', 'xogħol', 'MFSA')"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3
                             focus:outline-none focus:border-[#c9a84c]/60 placeholder:text-white/30"
                />
                <button
                  onClick={addKeyword}
                  className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>

              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {keywords.map((kw) => (
                    <span
                      key={kw}
                      className="flex items-center gap-1 px-3 py-1 bg-[#c9a84c]/10 text-[#c9a84c]
                                 border border-[#c9a84c]/20 rounded-full text-sm"
                    >
                      {kw}
                      <button onClick={() => setKeywords(keywords.filter((k) => k !== kw))}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !email || keywords.length === 0}
                className="w-full py-4 bg-[#c9a84c] hover:bg-[#b8963a] text-black font-semibold
                           rounded-xl transition-colors disabled:opacity-40"
              >
                {loading ? "Qed joħloq..." : "Oħloq Alert"}
              </button>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
