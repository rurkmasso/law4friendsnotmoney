"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

const PdfViewer = dynamic(() => import("@/components/PdfViewer"), { ssr: false });
const DocxViewer = dynamic(() => import("@/components/DocxViewer"), { ssr: false });

function ViewerContent() {
  const params = useSearchParams();
  const url = params.get("url") || "";
  const title = params.get("title") || "Dokument";
  const type = params.get("type") || "";

  const isPdf = url.endsWith(".pdf") || type === "pdf";
  const isDocx = url.endsWith(".docx") || type === "docx";

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="text-sm text-white/40 hover:text-white/70 mb-6 block">
          ← Lura / Back
        </Link>

        {isPdf && <PdfViewer url={url} title={title} />}
        {isDocx && <DocxViewer url={url} title={title} />}
        {!isPdf && !isDocx && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <p className="text-white/50 mb-4">Tip ta' fajl mhux rikonoxxut</p>
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 bg-[#c9a84c] text-black rounded-xl text-sm font-semibold">
              Iftaħ b'mod dirett
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ViewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center text-white/30">Qed jgħabbi...</div>}>
      <ViewerContent />
    </Suspense>
  );
}
