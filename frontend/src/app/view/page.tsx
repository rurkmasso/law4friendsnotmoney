"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useLanguage } from "@/lib/useLanguage";
import Nav from "@/components/Nav";

const PdfViewer = dynamic(() => import("@/components/PdfViewer"), { ssr: false });
const DocxViewer = dynamic(() => import("@/components/DocxViewer"), { ssr: false });

function ViewerContent() {
  const [lang] = useLanguage();
  const params = useSearchParams();
  const url = params.get("url") || "";
  const title = params.get("title") || "Dokument";
  const type = params.get("type") || "";

  const isPdf = url.endsWith(".pdf") || type === "pdf";
  const isDocx = url.endsWith(".docx") || type === "docx";

  return (
    <div className="min-h-screen bg-[#f5f3ee]">
      <Nav />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center text-sm text-[#6b7280] hover:text-[#1a1a2e] mb-6 transition-colors">
          ← {lang === "mt" ? "Lura" : "Back"}
        </Link>

        {isPdf && <PdfViewer url={url} title={title} />}
        {isDocx && <DocxViewer url={url} title={title} />}
        {!isPdf && !isDocx && (
          <div className="bg-white border border-[#e5e0d5] rounded-2xl shadow-sm p-8 text-center">
            <p className="text-[#6b7280] mb-4 text-sm">
              {lang === "mt" ? "Tip ta' fajl mhux rikonoxxut" : "Unrecognised file type"}
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-5 py-2.5 bg-gold hover:bg-[#a8852f] text-white rounded-xl text-sm font-semibold transition-colors"
            >
              {lang === "mt" ? "Iftaħ b'mod dirett" : "Open directly"}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ViewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f5f3ee] flex items-center justify-center">
          <p className="text-[#9ca3af] text-sm">
            Qed jgħabbi...
          </p>
        </div>
      }
    >
      <ViewerContent />
    </Suspense>
  );
}
