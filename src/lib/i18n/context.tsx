"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { TRANSLATIONS, type LanguageCode, type Translations } from "./translations";

interface LanguageContextType {
  language: "en" | "hi" | "ml" | "ta";
  setLanguage: (lang: "en" | "hi" | "ml" | "ta") => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: TRANSLATIONS.en,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<"en" | "hi" | "ml" | "ta">("en");

  useEffect(() => {
    const saved = localStorage.getItem("chaanbean_lang") as "en" | "hi" | "ml" | "ta" | null;
    if (saved && ["en", "hi", "ml", "ta"].includes(saved)) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: "en" | "hi" | "ml" | "ta") => {
    setLanguageState(lang);
    localStorage.setItem("chaanbean_lang", lang);
  };

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
