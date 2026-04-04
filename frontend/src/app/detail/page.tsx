"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Scale, BookOpen, FileText, Calendar, Tag, Globe, Link2,
  ExternalLink, Download, Clock, CheckCircle, XCircle,
  User, Briefcase, Mail, Phone, Building2, Users, Sparkles,
} from "lucide-react";
import { getLaws, getLawyers, getJudgments, type Law, type Lawyer, type Judgment } from "@/lib/api";
import { useLanguage } from "@/lib/useLanguage";
import NextLink from "next/link";
import dynamic from "next/dynamic";

const PdfViewer = dynamic(() => import("@/components/PdfViewer"), { ssr: false });

const BASE_PATH = process.env.NODE_ENV === "production" ? "/ligi4friends" : "";

type Tab = "overview" | "details" | "citations" | "cases" | "pdf";

function MetaRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#e5e0d5]/50 last:border-b-0">
      <div className="text-[#9ca3af] mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-[#9ca3af] font-medium mb-0.5">{label}</div>
        <div className="text-sm text-[#1a1a2e]">{children}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isInForce = !status || status.toLowerCase().includes("force") || status.toLowerCase().includes("seħħ");
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
      ${isInForce ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
      {isInForce ? <CheckCircle size={12} /> : <XCircle size={12} />}
      {status || "In Force"}
    </span>
  );
}

const NAV_LINKS = [
  { href: "/laws", label_mt: "Liġijiet", label_en: "Laws" },
  { href: "/judgments", label_mt: "Sentenzi", label_en: "Judgments" },
  { href: "/lawyers", label_mt: "Avukati", label_en: "Lawyers" },
  { href: "/documents", label_mt: "Dokumenti", label_en: "Documents" },
  { href: "/igaming", label_mt: "iGaming", label_en: "iGaming" },
];

