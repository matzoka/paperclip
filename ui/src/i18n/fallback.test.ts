import i18next from "i18next";
import { describe, expect, it } from "vitest";

// Verifies the fallback contract this project's i18n design relies on
// (missing keys in a partial locale display the English string) against a
// scratch i18next instance, independent of production locale content.
describe("i18next fallbackLng contract", () => {
  it("falls back to the default locale for a key the active locale hasn't translated yet", async () => {
    const instance = i18next.createInstance();
    await instance.init({
      lng: "ja",
      fallbackLng: "en",
      resources: {
        en: { translation: { translated: "A", untranslated: "B" } },
        ja: { translation: { translated: "あ" } },
      },
      interpolation: { escapeValue: false },
    });

    expect(instance.t("translated")).toBe("あ");
    expect(instance.t("untranslated")).toBe("B");
  });
});
