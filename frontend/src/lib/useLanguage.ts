"use client";
import { useState, useEffect } from "react";

export type Language = "mt" | "en";

export function useLanguage(): [Language, (l: Language) => void] {
  const [lang, setLangState] = useState<Language>("mt");

  useEffect(() => {
    const stored = localStorage.getItem("lexmalta_lang") as Language | null;
    if (stored === "mt" || stored === "en") setLangState(stored);
  }, []);

  const setLang = (l: Language) => {
    localStorage.setItem("lexmalta_lang", l);
    setLangState(l);
  };

  return [lang, setLang];
}
