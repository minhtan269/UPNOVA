/**
 * Supported locale identifiers (IETF BCP 47)
 */
export type Locale = "en" | "vi";

/**
 * Nested translation catalog structure: supports arbitrary depth nesting
 */
export type TranslationValue = string | Record<string, any>;
export type TranslationCatalog = Record<string, TranslationValue>;

/**
 * Value provided by LanguageContext to consumers
 */
export interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
}

/**
 * All locales supported by the application
 */
export const SUPPORTED_LOCALES: Locale[] = ["en", "vi"];

/**
 * Default locale used when no valid locale is found in storage
 */
export const DEFAULT_LOCALE: Locale = "en";

/**
 * localStorage key used to persist the user's locale preference
 */
export const STORAGE_KEY = "acrm-locale";
