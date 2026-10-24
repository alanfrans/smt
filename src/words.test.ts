import { describe, expect, it } from "vitest";
import { blankGlyph, clampCount, hideWords, splitWords, wordMatches } from "./words.ts";

describe("splitWords", () => {
  it("drops extra spaces the way a cleaned Split would", () => {
    expect(splitWords("  For   God so  ")).toEqual(["For", "God", "so"]);
  });
});

describe("hideWords", () => {
  const words = ["alpha", "beta", "gamma"];

  it("hides nothing and everything at the ends of the slider", () => {
    expect(hideWords(words, 0)).toEqual([false, false, false]);
    expect(hideWords(words, 3)).toEqual([true, true, true]);
    expect(hideWords(words, 99)).toEqual([true, true, true]);
    expect(hideWords(words, -4)).toEqual([false, false, false]);
  });

  it("can hide the last word", () => {
    expect(hideWords(words, 1, () => 0.999)).toEqual([false, false, true]);
  });

  it("hides the first words when the random source stays at zero", () => {
    expect(hideWords(words, 2, () => 0)).toEqual([true, true, false]);
  });
});

describe("wordMatches", () => {
  it("ignores case, curly apostrophes, and edge punctuation", () => {
    expect(wordMatches("for", "For")).toBe(true);
    expect(wordMatches("world", "world,")).toBe(true);
    expect(wordMatches("world,", "world,")).toBe(true);
    expect(wordMatches("lord's", "Lord’s")).toBe(true);
    expect(wordMatches("life", "life.")).toBe(true);
  });

  it("does not accept a different word or a prefix", () => {
    expect(wordMatches("Gods", "God")).toBe(false);
    expect(wordMatches("God", "God's")).toBe(false);
    expect(wordMatches("Fo", "For")).toBe(false);
    expect(wordMatches("  ", "For")).toBe(false);
    expect(wordMatches("worldly", "world,")).toBe(false);
  });
});

describe("blankGlyph", () => {
  it("uses one underscore per character", () => {
    expect(blankGlyph("world,")).toBe("______");
    expect(clampCount(Number.NaN, 4)).toBe(0);
  });
});
