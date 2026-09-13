import { describe, expect, it } from "vitest";
import { getLocaleDisplayName } from "./locale-names";

describe("getLocaleDisplayName", () => {
  it("names a locale in the requested display language", () => {
    expect(getLocaleDisplayName("ja", "en")).toBe("Japanese");
    expect(getLocaleDisplayName("en", "ja")).toBe("英語");
  });

  it("names a locale in itself", () => {
    expect(getLocaleDisplayName("ja", "ja")).toBe("日本語");
  });

  it("falls back to the raw code for a display locale Intl can't resolve", () => {
    expect(getLocaleDisplayName("ja", "not-a-real-locale")).toBe("Japanese");
  });
});
