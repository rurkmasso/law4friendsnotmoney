"use client";
import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";

interface Props {
  url: string;
  title?: string;
}

export default function DocxViewer({ url, title }: Props) {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const mammoth = await import("mammoth");
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer: buf });
        setHtml(result.value);
      } catch (e) {
        setError("Ma setax jiftaħ id-dokument.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [url]);

  return (
    <div className="flex flex-col bg-[#0f0f1a] rounded-2xl border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
        <span className="flex items-center gap-2 text-sm font-medium text-white/80">
          <FileText size={15} className="text-[#c9a84c]" />
          {title || "Dokument"}
        </span>
        <a href={url} download target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#c9a84c] hover:bg-[#b8963a]
                     text-black text-xs font-semibold rounded-lg transition-colors">
          <Download size={13} /> Niżżel DOCX
        </a>
      </div>

      <div className="p-6 overflow-auto max-h-[70vh] bg-white text-gray-900">
        {loading && <p className="text-gray-400 text-sm">Qed jgħabbi...</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {html && (
          <div
            className="prose max-w-none text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
    </div>
  );
}
