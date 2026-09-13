import type { SupportedLocale } from "./locales";

// `Intl.DisplayNames` wants BCP-47 tags; our locale codes already are one
// (`pt-BR`, `zh-CN`, ...), so no translation table is needed here.
export function getLocaleDisplayName(locale: SupportedLocale, displayLocale: string): string {
  try {
    const displayNames = new Intl.DisplayNames([displayLocale, "en"], { type: "language" });
    const name = displayNames.of(locale);
    return name ?? locale;
  } catch {
    // Intl.DisplayNames throws on engines without full ICU data
    // (e.g. some minimal Node builds); fall back to the raw code.
    return locale;
  }
}
