import { afterEach, describe, expect, it } from "vitest";

import { DEFAULT_LOCALE } from "./locales";
import { LOCALE_STORAGE_KEY, detectInitialLocale, i18n, setLocale } from ".";

function setNavigatorLanguages(languages: string[]) {
  // detectInitialLocale() only reads navigator inside a `typeof window !==
  // "undefined"` guard (real browser, not Node's own global `navigator`), so
  // exercising that branch here needs a `window` stub too.
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { languages, language: languages[0] },
  });
}

afterEach(() => {
  localStorage.removeItem(LOCALE_STORAGE_KEY);
  Reflect.deleteProperty(globalThis, "navigator");
  Reflect.deleteProperty(globalThis, "window");
  // setLocale() below drives the shared i18next singleton, which every test
  // file imports — leaving it on a non-default language would leak into
  // unrelated tests that assume the English default.
  void i18n.changeLanguage(DEFAULT_LOCALE);
});

describe("detectInitialLocale", () => {
  it("prefers a stored manual choice over the browser language", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "ja");
    setNavigatorLanguages(["fr-FR"]);
    expect(detectInitialLocale()).toBe("ja");
  });

  it("matches the browser language when nothing is stored", () => {
    setNavigatorLanguages(["ja-JP", "en-US"]);
    expect(detectInitialLocale()).toBe("ja");
  });

  it("falls back to the default locale when no browser language matches", () => {
    setNavigatorLanguages(["xx-XX"]);
    expect(detectInitialLocale()).toBe("en");
  });

  it("ignores an unsupported stored value", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "xx");
    setNavigatorLanguages(["xx-XX"]);
    expect(detectInitialLocale()).toBe("en");
  });
});

describe("setLocale", () => {
  it("persists the choice so the next detectInitialLocale call sees it", () => {
    setLocale("ja");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("ja");
    expect(detectInitialLocale()).toBe("ja");
  });
});
