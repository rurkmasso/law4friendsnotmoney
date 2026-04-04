import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
});

// Base path for static data files (respects Next.js basePath in production)
const BASE_PATH = process.env.NODE_ENV === "production" ? "/ligi4friends" : "";

export type Language = "mt" | "en";

export interface SearchResult {
  answer: string;
  sources: { type: string; title: string; url: string; score: number }[];
  model_used: string;
  language: Language;
  cached: boolean;
}

export interface Lawyer {
  warrant_number: string;
  full_name: string;
  profession: string;
  firm: string;
  email: string;
  phone: string;
  practice_areas: string[];
  case_count: number;
  courts_active_in: string[];
  first_case_date: string | null;
  last_case_date: string | null;
  source_url: string;
}

export interface Judgment {
  reference: string;
  court: string;
  judge: string;
  parties: string;
  date: string;
  outcome: string;
  source_url: string;
}

export interface LawRelationship {
  type: string;
  text: string;
  url?: string;
}

export interface LawTimelineEntry {
  text: string;
  date?: string;
  url?: string;
}

export interface Law {
  chapter: string;
  title: string;
  title_en?: string;
  title_mt?: string;
  type?: string;
  eli_link?: string;
  keywords?: string[];
  languages?: string[];
  format?: string;
  status?: string;
  effective_date?: string;
  publication_date?: string;
  indicative_publication_date?: string;
  pdf_url?: string;
  pdf_url_en?: string;
  pdf_url_mt?: string;
  source_url: string;
  relationships?: LawRelationship[];
  timeline?: LawTimelineEntry[];
  last_amended?: string | null;
  local_pdf_en?: string;
  local_pdf_mt?: string;
}

/**
 * Try loading static JSON data first (works on GitHub Pages without backend).
 * Falls back to API if static file not found.
 */
