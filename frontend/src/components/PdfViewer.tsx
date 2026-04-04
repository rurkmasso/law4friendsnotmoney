"use client";
import { useState } from "react";
import { Download, ExternalLink, FileText, RefreshCw } from "lucide-react";

// Base path for GitHub Pages
const BASE_PATH = process.env.NODE_ENV === "production" ? "/ligi4friends" : "";

interface Props {
  url: string;
  title?: string;
  /** If we have a local copy in /data/pdfs/, provide the filename */
  localPath?: string;
}

export default function PdfViewer({ url, title, localPath }: Props) {
  const [viewMode, setViewMode] = useState<"iframe" | "google">("iframe");
  const [error, setError] = useState(false);

  // Use local PDF if available, otherwise source URL
  const pdfSrc = localPath ? `${BASE_PATH}/data/pdfs/${localPath}` : url;

  // Google Docs viewer as fallback (works with any public PDF)
  const googleViewerUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;

  const currentSrc = viewMode === "google" ? googleViewerUrl : pdfSrc;

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-[#e5e0d5] shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e0d5] bg-[#f9f7f3]">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={14} className="text-red-600 shrink-0" />
          <span className="text-sm font-medium truncate text-[#1a1a2e]">{title || "Document"}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle viewer mode */}
          <button
            onClick={() => { setViewMode(viewMode === "iframe" ? "google" : "iframe"); setError(false); }}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-white border border-[#e5e0d5] hover:border-[#4c9ac9]/30 rounded-lg text-[#6b7280] transition-colors"
            title="Switch viewer"
          >
            <RefreshCw size={11} /> {viewMode === "iframe" ? "Google Viewer" : "Direct"}
          </button>

          {/* Download */}
          <a
            href={pdfSrc}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-[#4c9ac9] hover:bg-[#3a86b5] text-white rounded-lg transition-colors font-medium"
          >
            <Download size={11} /> Download
          </a>

          {/* Open in new tab */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-white border border-[#e5e0d5] hover:border-[#4c9ac9]/30 rounded-lg text-[#6b7280] transition-colors"
            title="Open in new tab"
          >
            <ExternalLink size={11} />
          </a>
        </div>
      </div>

      {/* PDF embed */}
      <div className="relative bg-[#f5f3ee] min-h-[600px]">
        {error ? (
          <div className="flex flex-col items-center justify-center h-[600px] gap-4">
            <FileText size={48} className="text-[#ccc]" />
            <p className="text-sm text-[#6b7280]">Could not load PDF inline.</p>
            <div className="flex gap-2">
              <button
                onClick={() => { setViewMode("google"); setError(false); }}
                className="px-4 py-2 bg-[#4c9ac9] text-white text-sm rounded-lg hover:bg-[#3a86b5] transition-colors"
              >
                Try Google Viewer
              </button>
              <a
                href={pdfSrc}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-white border border-[#e5e0d5] text-[#6b7280] text-sm rounded-lg hover:border-[#4c9ac9]/30 transition-colors"
              >
                Open in New Tab
              </a>
            </div>
          </div>
        ) : (
          <iframe
            src={currentSrc}
            className="w-full h-[700px] border-0"
            title={title || "PDF Viewer"}
            onError={() => setError(true)}
          />
        )}
      </div>
    </div>
  );
}
