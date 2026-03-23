"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { SUPPORTED_LOCALES } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/types";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  vi: "Tiếng Việt",
};

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedLocale, setHighlightedLocale] = useState<Locale>(locale);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Record<Locale, HTMLButtonElement | null>>({
    en: null,
    vi: null,
  });
  const listboxId = useId();

  const localeOptions = useMemo(
    () =>
      SUPPORTED_LOCALES.map((loc) => ({
        value: loc,
        label: LOCALE_LABELS[loc],
        optionId: `${listboxId}-${loc}`,
      })),
    [listboxId]
  );

  useEffect(() => {
    setHighlightedLocale(locale);
  }, [locale]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;

      if (e.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    optionRefs.current[highlightedLocale]?.focus();
  }, [highlightedLocale, isOpen]);

  const handleSelect = (newLocale: Locale) => {
    setLocale(newLocale);
    setHighlightedLocale(newLocale);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const getNextLocale = (current: Locale, direction: 1 | -1): Locale => {
    const currentIndex = SUPPORTED_LOCALES.indexOf(current);
    const nextIndex =
      (currentIndex + direction + SUPPORTED_LOCALES.length) %
      SUPPORTED_LOCALES.length;
    return SUPPORTED_LOCALES[nextIndex];
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedLocale(locale);
      setIsOpen(true);
      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    }
  };

  const handleOptionKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    currentLocale: Locale
  ) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedLocale(getNextLocale(currentLocale, 1));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedLocale(getNextLocale(currentLocale, -1));
      return;
    }

    if (e.key === "Home") {
      e.preventDefault();
      setHighlightedLocale(SUPPORTED_LOCALES[0]);
      return;
    }

    if (e.key === "End") {
      e.preventDefault();
      setHighlightedLocale(SUPPORTED_LOCALES[SUPPORTED_LOCALES.length - 1]);
      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelect(currentLocale);
      return;
    }

    if (e.key === "Tab") {
      setIsOpen(false);
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      buttonRef.current?.focus();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setHighlightedLocale(locale);
          setIsOpen((prev) => !prev);
        }}
        onKeyDown={handleTriggerKeyDown}
        aria-label={t("languageSwitcher.ariaLabel")}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-[#0FA697]/50 hover:text-[#0FA697] focus:outline-none focus:ring-2 focus:ring-[#0FA697]/20 dark:border-[#2a2d3a] dark:bg-[#1a1d27] dark:text-gray-200"
      >
        <svg
          className="h-3.5 w-3.5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
          />
        </svg>
        <span>{locale.toUpperCase()}</span>
        <svg
          className={`h-3 w-3 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={t("languageSwitcher.ariaLabel")}
          aria-activedescendant={`${listboxId}-${highlightedLocale}`}
          className="absolute right-0 top-full z-50 mt-1.5 w-36 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-[#2a2d3a] dark:bg-[#1e212c]"
        >
          {localeOptions.map(({ value, label, optionId }) => {
            const isActive = value === locale;
            const isHighlighted = value === highlightedLocale;

            return (
              <li key={value} role="option" aria-selected={isActive} id={optionId}>
                <button
                  ref={(node) => {
                    optionRefs.current[value] = node;
                  }}
                  type="button"
                  onClick={() => handleSelect(value)}
                  onMouseEnter={() => setHighlightedLocale(value)}
                  onKeyDown={(e) => handleOptionKeyDown(e, value)}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-[#0FA697]/10 font-semibold text-[#0FA697]"
                      : isHighlighted
                        ? "bg-gray-50 text-gray-700 dark:bg-white/5 dark:text-gray-200"
                        : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/5"
                  }`}
                >
                  <span>{label}</span>
                  {isActive && (
                    <svg
                      className="h-4 w-4 text-[#0FA697]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
