"use client";
import { useState, useEffect } from "react";

// SHA-256 hash of the password — change this to update the password
// To generate: echo -n "yourpassword" | shasum -a 256
const PASSWORD_HASH = "c917dfc9a513ae841856f07c002001dc324ad7a23c3bcac2a1cfefd2e9289009";

const STORAGE_KEY = "ligi4friends_auth";

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === PASSWORD_HASH) {
      setAuthed(true);
    }
    setChecking(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hash = await sha256(input);
    if (hash === PASSWORD_HASH) {
      localStorage.setItem(STORAGE_KEY, PASSWORD_HASH);
      setAuthed(true);
      setError(false);
    } else {
      setError(true);
      setInput("");
    }
  };

  if (checking) return null;
  if (authed) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1a1a2e] to-[#16213e]">
      <div className="w-full max-w-sm mx-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="text-3xl font-bold text-white mb-1">
              Ligi<span className="text-[#e2b659]">4</span>Friends
            </div>
            <p className="text-white/40 text-sm">Private Beta</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(false); }}
                placeholder="Enter password"
                autoFocus
                className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#e2b659]/50 transition-all ${
                  error ? "border-red-500/50 shake" : "border-white/10"
                }`}
              />
              {error && (
                <p className="text-red-400 text-xs mt-2 text-center">Wrong password</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-[#e2b659] hover:bg-[#d4a84d] text-[#1a1a2e] font-semibold rounded-xl transition-colors"
            >
              Enter
            </button>
          </form>

          <p className="text-white/20 text-[10px] text-center mt-6">
            Powered by Rark Musso
          </p>
        </div>
      </div>

      <style jsx>{`
        .shake {
          animation: shake 0.4s ease-in-out;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
