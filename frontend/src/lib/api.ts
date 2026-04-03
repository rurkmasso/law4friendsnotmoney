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

export interface Law {
  chapter: string;
  title: string;
  last_amended: string | null;
  source_url: string;
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

export const search = (query: string, language: Language, filters = {}) =>
  api.post<SearchResult>("/api/search/", { query, language, filters }).then((r) => r.data);

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

export const getTemplates = () =>
  api.get<{ id: string; title: string }[]>("/api/draft/templates").then((r) => r.data);

export const createDraft = (doc_type: string, instructions: string, language: Language) =>
  api.post("/api/draft/", { doc_type, instructions, language }, { responseType: "blob" });

export const createAlert = (email: string, keywords: string[], sources: string[] = []) =>
  api.post("/api/alerts/", { email, keywords, sources }).then((r) => r.data);
