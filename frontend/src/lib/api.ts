import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
});

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

export const search = (query: string, language: Language, filters = {}) =>
  api.post<SearchResult>("/api/search/", { query, language, filters }).then((r) => r.data);

export const getLawyers = (q?: string, page = 1) =>
  api.get<Lawyer[]>("/api/lawyers/", { params: { q, page } }).then((r) => r.data);

export const getLawyer = (warrant: string) =>
  api.get<Lawyer>(`/api/lawyers/${warrant}`).then((r) => r.data);

export const getLaws = (q?: string, page = 1) =>
  api.get<Law[]>("/api/laws/", { params: { q, page } }).then((r) => r.data);

export const getJudgments = (params: Record<string, string | number>) =>
  api.get<Judgment[]>("/api/judgments/", { params }).then((r) => r.data);

export const getTemplates = () =>
  api.get<{ id: string; title: string }[]>("/api/draft/templates").then((r) => r.data);

export const createDraft = (doc_type: string, instructions: string, language: Language) =>
  api.post("/api/draft/", { doc_type, instructions, language }, { responseType: "blob" });

export const createAlert = (email: string, keywords: string[], sources: string[] = []) =>
  api.post("/api/alerts/", { email, keywords, sources }).then((r) => r.data);
