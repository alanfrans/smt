import { describe, expect, it } from "vitest";
import {
  MAX_SCORED_MS,
  bestScores,
  considerScore,
  formatScoreNumber,
  loadScores,
  parseScoresSms,
  saveScores,
  scoreTenths,
  serializeScoresSms,
} from "./scores.ts";

describe("scores", () => {
  it("parses scores.sms triples, including the leading space from Str()", () => {
    const text = "Alan\r\n 77\r\nRomans 3:23\r\nAlan\r\n 58\r\nAlan 4:1\r\n";
    expect(parseScoresSms(text)).toEqual([
      { name: "Alan", score: 77, reference: "Romans 3:23" },
      { name: "Alan", score: 58, reference: "Alan 4:1" },
    ]);
    const again = parseScoresSms(serializeScoresSms(parseScoresSms(text)));
    expect(again).toEqual(parseScoresSms(text));
  });

  it("keeps the three fastest times for a reference", () => {
    let entries = considerScore([], { name: "Alan", score: 300, reference: "John 3:16" }).entries;
    entries = considerScore(entries, { name: "Beth", score: 200, reference: "john 3:16" }).entries;
    entries = considerScore(entries, { name: "Cam", score: 100, reference: "John 3:16" }).entries;
    const rejected = considerScore(entries, { name: "Dee", score: 400, reference: "John 3:16" });
    expect(rejected.saved).toBe(false);
    const replaced = considerScore(entries, { name: "Eve", score: 50, reference: "John 3:16" });
    expect(replaced.saved).toBe(true);
    expect(bestScores(replaced.entries, "John 3:16").map((entry) => entry.score)).toEqual([50, 100, 200]);
    expect(bestScores(replaced.entries, "John 3:16").some((entry) => entry.name === "Alan")).toBe(false);
  });

  it("scores tenths of a second and stops at 16 minutes", () => {
    expect(scoreTenths(2500)).toBe(25);
    expect(formatScoreNumber(1250)).toBe("1,250");
    expect(scoreTenths(MAX_SCORED_MS - 1)).not.toBeNull();
    expect(scoreTenths(MAX_SCORED_MS)).toBeNull();
  });

  it("stores the score list apart from the verse library", () => {
    localStorage.clear();
    saveScores({
      version: 1,
      name: "Alan",
      entries: [{ name: "Alan", score: 77, reference: "Romans 3:23" }],
    });
    expect(loadScores().name).toBe("Alan");
    expect(loadScores().entries[0]?.score).toBe(77);
    expect(localStorage.getItem("smt.library.v1")).toBeNull();
  });
});