async function loadStaticData<T>(filename: string): Promise<T[]> {
  try {
    const res = await fetch(`${BASE_PATH}/data/${filename}`);
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return [];
}

/**
 * Local client-side search across all static data.
 * Used as fallback when the backend API is unavailable (e.g., GitHub Pages).
 */
async function localSearch(query: string, language: Language): Promise<SearchResult> {
  const lower = query.toLowerCase();
  const sources: SearchResult["sources"] = [];

  // Search laws
  const laws = await loadStaticData<Law>("legislation.json");
  for (const law of laws) {
    const searchable = `${law.chapter} ${law.title} ${law.title_en || ""} ${(law.keywords || []).join(" ")}`.toLowerCase();
    if (searchable.includes(lower)) {
      sources.push({
        type: "law",
        title: `${law.chapter} — ${law.title}`,
        url: law.source_url,
        score: searchable.startsWith(lower) ? 0.95 : 0.7,
      });
    }
    if (sources.length >= 20) break;
  }

  // Search judgments
  const judgments = await loadStaticData<Judgment>("ecourts_judgments.json");
  let jCount = 0;
  for (const j of judgments) {
    const searchable = `${j.reference} ${j.parties} ${j.court} ${j.judge}`.toLowerCase();
    if (searchable.includes(lower)) {
      sources.push({
        type: "judgment",
        title: `${j.reference} — ${j.parties}`,
        url: j.source_url,
        score: 0.65,
      });
      jCount++;
    }
    if (jCount >= 10) break;
  }

  // Search lawyers
  const lawyers = await loadStaticData<Lawyer>("lawyers.json");
  let lCount = 0;
  for (const l of lawyers) {
    const searchable = `${l.full_name} ${l.firm} ${l.profession} ${(l.practice_areas || []).join(" ")}`.toLowerCase();
    if (searchable.includes(lower)) {
      sources.push({
        type: "lawyer",
        title: l.full_name,
        url: l.source_url,
        score: 0.6,
      });
      lCount++;
    }
    if (lCount >= 5) break;
  }

  // Sort by score
  sources.sort((a, b) => b.score - a.score);

  // Build answer from results
  const lawResults = sources.filter(s => s.type === "law");
  const judgmentResults = sources.filter(s => s.type === "judgment");
  const lawyerResults = sources.filter(s => s.type === "lawyer");

  let answer = "";
  if (sources.length === 0) {
    answer = language === "mt"
      ? `Ma nstab l-ebda riżultat għal "${query}". Ipprova b'termini differenti.`
      : `No results found for "${query}". Try different search terms.`;
  } else {
    if (language === "mt") {
      answer = `**Riżultati għal "${query}":**\n\n`;
      if (lawResults.length > 0) answer += `**Liġijiet (${lawResults.length}):** ${lawResults.slice(0, 3).map(s => s.title).join(" · ")}\n\n`;
      if (judgmentResults.length > 0) answer += `**Sentenzi (${judgmentResults.length}):** ${judgmentResults.slice(0, 3).map(s => s.title).join(" · ")}\n\n`;
      if (lawyerResults.length > 0) answer += `**Avukati (${lawyerResults.length}):** ${lawyerResults.slice(0, 3).map(s => s.title).join(" · ")}\n\n`;
      answer += `*Ikklikkja fuq ir-riżultati hawn taħt għal aktar dettalji.*`;
    } else {
      answer = `**Results for "${query}":**\n\n`;
      if (lawResults.length > 0) answer += `**Laws (${lawResults.length}):** ${lawResults.slice(0, 3).map(s => s.title).join(" · ")}\n\n`;
      if (judgmentResults.length > 0) answer += `**Judgments (${judgmentResults.length}):** ${judgmentResults.slice(0, 3).map(s => s.title).join(" · ")}\n\n`;
      if (lawyerResults.length > 0) answer += `**Lawyers (${lawyerResults.length}):** ${lawyerResults.slice(0, 3).map(s => s.title).join(" · ")}\n\n`;
      answer += `*Click on the results below for more details.*`;
    }
  }

  return {
    answer,
    sources: sources.slice(0, 15),
    model_used: "local-search",
    language,
    cached: false,
  };
}

export const search = async (query: string, language: Language, filters = {}): Promise<SearchResult> => {
  // Try backend API first
  try {
    const res = await api.post<SearchResult>("/api/search/", { query, language, filters }, { timeout: 8000 });
    return res.data;
  } catch {
    // Fallback to local client-side search
    return localSearch(query, language);
  }
};

export const getLawyers = async (q?: string, page = 1, limit?: number): Promise<Lawyer[]> => {
  // Try static data first
  const staticData = await loadStaticData<Lawyer>("lawyers.json");
  if (staticData.length > 0) return staticData;
  // Fall back to API
  try {
    return (await api.get<Lawyer[]>("/api/lawyers/", { params: { q, page, limit } })).data;
  } catch { return []; }
};

export const getLawyer = (warrant: string) =>
  api.get<Lawyer>(`/api/lawyers/${warrant}`).then((r) => r.data);

export const getLaws = async (q?: string, page = 1, limit?: number): Promise<Law[]> => {
  const staticData = await loadStaticData<Law>("legislation.json");
  if (staticData.length > 0) return staticData;
  try {
    return (await api.get<Law[]>("/api/laws/", { params: { q, page, limit } })).data;
  } catch { return []; }
};

export const getJudgments = async (params: Record<string, string | number> = {}): Promise<Judgment[]> => {
  const staticData = await loadStaticData<Judgment>("ecourts_judgments.json");
  if (staticData.length > 0) return staticData;
  try {
    return (await api.get<Judgment[]>("/api/judgments/", { params })).data;
  } catch { return []; }
};

export interface RegulatoryDoc {
  title: string;
  source: string;
  doc_type: string;
  url: string;
  pdf_url: string;
  date: string;
  description: string;
}

export const getRegulatoryDocs = async (): Promise<RegulatoryDoc[]> => {
  const staticData = await loadStaticData<RegulatoryDoc>("regulatory_docs.json");
  if (staticData.length > 0) return staticData;
  return [];
};

export interface IGamingOperator {
  company_name: string;
  licence_number: string;
  licence_type: string;
  status: string;
  source_url: string;
}

export const getIGamingOperators = async (): Promise<IGamingOperator[]> => {
  const staticData = await loadStaticData<IGamingOperator>("igaming_operators.json");
  if (staticData.length > 0) return staticData;
  try {
    return (await api.get<IGamingOperator[]>("/api/igaming/operators/", { params: { limit: 500 } })).data;
  } catch { return []; }
};

export const getTemplates = () =>
  api.get<{ id: string; title: string }[]>("/api/draft/templates").then((r) => r.data);

export const createDraft = (doc_type: string, instructions: string, language: Language) =>
  api.post("/api/draft/", { doc_type, instructions, language }, { responseType: "blob" });

export const createAlert = (email: string, keywords: string[], sources: string[] = []) =>
  api.post("/api/alerts/", { email, keywords, sources }).then((r) => r.data);
