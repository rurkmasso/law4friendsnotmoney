"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from "lucide-react";

interface Props {
  url: string;
  title?: string;
}

export default function PdfViewer({ url, title }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.3);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      const doc = await pdfjsLib.getDocument(url).promise;
      if (!cancelled) {
        setPdf(doc);
        setTotalPages(doc.numPages);
        setLoading(false);
      }
    };
    load().catch(console.error);
    return () => { cancelled = true; };
  }, [url]);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    const render = async () => {
      const pdfPage = await pdf.getPage(page);
      const viewport = pdfPage.getViewport({ scale });
      const canvas = canvasRef.current!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await pdfPage.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
    };
    render().catch(console.error);
  }, [pdf, page, scale]);

  return (
    <div className="flex flex-col bg-[#0f0f1a] rounded-2xl border border-white/10 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
        <span className="text-sm font-medium truncate max-w-xs text-white/80">{title || "Dokument"}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <ZoomOut size={15} />
          </button>
          <span className="text-xs text-white/40 w-10 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(3, s + 0.2))}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <ZoomIn size={15} />
          </button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30">
            <ChevronLeft size={15} />
          </button>
          <span className="text-xs text-white/40">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30">
            <ChevronRight size={15} />
          </button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <a href={url} download target="_blank" rel="noopener noreferrer"
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <Download size={15} />
          </a>
        </div>
      </div>

      {/* Canvas */}
      <div className="overflow-auto p-4 flex justify-center bg-[#1a1a2e] min-h-96">
        {loading ? (
          <div className="flex items-center justify-center w-full">
            <p className="text-white/30 text-sm">Qed jgħabbi l-PDF...</p>
          </div>
        ) : (
          <canvas ref={canvasRef} className="shadow-2xl rounded" />
        )}
      </div>
    </div>
  );
}
