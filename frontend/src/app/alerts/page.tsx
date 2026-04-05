"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Plus, X } from "lucide-react";
import { createAlert } from "@/lib/api";
import Link from "next/link";
import { useLanguage } from "@/lib/useLanguage";
import Nav from "@/components/Nav";

export default function AlertsPage() {
  const [lang] = useLanguage();
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
    <div className="min-h-screen bg-[#f5f3ee]">
      <Nav />

      <div className="max-w-xl mx-auto px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <Bell size={20} className="text-gold" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-[#1a1a2e]">
                {lang === "mt" ? "Allerts Legali" : "Legal Alerts"}
              </h1>
              <p className="text-sm text-[#6b7280]">
                {lang === "mt"
                  ? "Irċievi notifiki għall-aġġornamenti legali"
                  : "Receive notifications for legal updates"}
              </p>
            </div>
          </div>

          <p className="text-[#6b7280] mb-8 text-sm leading-relaxed">
            {lang === "mt"
              ? "Irċievi email meta jidhru sentenzi, liġijiet, jew aħbarijiet legali ġodda relatati mat-termini tiegħek."
              : "Get emailed when new judgments, laws, or legal news appear matching your keywords."}
          </p>

          {success ? (
            <div className="bg-white border border-[#e5e0d5] rounded-2xl shadow-sm p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
                <Bell size={24} className="text-gold" />
              </div>
              <p className="font-semibold text-[#1a1a2e] text-lg mb-1">
                {lang === "mt" ? "Alert maħluq!" : "Alert created!"}
              </p>
              <p className="text-sm text-[#6b7280]">
                {lang === "mt"
                  ? "Tibgħatlek email meta jidher kontenut ġdid."
                  : "You'll be emailed when new content appears."}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-[#e5e0d5] rounded-2xl shadow-sm p-6 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-[#6b7280] mb-1.5">
                  {lang === "mt" ? "L-indirizz email tiegħek" : "Your email address"}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full bg-white border border-[#e5e0d5] rounded-xl px-4 py-3 text-[#1a1a2e]
                             focus:outline-none focus:border-gold/50 placeholder:text-[#9ca3af] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6b7280] mb-1.5">
                  {lang === "mt" ? "Kliem ewlieni" : "Keywords"}
                </label>
                <div className="flex gap-2">
                  <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                    placeholder={lang === "mt" ? "Eż. 'kiri', 'xogħol', 'MFSA'" : "E.g. 'lease', 'employment', 'MFSA'"}
                    className="flex-1 bg-white border border-[#e5e0d5] rounded-xl px-4 py-3 text-[#1a1a2e]
                               focus:outline-none focus:border-gold/50 placeholder:text-[#9ca3af] text-sm"
                  />
                  <button
                    onClick={addKeyword}
                    className="px-4 py-3 bg-gold/10 hover:bg-gold/20 text-gold rounded-xl transition-colors border border-gold/20"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {keywords.map((kw) => (
                    <span
                      key={kw}
                      className="flex items-center gap-1 px-3 py-1 bg-gold/8 text-gold
                                 border border-gold/20 rounded-full text-xs font-medium"
                    >
                      {kw}
                      <button
                        onClick={() => setKeywords(keywords.filter((k) => k !== kw))}
                        className="ml-0.5 hover:text-[#1a1a2e] transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !email || keywords.length === 0}
                className="w-full py-3.5 bg-gold hover:bg-[#a8852f] text-white font-semibold
                           rounded-xl transition-colors disabled:opacity-40 text-sm"
              >
                {loading
                  ? (lang === "mt" ? "Qed joħloq..." : "Creating...")
                  : (lang === "mt" ? "Oħloq Alert" : "Create Alert")}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
