"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { Locale, LanguageContextValue, TranslationCatalog } from "./types";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, STORAGE_KEY } from "./types";
import enCatalog from "@/locales/en.json";
import viCatalog from "@/locales/vi.json";

const catalogs: Record<Locale, TranslationCatalog> = {
  en: enCatalog as TranslationCatalog,
  vi: viCatalog as TranslationCatalog,
};

export const LanguageContext = createContext<LanguageContextValue | null>(null);

function getNestedValue(obj: TranslationCatalog, key: string): string | undefined {
  const parts = key.split(".");
  if (parts.length < 2) return undefined;
  
  // Start with the first part (namespace)
  let current: any = obj[parts[0]];
  
  // Navigate through the remaining parts
  for (let i = 1; i < parts.length; i++) {
    if (current && typeof current === 'object') {
      current = current[parts[i]];
    } else {
      return undefined;
    }
  }
  
  return typeof current === 'string' ? current : undefined;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Read from localStorage on mount (useEffect to avoid SSR hydration mismatch)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) {
        setLocaleState(stored as Locale);
      }
    } catch {
      // localStorage not available (SSR, private mode) — use default
    }
  }, []);

  // Update document.documentElement.lang when locale changes
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    if (!SUPPORTED_LOCALES.includes(newLocale)) return;
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {
      // localStorage not available — ignore
    }
  };

  const t = (key: string, fallback?: string): string => {
    // Try active locale catalog first
    const activeValue = getNestedValue(catalogs[locale], key);
    if (activeValue !== undefined) return activeValue;

    // Fallback to English catalog
    const enValue = getNestedValue(catalogs.en, key);
    if (enValue !== undefined) return enValue;

    // Return fallback or key itself for debugging
    return fallback ?? key;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
