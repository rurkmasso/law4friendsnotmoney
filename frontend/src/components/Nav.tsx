"use client";
import { useState } from "react";
import { Scale, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/useLanguage";

export const ALL_NAV_LINKS = [
  { href: "/laws",         label_mt: "Liġijiet",    label_en: "Laws" },
  { href: "/judgments",    label_mt: "Sentenzi",    label_en: "Judgments" },
  { href: "/lawyers",      label_mt: "Avukati",     label_en: "Lawyers" },
  { href: "/documents",    label_mt: "Dokumenti",   label_en: "Documents" },
  { href: "/draft",        label_mt: "Abbozza",     label_en: "Draft" },
  { href: "/igaming",      label_mt: "iGaming",     label_en: "iGaming" },
  { href: "/case-builder", label_mt: "Ibni Każ",    label_en: "Build Case" },
  { href: "/calendar",     label_mt: "Kalendarju",  label_en: "Calendar" },
  { href: "/sectors",      label_mt: "Setturi",     label_en: "Sectors" },
  { href: "/alerts",       label_mt: "Allerts",     label_en: "Alerts" },
  { href: "/settings",     label_mt: "Settings",    label_en: "Settings" },
];

interface NavLink { href: string; label_mt: string; label_en: string; }

export default function Nav({ links }: { links?: NavLink[] }) {
  const [lang, setLang] = useLanguage();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const navLinks = links ?? ALL_NAV_LINKS;
  const desktopLinks = navLinks.slice(0, 6);

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-[#e5e0d5] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0" onClick={() => setOpen(false)}>
          <Scale size={20} className="text-gold" />
          <span className="text-lg font-display font-bold text-[#1a1a2e]">
            <span className="text-gold">Tizz</span>ju
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-5 text-sm text-[#6b7280] flex-1 justify-center">
          {desktopLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`hover:text-gold transition-colors font-medium whitespace-nowrap ${
                pathname === link.href ? "text-gold" : ""
              }`}
            >
              {lang === "mt" ? link.label_mt : link.label_en}
            </Link>
          ))}
        </div>

        {/* Right: lang toggle + hamburger */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setLang(lang === "mt" ? "en" : "mt")}
            className="px-3 py-1.5 rounded-full border border-[#e5e0d5] hover:border-gold/50
                       hover:bg-gold/5 text-xs font-mono text-[#6b7280] transition-all"
          >
            {lang === "mt" ? "EN" : "MT"}
          </button>
          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden p-2 rounded-xl hover:bg-gold/5 text-[#6b7280] hover:text-gold transition-colors"
            aria-label="Toggle menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t border-[#e5e0d5] bg-white/98 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "text-gold bg-gold/8 border border-gold/20"
                    : "text-[#6b7280] hover:text-[#1a1a2e] hover:bg-[#f9f7f3]"
                }`}
              >
                {lang === "mt" ? link.label_mt : link.label_en}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
