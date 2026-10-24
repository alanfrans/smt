import { beforeEach, describe, expect, it } from "vitest";
import { loadLibrary, saveLibrary, STORAGE_KEY } from "./storage.ts";

describe("library storage", () => {
  beforeEach(() => localStorage.clear());

  it("treats a missing key as an empty browser", () => {
    expect(loadLibrary()).toEqual({ ok: false, reason: "empty" });
  });

  it("round-trips records and rejects a broken payload", () => {
    saveLibrary([{ id: "a", topic: "Gospel", reference: "John 3:16", verse: "For God" }]);
    expect(loadLibrary()).toEqual({
      ok: true,
      records: [{ id: "a", topic: "Gospel", reference: "John 3:16", verse: "For God" }],
    });
    localStorage.setItem(STORAGE_KEY, "{");
    expect(loadLibrary()).toEqual({ ok: false, reason: "corrupt" });
  });

  it("keeps an intentionally empty library empty", () => {
    saveLibrary([]);
    expect(loadLibrary()).toEqual({ ok: true, records: [] });
  });
});
