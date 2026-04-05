"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FolderOpen, Plus, Trash2 } from "lucide-react";
import axios from "axios";
import Link from "next/link";
import { useLanguage } from "@/lib/useLanguage";
import Nav from "@/components/Nav";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Matter {
  id: number;
  name: string;
  sector: string;
  created_at: string;
}

const SECTORS = ["legal", "tax", "maritime", "planning", "compliance", "fintech"];

export default function MatterPage() {
  const [lang] = useLanguage();
  const [email, setEmail] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [matters, setMatters] = useState<Matter[]>([]);
  const [newName, setNewName] = useState("");
  const [newSector, setNewSector] = useState("legal");
  const [creating, setCreating] = useState(false);

  const loadMatters = async (e: string) => {
    const res = await axios.get(`${API}/api/matter/`, { params: { email: e } });
    setMatters(res.data);
  };

  const createMatter = async () => {
    if (!newName.trim() || !email) return;
    setCreating(true);
    await axios.post(`${API}/api/matter/`, { name: newName, owner_email: email, sector: newSector });
    await loadMatters(email);
    setNewName("");
    setCreating(false);
  };

  const deleteMatter = async (id: number) => {
    await axios.delete(`${API}/api/matter/${id}`);
    setMatters(matters.filter((m) => m.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#f5f3ee]">
      <Nav />

      <div className="max-w-3xl mx-auto px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <FolderOpen size={20} className="text-gold" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-[#1a1a2e]">
                {lang === "mt" ? "Matters — Spazju tal-Kawżi Tiegħek" : "Matters — Your Case Workspace"}
              </h1>
              <p className="text-sm text-[#6b7280]">
                {lang === "mt"
                  ? "Salva r-riċerka, is-sentenzi, u l-liġijiet għal kull kawża f'post wieħed."
                  : "Save research, judgments, and laws for each case in one place."}
              </p>
            </div>
          </div>

          {!email ? (
            <div className="bg-white border border-[#e5e0d5] rounded-2xl shadow-sm p-6 mt-8">
              <p className="text-sm font-medium text-[#1a1a2e] mb-3">
                {lang === "mt" ? "Daħħal l-email tiegħek biex taċċessa l-matters" : "Enter your email to access your matters"}
              </p>
              <div className="flex gap-2">
                <input
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { setEmail(emailInput); loadMatters(emailInput); } }}
                  placeholder="email@example.com"
                  className="flex-1 bg-white border border-[#e5e0d5] rounded-xl px-4 py-3 text-[#1a1a2e]
                             focus:outline-none focus:border-gold/50 placeholder:text-[#9ca3af] text-sm"
                />
                <button
                  onClick={() => { setEmail(emailInput); loadMatters(emailInput); }}
                  className="px-5 py-3 bg-gold hover:bg-[#a8852f] text-white font-semibold rounded-xl text-sm transition-colors"
                >
                  {lang === "mt" ? "Idħol" : "Enter"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs text-[#9ca3af] mt-6 mb-6">
                {email} ·{" "}
                <button onClick={() => setEmail("")} className="underline hover:text-[#6b7280] transition-colors">
                  {lang === "mt" ? "Oħroġ" : "Sign out"}
                </button>
              </p>

              {/* New matter */}
              <div className="bg-white border border-[#e5e0d5] rounded-2xl shadow-sm p-4 mb-6">
                <p className="text-xs font-medium text-[#6b7280] mb-3">
                  {lang === "mt" ? "Matter ġdid" : "New matter"}
                </p>
                <div className="flex gap-2">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={lang === "mt" ? "Isem il-matter ġdid..." : "New matter name..."}
                    className="flex-1 bg-white border border-[#e5e0d5] rounded-xl px-4 py-3 text-[#1a1a2e]
                               focus:outline-none focus:border-gold/50 placeholder:text-[#9ca3af] text-sm"
                  />
                  <select
                    value={newSector}
                    onChange={(e) => setNewSector(e.target.value)}
                    className="bg-white border border-[#e5e0d5] rounded-xl px-3 py-3 text-sm text-[#1a1a2e] focus:outline-none focus:border-gold/50"
                  >
                    {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button
                    onClick={createMatter}
                    disabled={creating || !newName.trim()}
                    className="px-4 py-3 bg-gold hover:bg-[#a8852f] text-white font-semibold rounded-xl disabled:opacity-40 transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              {/* Matter list */}
              <div className="flex flex-col gap-3">
                {matters.length === 0 && (
                  <div className="bg-white border border-[#e5e0d5] rounded-2xl p-8 text-center">
                    <FolderOpen size={32} className="text-[#9ca3af] mx-auto mb-3" />
                    <p className="text-[#6b7280] text-sm">
                      {lang === "mt" ? "L-ebda matter għadhom. Oħloq l-ewwel wieħed." : "No matters yet. Create your first one."}
                    </p>
                  </div>
                )}
                {matters.map((m) => (
                  <Link
                    key={m.id}
                    href={`/matter/${m.id}`}
                    className="flex items-center justify-between bg-white hover:shadow-md border border-[#e5e0d5]
                               hover:border-gold/30 rounded-2xl p-4 transition-all group shadow-sm"
                  >
                    <div>
                      <p className="font-medium text-[#1a1a2e] group-hover:text-gold transition-colors">{m.name}</p>
                      <p className="text-xs text-[#9ca3af] mt-1 capitalize">{m.sector} · {m.created_at?.split("T")[0]}</p>
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); deleteMatter(m.id); }}
                      className="p-2 hover:text-red-500 text-[#9ca3af] transition-colors rounded-lg hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </Link>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
