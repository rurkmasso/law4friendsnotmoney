"use client";
import { useState, useEffect, useRef } from "react";
import { Download, ExternalLink, FileText, RefreshCw, Maximize2 } from "lucide-react";

const BASE_PATH = process.env.NODE_ENV === "production" ? "/ligi4friends" : "";

interface Props {
  url: string;
  title?: string;
  localPath?: string;
}

type ViewMode = "google" | "direct" | "object";

export default function PdfViewer({ url, title, localPath }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("google");
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Local PDF path if available
  const localSrc = localPath ? `${BASE_PATH}/data/pdfs/${localPath}` : null;
  // Prefer local PDF, then fall back to source
  const directSrc = localSrc || url;
  // Google Docs viewer works with any public PDF URL
  const googleSrc = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;

  const currentSrc = viewMode === "google" ? googleSrc
    : viewMode === "object" ? directSrc
    : directSrc;

  // Auto-detect if local PDF exists; if so, default to direct
  useEffect(() => {
    if (localSrc) {
      fetch(localSrc, { method: "HEAD" })
        .then(r => { if (r.ok) setViewMode("direct"); })
        .catch(() => {});
    }
  }, [localSrc]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 3000);
    return () => clearTimeout(timer);
  }, [currentSrc]);

  const modes: { key: ViewMode; label: string }[] = [
    { key: "google", label: "Google Viewer" },
    { key: "direct", label: "Direct" },
    { key: "object", label: "Embedded" },
  ];

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-[#e5e0d5] shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e0d5] bg-[#f9f7f3] gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={14} className="text-red-600 shrink-0" />
          <span className="text-sm font-medium truncate text-[#1a1a2e]">{title || "PDF"}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* View mode toggle */}
          {modes.map(m => (
            <button key={m.key}
              onClick={() => setViewMode(m.key)}
              className={`px-2 py-1 text-[10px] rounded-md border transition-all ${
                viewMode === m.key
                  ? "bg-[#4c9ac9]/10 border-[#4c9ac9]/30 text-[#4c9ac9] font-semibold"
                  : "bg-white border-[#e5e0d5] text-[#9ca3af] hover:border-[#4c9ac9]/20"
              }`}>
              {m.label}
            </button>
          ))}

          <span className="w-px h-4 bg-[#e5e0d5] mx-1" />

          {/* Download */}
          <a href={directSrc} download target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-[#4c9ac9] hover:bg-[#3a86b5] text-white rounded-lg transition-colors font-medium">
            <Download size={11} /> Download
          </a>

          {/* Open in new tab */}
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-white border border-[#e5e0d5] hover:border-[#4c9ac9]/30 rounded-lg text-[#6b7280] transition-colors"
            title="Open in new tab">
            <Maximize2 size={11} />
          </a>
        </div>
      </div>

      {/* PDF display area */}
      <div className="relative bg-[#f5f3ee]" style={{ minHeight: 700 }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#f5f3ee] z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#4c9ac9] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[#9ca3af]">Loading PDF...</p>
            </div>
          </div>
        )}

        {viewMode === "object" ? (
          <object
            data={directSrc}
            type="application/pdf"
            className="w-full border-0"
            style={{ height: 700 }}
          >
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <FileText size={48} className="text-[#ccc]" />
              <p className="text-sm text-[#6b7280]">Your browser cannot display this PDF inline.</p>
              <div className="flex gap-2">
                <button onClick={() => setViewMode("google")}
                  className="px-4 py-2 bg-[#4c9ac9] text-white text-sm rounded-lg hover:bg-[#3a86b5]">
                  Use Google Viewer
                </button>
                <a href={directSrc} target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2 bg-white border border-[#e5e0d5] text-[#6b7280] text-sm rounded-lg hover:border-[#4c9ac9]/30">
                  Open in New Tab
                </a>
              </div>
            </div>
          </object>
        ) : (
          <iframe
            ref={iframeRef}
            src={currentSrc}
            className="w-full border-0"
            style={{ height: 700 }}
            title={title || "PDF Viewer"}
            onLoad={() => setLoading(false)}
            sandbox={viewMode === "google" ? undefined : "allow-same-origin allow-scripts"}
          />
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 bg-[#f9f7f3] border-t border-[#e5e0d5] text-[10px] text-[#9ca3af]">
        {viewMode === "google"
          ? "Viewing via Google Docs — switch to Direct or Embedded if you have the PDF locally"
          : viewMode === "direct"
          ? "Direct PDF view — if blank, try Google Viewer or download"
          : "Embedded PDF — if not visible, try Google Viewer"}
        {" · "}
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#4c9ac9] hover:underline">
          Source: {url.includes("legislation.mt") ? "legislation.mt" : new URL(url).hostname}
        </a>
      </div>
    </div>
  );
}
