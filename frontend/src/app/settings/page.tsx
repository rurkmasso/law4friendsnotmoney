"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, Bell, Globe, Scale, BookOpen, Save, Check } from "lucide-react";
import Link from "next/link";

interface UserSettings {
  language: "mt" | "en";
  practiceAreas: string[];
  emailAlerts: boolean;
  alertFrequency: "instant" | "daily" | "weekly";
  defaultSector: string;
  showTrending: boolean;
  showDailyFeed: boolean;
  compactMode: boolean;
  email: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  language: "mt",
  practiceAreas: [],
  emailAlerts: false,
  alertFrequency: "daily",
  defaultSector: "legal",
  showTrending: true,
  showDailyFeed: true,
  compactMode: false,
  email: "",
};

const PRACTICE_AREAS = [
  "Liġi Ċivili", "Liġi Kriminali", "Liġi Kummerċjali", "Liġi tax-Xogħol",
  "Liġi tal-Proprjetà", "Liġi Marittima", "Liġi Fiskali", "AML/CFT",
  "GDPR/Data Protection", "Liġi tal-Gaming", "Servizzi Finanzjarji", "Liġi tal-Ippjanar",
  "Liġi Kostituzzjonali", "Liġi Familjari", "Liġi tal-Wirt",
];

const SECTORS = ["legal", "tax", "maritime", "planning", "compliance", "fintech"];

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("lexmalta_settings");
    if (stored) {
      try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) }); }
      catch { }
    }
  }, []);

  const save = () => {
    localStorage.setItem("lexmalta_settings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleArea = (area: string) => {
    setSettings((s) => ({
      ...s,
      practiceAreas: s.practiceAreas.includes(area)
        ? s.practiceAreas.filter((a) => a !== area)
        : [...s.practiceAreas, area],
    }));
  };

  const toggle = (key: keyof UserSettings) =>
    setSettings((s) => ({ ...s, [key]: !s[key as keyof UserSettings] }));

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-sm text-white/40 hover:text-white/70">← Lura / Back</Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
          <div className="flex items-center gap-3 mb-8">
            <Settings size={28} className="text-[#c9a84c]" />
            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-white/40 text-sm">Personalizza l-esperjenza tiegħek</p>
            </div>
          </div>

          <div className="flex flex-col gap-6">

            {/* Language */}
            <Section icon={Globe} title="Lingwa / Language">
              <div className="flex gap-2">
                {(["mt", "en"] as const).map((l) => (
                  <button key={l}
                    onClick={() => setSettings((s) => ({ ...s, language: l }))}
                    className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
                      settings.language === l
                        ? "bg-[#c9a84c] text-black"
                        : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}
                  >
                    {l === "mt" ? "🇲🇹 Malti" : "🇬🇧 English"}
                  </button>
                ))}
              </div>
            </Section>

            {/* Practice areas */}
            <Section icon={Scale} title="Oqsma tal-Prattika / Practice Areas">
              <p className="text-xs text-white/30 mb-3">
                Agħżel l-oqsma tiegħek — il-feed u s-suġġerimenti jiġu personalizzati
              </p>
              <div className="flex flex-wrap gap-2">
                {PRACTICE_AREAS.map((area) => (
                  <button
                    key={area}
                    onClick={() => toggleArea(area)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      settings.practiceAreas.includes(area)
                        ? "bg-[#c9a84c]/15 border-[#c9a84c]/40 text-[#c9a84c]"
                        : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </Section>

            {/* Default sector */}
            <Section icon={BookOpen} title="Settur Awtomatiku / Default Sector">
              <div className="grid grid-cols-3 gap-2">
                {SECTORS.map((s) => (
                  <button key={s}
                    onClick={() => setSettings((prev) => ({ ...prev, defaultSector: s }))}
                    className={`py-2 rounded-xl text-sm capitalize transition-all ${
                      settings.defaultSector === s
                        ? "bg-[#c9a84c]/15 border border-[#c9a84c]/40 text-[#c9a84c]"
                        : "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Section>

            {/* Alerts */}
            <Section icon={Bell} title="Allerts bl-Email">
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings((s) => ({ ...s, email: e.target.value }))}
                placeholder="email@tiegħek.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-3
                           focus:outline-none focus:border-[#c9a84c]/60 placeholder:text-white/20 text-sm"
              />
              <Toggle
                label="Irċievi allerts bl-email"
                value={settings.emailAlerts}
                onChange={() => toggle("emailAlerts")}
              />
              {settings.emailAlerts && (
                <div className="flex gap-2 mt-3">
                  {(["instant", "daily", "weekly"] as const).map((f) => (
                    <button key={f}
                      onClick={() => setSettings((s) => ({ ...s, alertFrequency: f }))}
                      className={`flex-1 py-2 rounded-xl text-xs capitalize transition-all ${
                        settings.alertFrequency === f
                          ? "bg-[#c9a84c] text-black font-semibold"
                          : "bg-white/5 text-white/50 hover:bg-white/10"
                      }`}
                    >
                      {f === "instant" ? "Immedjat" : f === "daily" ? "Kuljum" : "Kull Ġimgħa"}
                    </button>
                  ))}
                </div>
              )}
            </Section>

            {/* Display */}
            <Section icon={Settings} title="Wiri / Display">
              <div className="flex flex-col gap-3">
                <Toggle label="Uri t-tfittxijiet trending" value={settings.showTrending} onChange={() => toggle("showTrending")} />
                <Toggle label="Uri l-feed tal-ġurnata" value={settings.showDailyFeed} onChange={() => toggle("showDailyFeed")} />
                <Toggle label="Mod kompatt" value={settings.compactMode} onChange={() => toggle("compactMode")} />
              </div>
            </Section>

          </div>

          {/* Save */}
          <button
            onClick={save}
            className="w-full mt-8 py-4 bg-gradient-to-r from-[#c9a84c] to-[#b8963a]
                       hover:from-[#d4b356] hover:to-[#c9a84c] text-black font-bold rounded-2xl
                       transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#c9a84c]/10"
          >
            {saved ? <><Check size={18} /> Salvat!</> : <><Save size={18} /> Salva s-Settings</>}
          </button>
        </motion.div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/5 border border-white/8 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className="text-[#c9a84c]" />
        <p className="font-semibold text-sm">{title}</p>
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-white/60">{label}</span>
      <button
        onClick={onChange}
        className={`relative w-11 h-6 rounded-full transition-all ${value ? "bg-[#c9a84c]" : "bg-white/10"}`}
      >
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${value ? "left-6" : "left-1"}`} />
      </button>
    </div>
  );
}
