"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, Bell, Globe, Scale, BookOpen, Save, Check } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/useLanguage";

interface UserSettings {
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
  const [lang, setLang] = useLanguage();
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
    <div className="min-h-screen bg-[#f5f3ee]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-[#e5e0d5] shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-display text-lg font-bold text-navy">
            SacLigi
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/sectors" className="text-sm text-[#6b7280] hover:text-[#1a1a2e] transition-colors">
              {lang === "mt" ? "Setturi" : "Sectors"}
            </Link>
            <Link href="/matter" className="text-sm text-[#6b7280] hover:text-[#1a1a2e] transition-colors">
              Matters
            </Link>
            <Link href="/settings" className="text-sm text-gold font-medium">
              Settings
            </Link>
            <button
              onClick={() => setLang(lang === "mt" ? "en" : "mt")}
              className="px-3 py-1 rounded-full border border-[#e5e0d5] text-xs font-mono text-[#6b7280] hover:border-gold/50 transition-colors"
            >
              {lang === "mt" ? "EN" : "MT"}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <Settings size={20} className="text-gold" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-[#1a1a2e]">Settings</h1>
              <p className="text-sm text-[#6b7280]">
                {lang === "mt" ? "Personalizza l-esperjenza tiegħek" : "Personalise your experience"}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">

            {/* Language */}
            <Section icon={Globe} title={lang === "mt" ? "Lingwa / Language" : "Language"}>
              <div className="flex gap-2">
                {(["mt", "en"] as const).map((l) => (
                  <button key={l}
                    onClick={() => setLang(l)}
                    className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
                      lang === l
                        ? "bg-gold text-white shadow-sm"
                        : "bg-[#f5f3ee] text-[#6b7280] hover:bg-[#ede9e0] border border-[#e5e0d5]"
                    }`}
                  >
                    {l === "mt" ? "🇲🇹 Malti" : "🇬🇧 English"}
                  </button>
                ))}
              </div>
            </Section>

            {/* Practice areas */}
            <Section icon={Scale} title={lang === "mt" ? "Oqsma tal-Prattika" : "Practice Areas"}>
              <p className="text-xs text-[#9ca3af] mb-3">
                {lang === "mt"
                  ? "Agħżel l-oqsma tiegħek — il-feed u s-suġġerimenti jiġu personalizzati"
                  : "Choose your areas — the feed and suggestions will be personalised"}
              </p>
              <div className="flex flex-wrap gap-2">
                {PRACTICE_AREAS.map((area) => (
                  <button
                    key={area}
                    onClick={() => toggleArea(area)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      settings.practiceAreas.includes(area)
                        ? "bg-gold/10 border-gold/40 text-gold"
                        : "bg-[#f5f3ee] border-[#e5e0d5] text-[#6b7280] hover:bg-[#ede9e0]"
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </Section>

            {/* Default sector */}
            <Section icon={BookOpen} title={lang === "mt" ? "Settur Awtomatiku" : "Default Sector"}>
              <div className="grid grid-cols-3 gap-2">
                {SECTORS.map((s) => (
                  <button key={s}
                    onClick={() => setSettings((prev) => ({ ...prev, defaultSector: s }))}
                    className={`py-2 rounded-xl text-sm capitalize transition-all border ${
                      settings.defaultSector === s
                        ? "bg-gold/10 border-gold/40 text-gold font-medium"
                        : "bg-[#f5f3ee] border-[#e5e0d5] text-[#6b7280] hover:bg-[#ede9e0]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Section>

            {/* Alerts */}
            <Section icon={Bell} title={lang === "mt" ? "Allerts bl-Email" : "Email Alerts"}>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings((s) => ({ ...s, email: e.target.value }))}
                placeholder="email@example.com"
                className="w-full bg-white border border-[#e5e0d5] rounded-xl px-4 py-3 mb-3
                           focus:outline-none focus:border-gold/50 placeholder:text-[#9ca3af] text-sm text-[#1a1a2e]"
              />
              <Toggle
                label={lang === "mt" ? "Irċievi allerts bl-email" : "Receive email alerts"}
                value={settings.emailAlerts}
                onChange={() => toggle("emailAlerts")}
              />
              {settings.emailAlerts && (
                <div className="flex gap-2 mt-3">
                  {(["instant", "daily", "weekly"] as const).map((f) => (
                    <button key={f}
                      onClick={() => setSettings((s) => ({ ...s, alertFrequency: f }))}
                      className={`flex-1 py-2 rounded-xl text-xs capitalize transition-all border ${
                        settings.alertFrequency === f
                          ? "bg-gold text-white font-semibold border-gold"
                          : "bg-[#f5f3ee] text-[#6b7280] border-[#e5e0d5] hover:bg-[#ede9e0]"
                      }`}
                    >
                      {f === "instant"
                        ? (lang === "mt" ? "Immedjat" : "Instant")
                        : f === "daily"
                        ? (lang === "mt" ? "Kuljum" : "Daily")
                        : (lang === "mt" ? "Kull Ġimgħa" : "Weekly")}
                    </button>
                  ))}
                </div>
              )}
            </Section>

            {/* Display */}
            <Section icon={Settings} title={lang === "mt" ? "Wiri / Display" : "Display"}>
              <div className="flex flex-col gap-3">
                <Toggle
                  label={lang === "mt" ? "Uri t-tfittxijiet trending" : "Show trending searches"}
                  value={settings.showTrending}
                  onChange={() => toggle("showTrending")}
                />
                <Toggle
                  label={lang === "mt" ? "Uri l-feed tal-ġurnata" : "Show daily feed"}
                  value={settings.showDailyFeed}
                  onChange={() => toggle("showDailyFeed")}
                />
                <Toggle
                  label={lang === "mt" ? "Mod kompatt" : "Compact mode"}
                  value={settings.compactMode}
                  onChange={() => toggle("compactMode")}
                />
              </div>
            </Section>

          </div>

          {/* Save */}
          <button
            onClick={save}
            className="w-full mt-6 py-4 bg-gold hover:bg-[#a8852f] text-white font-bold rounded-2xl
                       transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            {saved
              ? <><Check size={18} /> {lang === "mt" ? "Salvat!" : "Saved!"}</>
              : <><Save size={18} /> {lang === "mt" ? "Salva s-Settings" : "Save Settings"}</>}
          </button>
        </motion.div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e5e0d5] rounded-2xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className="text-gold" />
        <p className="font-semibold text-sm text-[#1a1a2e]">{title}</p>
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[#6b7280]">{label}</span>
      <button
        onClick={onChange}
        className={`relative w-11 h-6 rounded-full transition-all ${value ? "bg-gold" : "bg-[#e5e0d5]"}`}
      >
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${value ? "left-6" : "left-1"}`} />
      </button>
    </div>
  );
}
