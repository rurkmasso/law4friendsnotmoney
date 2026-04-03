"use client";
import { ExternalLink, Scale, BookOpen, FileText, Newspaper } from "lucide-react";

interface Citation {
  type: "law" | "judgment" | "document" | "news";
  title: string;
  url: string;
  score?: number;
  meta?: string; // court, chapter, source, date etc.
}

interface Props {
  citations: Citation[];
  onOpen?: (citation: Citation) => void;
  language?: "mt" | "en";
}

const TYPE_ICON = {
  law: BookOpen,
  judgment: Scale,
  document: FileText,
  news: Newspaper,
};

const TYPE_LABEL = {
  mt: { law: "Liġi", judgment: "Sentenza", document: "Dokument", news: "Aħbar" },
  en: { law: "Law", judgment: "Judgment", document: "Document", news: "News" },
};

const TYPE_COLOR = {
  law: "text-navy bg-navy/8 border-navy/20",
  judgment: "text-gold bg-gold/8 border-gold/20",
  document: "text-[#0d9488] bg-[#0d9488]/8 border-[#0d9488]/20",
  news: "text-[#dc2626] bg-[#dc2626]/8 border-[#dc2626]/20",
};

export default function CitationCard({ citations, onOpen, language = "mt" }: Props) {
  if (!citations?.length) return null;

  return (
    <div className="flex flex-col gap-2">
      {citations.map((c, i) => {
        const Icon = TYPE_ICON[c.type] || FileText;
        const colorClass = TYPE_COLOR[c.type] || TYPE_COLOR.document;
        const typeLabel = TYPE_LABEL[language][c.type];

        return (
          <div
            key={i}
            className="flex items-center gap-3 bg-white hover:shadow-md border border-[#e5e0d5]
                       hover:border-gold/30 rounded-xl px-4 py-3 transition-all group cursor-pointer shadow-sm"
            onClick={() => onOpen?.(c)}
          >
            <span className="text-xs text-[#9ca3af] font-mono w-5 shrink-0">[{i + 1}]</span>
            <Icon size={15} className={colorClass.split(" ")[0]} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#6b7280] group-hover:text-[#1a1a2e] truncate transition-colors">
                {c.title}
              </p>
              {c.meta && (
                <p className="text-xs text-[#9ca3af] mt-0.5 truncate">{c.meta}</p>
              )}
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${colorClass}`}>
              {typeLabel}
            </span>
            {c.score != null && (
              <span className="text-xs text-[#9ca3af] font-mono shrink-0">
                {Math.round(c.score * 100)}%
              </span>
            )}
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 p-1 text-[#9ca3af] hover:text-gold transition-colors"
            >
              <ExternalLink size={13} />
            </a>
          </div>
        );
      })}
    </div>
  );
}