// ── LAW DETAIL ──
function LawDetail({ law, lang }: { law: Law; lang: string }) {
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [showPdf, setShowPdf] = useState(false);
  const [pdfLang, setPdfLang] = useState<"en" | "mt">("en");

  const pdfUrl = pdfLang === "en" ? (law.pdf_url_en || law.pdf_url) : (law.pdf_url_mt || law.pdf_url);
  // Use local PDF from data if the scraper downloaded it, otherwise derive from chapter number
  const localFromData = pdfLang === "en" ? law.local_pdf_en : law.local_pdf_mt;
  const capNum = law.chapter?.match(/\d+/)?.[0];
  const localPdfPath = localFromData || (capNum ? `cap_${capNum}_${pdfLang}.pdf` : undefined);

  const tabs: { key: Tab; label: string }[] = [
    { key: "details", label: lang === "mt" ? "Dettalji" : "Details" },
    { key: "pdf", label: "PDF" },
  ];
  if (law.relationships && law.relationships.length > 0) {
    tabs.push({ key: "citations", label: lang === "mt" ? "Relazzjonijiet" : "Relationships" });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-[#4c9ac9]/10 border border-[#4c9ac9]/20 shrink-0 mt-1">
            <BookOpen size={22} className="text-[#4c9ac9]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-mono text-[#4c9ac9] bg-[#4c9ac9]/10 px-2 py-0.5 rounded">{law.chapter}</span>
              {law.type && <span className="text-xs text-[#9ca3af] bg-[#f3f0eb] px-2 py-0.5 rounded">{law.type}</span>}
              <StatusBadge status={law.status || ""} />
            </div>
            <h1 className="text-2xl font-display font-bold text-[#1a1a2e] leading-tight">
              {lang === "mt" ? (law.title_mt || law.title) : (law.title_en || law.title)}
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 ml-14">
          {law.pdf_url_en && (
            <button onClick={() => { setPdfLang("en"); setShowPdf(true); setActiveTab("pdf"); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4c9ac9] hover:bg-[#3a86b5] text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
              <FileText size={14} /> View English PDF
            </button>
          )}
          {law.pdf_url_mt && (
            <button onClick={() => { setPdfLang("mt"); setShowPdf(true); setActiveTab("pdf"); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#d4a853] hover:bg-[#c09640] text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
              <FileText size={14} /> View Maltese PDF
            </button>
          )}
          {law.pdf_url_en && (
            <a href={law.pdf_url_en} download target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-[#e5e0d5] hover:border-[#4c9ac9]/30 text-[#6b7280] text-sm font-medium rounded-lg transition-colors">
              <Download size={14} /> EN PDF
            </a>
          )}
          {law.pdf_url_mt && (
            <a href={law.pdf_url_mt} download target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-[#e5e0d5] hover:border-[#d4a853]/30 text-[#6b7280] text-sm font-medium rounded-lg transition-colors">
              <Download size={14} /> MT PDF
            </a>
          )}
          <a href={law.source_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-[#e5e0d5] hover:border-[#4c9ac9]/30 text-[#6b7280] text-sm font-medium rounded-lg transition-colors">
            <ExternalLink size={14} /> legislation.mt
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-[#e5e0d5] p-1">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key ? "bg-[#4c9ac9]/10 text-[#4c9ac9] border border-[#4c9ac9]/20" : "text-[#6b7280] hover:bg-[#f5f3ee]"
            }`}>{tab.label}</button>
        ))}
      </div>

      {activeTab === "pdf" && pdfUrl && (
        <PdfViewer url={pdfUrl} title={law.title} localPath={localPdfPath} />
      )}

      {activeTab === "details" && (
        <div className="bg-white rounded-2xl border border-[#e5e0d5] shadow-sm p-6">
          {law.eli_link && <MetaRow icon={<Link2 size={14} />} label="ELI Link"><code className="text-xs bg-[#f3f0eb] px-2 py-0.5 rounded font-mono">{law.eli_link}</code></MetaRow>}
          {law.type && <MetaRow icon={<FileText size={14} />} label={lang === "mt" ? "Tip" : "Type"}>{law.type}</MetaRow>}
          {law.keywords && law.keywords.length > 0 && (
            <MetaRow icon={<Tag size={14} />} label={lang === "mt" ? "Kliem Ewlenin" : "Keywords"}>
              <div className="flex flex-wrap gap-1.5">
                {law.keywords.map((kw, i) => <span key={i} className="text-xs bg-[#4c9ac9]/10 text-[#4c9ac9] px-2 py-0.5 rounded-full">{kw}</span>)}
              </div>
            </MetaRow>
          )}
          {law.languages && law.languages.length > 0 && <MetaRow icon={<Globe size={14} />} label={lang === "mt" ? "Lingwi" : "Languages"}>{law.languages.join(" · ")}</MetaRow>}
          <MetaRow icon={<FileText size={14} />} label={lang === "mt" ? "Format" : "Format"}>
            <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded font-semibold">PDF</span>
          </MetaRow>
          {law.effective_date && <MetaRow icon={<Calendar size={14} />} label={lang === "mt" ? "Data Effettiva" : "Effective Date"}>{law.effective_date}</MetaRow>}
          {law.publication_date && <MetaRow icon={<Calendar size={14} />} label={lang === "mt" ? "Data tal-Pubblikazzjoni" : "Publication Date"}>{law.publication_date}</MetaRow>}
          <MetaRow icon={<ExternalLink size={14} />} label={lang === "mt" ? "Sors" : "Source"}>
            <a href={law.source_url} target="_blank" rel="noopener noreferrer" className="text-[#4c9ac9] hover:underline text-xs break-all">{law.source_url}</a>
          </MetaRow>
        </div>
      )}

      {activeTab === "citations" && law.relationships && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#e5e0d5] shadow-sm p-6">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Link2 size={14} className="text-[#d4a853]" /> {lang === "mt" ? "Relazzjonijiet" : "Relationships"}</h3>
            {law.relationships.map((rel, i) => (
              <div key={i} className="flex items-start gap-2 text-sm py-2 border-b border-[#e5e0d5]/50 last:border-b-0">
                <span className="text-xs text-[#9ca3af] font-medium shrink-0">{rel.type}</span>
                {rel.url ? <a href={rel.url} target="_blank" className="text-[#4c9ac9] hover:underline">{rel.text}</a> : <span className="text-[#6b7280]">{rel.text}</span>}
              </div>
            ))}
          </div>
          {law.timeline && law.timeline.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#e5e0d5] shadow-sm p-6">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Clock size={14} className="text-emerald-600" /> Timeline</h3>
              <div className="pl-4 border-l-2 border-emerald-200 space-y-3">
                {law.timeline.map((entry, i) => (
                  <div key={i}>
                    {entry.date && <span className="text-xs text-[#9ca3af] font-mono">{entry.date}</span>}
                    <p className="text-sm text-[#6b7280]">{entry.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── JUDGMENT DETAIL ──
function JudgmentDetail({ judgment, lang }: { judgment: Judgment; lang: string }) {
  const [activeTab, setActiveTab] = useState<Tab>("details");

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-gold/10 border border-gold/20 shrink-0 mt-1">
            <Scale size={22} className="text-gold" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-sm font-semibold px-2.5 py-0.5 rounded-lg bg-gold/10 border border-gold/20 text-[#b8963a]">{judgment.reference}</span>
              {judgment.outcome && <span className="text-xs bg-[#f5f3ee] text-[#9ca3af] px-2 py-0.5 rounded-full border border-[#e5e0d5]">{judgment.outcome}</span>}
            </div>
            <h1 className="text-2xl font-display font-bold text-[#1a1a2e] leading-tight">{judgment.parties}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[#6b7280]">
              {judgment.court && <span className="flex items-center gap-1 bg-[#f5f3ee] px-2 py-0.5 rounded"><Scale size={11} /> {judgment.court}</span>}
              {judgment.judge && <span className="flex items-center gap-1 bg-[#f5f3ee] px-2 py-0.5 rounded"><User size={11} /> {judgment.judge}</span>}
              {judgment.date && <span className="flex items-center gap-1 bg-[#f5f3ee] px-2 py-0.5 rounded"><Calendar size={11} /> {judgment.date}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 ml-14">
          <a href={judgment.source_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-[#e5e0d5] hover:border-gold/30 text-[#6b7280] text-sm font-medium rounded-lg transition-colors">
            <ExternalLink size={14} /> eCourts
          </a>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#e5e0d5] shadow-sm p-6">
        <MetaRow icon={<FileText size={14} />} label={lang === "mt" ? "Referenza" : "Reference"}>{judgment.reference}</MetaRow>
        <MetaRow icon={<Scale size={14} />} label={lang === "mt" ? "Qorti" : "Court"}>{judgment.court || "—"}</MetaRow>
        <MetaRow icon={<User size={14} />} label={lang === "mt" ? "Imħallef" : "Judge"}>{judgment.judge || "—"}</MetaRow>
        <MetaRow icon={<Users size={14} />} label={lang === "mt" ? "Partijiet" : "Parties"}>{judgment.parties || "—"}</MetaRow>
        <MetaRow icon={<Calendar size={14} />} label={lang === "mt" ? "Data" : "Date"}>{judgment.date || "—"}</MetaRow>
        <MetaRow icon={<CheckCircle size={14} />} label={lang === "mt" ? "Riżultat" : "Outcome"}>{judgment.outcome || "—"}</MetaRow>
        <MetaRow icon={<ExternalLink size={14} />} label={lang === "mt" ? "Sors" : "Source"}>
          <a href={judgment.source_url} target="_blank" rel="noopener noreferrer" className="text-[#4c9ac9] hover:underline text-xs break-all">{judgment.source_url}</a>
        </MetaRow>
      </div>
    </div>
  );
}

// ── LAWYER DETAIL ──
function LawyerDetail({ lawyer, lang }: { lawyer: Lawyer; lang: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0 text-gold font-bold text-xl">
          {lawyer.full_name.split(" ").map(n => n[0]).slice(0, 2).join("")}
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-[#1a1a2e]">{lawyer.full_name}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-[#6b7280]">
            <span className="bg-gold/10 text-gold px-2 py-0.5 rounded-full text-xs font-medium border border-gold/20">{lawyer.profession}</span>
            <span className="font-mono text-xs text-[#9ca3af]">#{lawyer.warrant_number}</span>
            {lawyer.firm && <span className="flex items-center gap-1 text-xs"><Building2 size={11} /> {lawyer.firm}</span>}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-[#e5e0d5] p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-gold">{lawyer.case_count || 0}</p>
          <p className="text-xs text-[#9ca3af]">{lang === "mt" ? "Kawżi" : "Cases"}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e5e0d5] p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-[#4c9ac9]">{lawyer.courts_active_in?.length || 0}</p>
          <p className="text-xs text-[#9ca3af]">{lang === "mt" ? "Qrati" : "Courts"}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e5e0d5] p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-emerald-600">{lawyer.practice_areas?.length || 0}</p>
          <p className="text-xs text-[#9ca3af]">{lang === "mt" ? "Oqsma" : "Areas"}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#e5e0d5] p-4 text-center shadow-sm">
          <p className="text-sm font-semibold text-[#1a1a2e]">{lawyer.first_case_date?.split("T")[0] || "—"}</p>
          <p className="text-xs text-[#9ca3af]">{lang === "mt" ? "L-ewwel kawża" : "First case"}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#e5e0d5] shadow-sm p-6">
        <MetaRow icon={<User size={14} />} label={lang === "mt" ? "Isem Sħiħ" : "Full Name"}>{lawyer.full_name}</MetaRow>
        <MetaRow icon={<FileText size={14} />} label={lang === "mt" ? "Nru. tal-Warrant" : "Warrant Number"}>
          <code className="bg-[#f3f0eb] px-2 py-0.5 rounded font-mono text-xs">{lawyer.warrant_number}</code>
        </MetaRow>
        <MetaRow icon={<Briefcase size={14} />} label={lang === "mt" ? "Professjoni" : "Profession"}>{lawyer.profession}</MetaRow>
        {lawyer.firm && <MetaRow icon={<Building2 size={14} />} label={lang === "mt" ? "Firma" : "Firm"}>{lawyer.firm}</MetaRow>}
        {lawyer.email && <MetaRow icon={<Mail size={14} />} label="Email"><a href={`mailto:${lawyer.email}`} className="text-[#4c9ac9] hover:underline">{lawyer.email}</a></MetaRow>}
        {lawyer.phone && <MetaRow icon={<Phone size={14} />} label={lang === "mt" ? "Telefon" : "Phone"}><a href={`tel:${lawyer.phone}`} className="text-[#4c9ac9] hover:underline">{lawyer.phone}</a></MetaRow>}
        {lawyer.practice_areas && lawyer.practice_areas.length > 0 && (
          <MetaRow icon={<Tag size={14} />} label={lang === "mt" ? "Oqsma" : "Practice Areas"}>
            <div className="flex flex-wrap gap-1.5">
              {lawyer.practice_areas.map((a, i) => <span key={i} className="text-xs bg-gold/10 text-gold px-2 py-0.5 rounded-full border border-gold/15">{a}</span>)}
            </div>
          </MetaRow>
        )}
        {lawyer.courts_active_in && lawyer.courts_active_in.length > 0 && (
          <MetaRow icon={<Scale size={14} />} label={lang === "mt" ? "Qrati Attivi" : "Courts Active In"}>
            <div className="flex flex-wrap gap-1.5">
              {lawyer.courts_active_in.map((c, i) => <span key={i} className="text-xs bg-[#4c9ac9]/10 text-[#4c9ac9] px-2 py-0.5 rounded-full">{c}</span>)}
            </div>
          </MetaRow>
        )}
        {lawyer.first_case_date && <MetaRow icon={<Calendar size={14} />} label={lang === "mt" ? "L-Ewwel Kawża" : "First Case"}>{lawyer.first_case_date.split("T")[0]}</MetaRow>}
        {lawyer.last_case_date && <MetaRow icon={<Calendar size={14} />} label={lang === "mt" ? "L-Aħħar Kawża" : "Last Case"}>{lawyer.last_case_date.split("T")[0]}</MetaRow>}
        <MetaRow icon={<ExternalLink size={14} />} label={lang === "mt" ? "Sors" : "Source"}>
          <a href={lawyer.source_url} target="_blank" rel="noopener noreferrer" className="text-[#4c9ac9] hover:underline text-xs break-all">{lawyer.source_url}</a>
        </MetaRow>
      </div>
    </div>
  );
}

// ── MAIN PAGE ──
function DetailContent() {
  const [lang, setLang] = useLanguage();
  const params = useSearchParams();
  const type = params.get("type") || "";
  const id = params.get("id") || "";

  const [law, setLaw] = useState<Law | null>(null);
  const [judgment, setJudgment] = useState<Judgment | null>(null);
  const [lawyer, setLawyer] = useState<Lawyer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!type || !id) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      if (type === "law") {
        const all = await getLaws();
        setLaw(all.find(l => l.chapter === id) || null);
      } else if (type === "judgment") {
        const all = await getJudgments();
        setJudgment(all.find(j => j.reference === id) || null);
      } else if (type === "lawyer") {
        const all = await getLawyers();
        setLawyer(all.find(l => l.warrant_number === id || l.full_name === id) || null);
      }
      setLoading(false);
    })();
  }, [type, id]);

  const backHref = type === "law" ? "/laws" : type === "judgment" ? "/judgments" : type === "lawyer" ? "/lawyers" : "/";
  const backLabel = lang === "mt" ? "← Lura" : "← Back";

  return (
    <div className="min-h-screen bg-cream text-[#1a1a2e]">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-[#e5e0d5] shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <NextLink href="/" className="flex items-center gap-2">
            <Scale size={20} className="text-gold" />
            <span className="text-lg font-display font-bold"><span className="text-gold">Ligi</span>4Friends</span>
          </NextLink>
          <div className="hidden lg:flex items-center gap-6 text-sm text-[#6b7280]">
            {NAV_LINKS.map(link => (
              <NextLink key={link.href} href={link.href} className="hover:text-gold transition-colors font-medium">
                {lang === "mt" ? link.label_mt : link.label_en}
              </NextLink>
            ))}
          </div>
          <button onClick={() => setLang(lang === "mt" ? "en" : "mt")}
            className="px-3 py-1.5 rounded-full border border-[#e5e0d5] hover:border-gold/50 hover:bg-gold/5 text-xs font-mono text-[#6b7280] transition-all">
            {lang === "mt" ? "EN" : "MT"}
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <NextLink href={backHref} className="text-sm text-[#9ca3af] hover:text-[#6b7280] mb-6 inline-block">{backLabel}</NextLink>

        {loading ? (
          <p className="text-[#9ca3af] text-sm">{lang === "mt" ? "Qed jgħabbi..." : "Loading..."}</p>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {type === "law" && law && <LawDetail law={law} lang={lang} />}
            {type === "judgment" && judgment && <JudgmentDetail judgment={judgment} lang={lang} />}
            {type === "lawyer" && lawyer && <LawyerDetail lawyer={lawyer} lang={lang} />}
            {!law && !judgment && !lawyer && (
              <div className="bg-white border border-[#e5e0d5] rounded-2xl p-10 text-center shadow-sm">
                <p className="text-[#6b7280]">{lang === "mt" ? "Ma nstab xejn." : "Not found."}</p>
              </div>
            )}
          </motion.div>
        )}

        <div className="py-10 mt-10 text-center text-xs text-[#9ca3af] border-t border-[#e5e0d5]">
          <p>Ligi4Friends — Powered by Rark Musso</p>
        </div>
      </div>
    </div>
  );
}

export default function DetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream flex items-center justify-center"><p className="text-[#9ca3af] text-sm">Loading...</p></div>}>
      <DetailContent />
    </Suspense>
  );
}
