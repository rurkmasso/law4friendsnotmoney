"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FolderOpen, Plus, Trash2 } from "lucide-react";
import axios from "axios";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Matter {
  id: number;
  name: string;
  sector: string;
  created_at: string;
}

const SECTORS = ["legal", "tax", "maritime", "planning", "compliance", "fintech"];

export default function MatterPage() {
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
    <div className="min-h-screen bg-[#0f0f1a] text-white px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-sm text-white/40 hover:text-white/70">← Lura / Back</Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
          <FolderOpen size={32} className="text-[#c9a84c] mb-4" />
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-[#c9a84c]">Matters</span> — Spazju tal-Kawżi Tiegħek
          </h1>
          <p className="text-white/50 mb-8">
            Salva r-riċerka, is-sentenzi, u l-liġijiet għal kull kawża f'post wieħed.
          </p>

          {!email ? (
            <div className="flex gap-2">
              <input
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { setEmail(emailInput); loadMatters(emailInput); } }}
                placeholder="Daħħal l-email tiegħek biex taċċessa l-matters..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3
                           focus:outline-none focus:border-[#c9a84c]/60 placeholder:text-white/30"
              />
              <button
                onClick={() => { setEmail(emailInput); loadMatters(emailInput); }}
                className="px-5 py-3 bg-[#c9a84c] hover:bg-[#b8963a] text-black font-semibold rounded-xl"
              >
                Idħol
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-white/40 mb-6">{email} · <button onClick={() => setEmail("")} className="underline">Oħroġ</button></p>

              {/* New matter */}
              <div className="flex gap-2 mb-8">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Isem il-matter ġdid..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3
                             focus:outline-none focus:border-[#c9a84c]/60 placeholder:text-white/30"
                />
                <select
                  value={newSector}
                  onChange={(e) => setNewSector(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm"
                >
                  {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button
                  onClick={createMatter}
                  disabled={creating || !newName.trim()}
                  className="px-4 py-3 bg-[#c9a84c] hover:bg-[#b8963a] text-black font-semibold rounded-xl disabled:opacity-40"
                >
                  <Plus size={18} />
                </button>
              </div>

              {/* Matter list */}
              <div className="flex flex-col gap-3">
                {matters.length === 0 && (
                  <p className="text-white/30 text-sm">L-ebda matter għadhom. Oħloq l-ewwel wieħed.</p>
                )}
                {matters.map((m) => (
                  <Link
                    key={m.id}
                    href={`/matter/${m.id}`}
                    className="flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10
                               hover:border-[#c9a84c]/30 rounded-2xl p-4 transition-all group"
                  >
                    <div>
                      <p className="font-medium group-hover:text-[#c9a84c] transition-colors">{m.name}</p>
                      <p className="text-xs text-white/40 mt-1">{m.sector} · {m.created_at?.split("T")[0]}</p>
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); deleteMatter(m.id); }}
                      className="p-2 hover:text-red-400 text-white/20 transition-colors"
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
