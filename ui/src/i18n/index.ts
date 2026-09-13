import i18n, { type InitOptions, type TOptions } from "i18next";
import { initReactI18next, useTranslation as useReactI18nextTranslation } from "react-i18next";

import { DEFAULT_LOCALE, i18nextResources, supportedLocales, type SupportedLocale } from "./locales";

export const LOCALE_STORAGE_KEY = "paperclip.locale";

function isSupportedLocale(value: string): value is SupportedLocale {
  return (supportedLocales as string[]).includes(value);
}

function storedLocale(): SupportedLocale | null {
  if (typeof localStorage === "undefined") return null;
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  return stored && isSupportedLocale(stored) ? stored : null;
}

function matchBrowserLocale(candidates: readonly string[]): SupportedLocale | null {
  for (const candidate of candidates) {
    // Computed before the type-guard below runs: `SupportedLocale` resolves
    // to plain `string` (locale codes come from a runtime glob, not a
    // literal union), so narrowing `candidate` on the guard's negative
    // branch would otherwise collapse it to `never`.
    const base = candidate.split("-")[0];
    if (isSupportedLocale(candidate)) return candidate;
    if (isSupportedLocale(base)) return base;
  }
  return null;
}

// A stored manual choice wins; otherwise fall back to the browser/OS
// language so a Japanese-locale environment shows `ja` without any UI
// switcher yet existing. Anything unmatched keeps the English default,
// which every key is guaranteed to have.
export function detectInitialLocale(): SupportedLocale {
  const stored = storedLocale();
  if (stored) return stored;
  // `typeof window` (not just `navigator`) gates this: Node.js itself defines
  // a global `navigator` (reflecting the host OS locale) since v21, and this
  // module also loads under Node in tests/SSR. Without the `window` check,
  // detection would follow the server machine's locale instead of the
  // visiting browser's, and unit tests would flake depending on the host's
  // OS language.
  if (typeof window !== "undefined" && typeof navigator !== "undefined") {
    const candidates = navigator.languages?.length ? navigator.languages : [navigator.language].filter(Boolean);
    const detected = matchBrowserLocale(candidates);
    if (detected) return detected;
  }
  return DEFAULT_LOCALE;
}

// Exposed for a future manual language switcher (e.g. in Settings); not
// wired to any UI yet.
export function setLocale(locale: SupportedLocale) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }
  void i18n.changeLanguage(locale);
}

const i18nextOptions: InitOptions = {
  resources: i18nextResources,
  lng: detectInitialLocale(),
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: supportedLocales,
  defaultNS: "translation",
  interpolation: { escapeValue: false },
  returnObjects: false,
  initAsync: false,
};

void i18n.use(initReactI18next).init(i18nextOptions).catch((error: unknown) => {
  console.error("Failed to initialize i18next", error);
});

export function t(key: string, options: TOptions = {}) {
  return i18n.t(key, options);
}

export const useTranslation = useReactI18nextTranslation;
export { i18n };
