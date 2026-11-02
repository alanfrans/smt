import { describe, expect, it } from "vitest";
import {
  buildPuzzle,
  cellsOnLine,
  gridContains,
  lettersOnLine,
  matchWord,
  mobileShapeFor,
  puzzleWords,
  tryPlaceWord,
  MOBILE_SHAPE,
  MOBILE_SHAPE_LONG,
  MOBILE_SHORT_LETTER_BUDGET,
  MOBILE_SHORT_WORD_BUDGET,
  DESKTOP_SHAPE,
  wordKey,
} from "./search.ts";
import { sampleRecords } from "./sample.ts";

const JOHN =
  "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.";

describe("word search", () => {
  it("keeps letters and digits, drops short words, and lists a word once", () => {
    expect(wordKey("world,")).toBe("WORLD");
    expect(wordKey("I")).toBeNull();
    expect(wordKey("a")).toBeNull();
    expect(puzzleWords("That that world, I a")).toEqual(["THAT", "WORLD"]);
    expect(puzzleWords(JOHN)).toContain("EVERLASTING");
    expect(puzzleWords(JOHN).filter((word) => word === "THAT")).toHaveLength(1);
  });

  it("lets a later word share a letter", () => {
    const grid = [
      ["", "", ""],
      ["", "", ""],
      ["", "", ""],
    ];
    expect(tryPlaceWord(grid, "CAT", 0, 0, 0, 1)?.map((cell) => cell.col)).toEqual([0, 1, 2]);
    expect(tryPlaceWord(grid, "CAR", 0, 0, 1, 0)?.map((cell) => cell.row)).toEqual([0, 1, 2]);
    expect(grid[0]).toEqual(["C", "A", "T"]);
    expect(grid.map((row) => row[0])).toEqual(["C", "A", "R"]);
    expect(tryPlaceWord(grid, "DOG", 0, 0, 0, 1)).toBeNull();
  });

  it("hides every puzzle word in the grid and fills the rest with letters", () => {
    const puzzle = buildPuzzle(JOHN, () => 0);
    expect(puzzle.size).toBeGreaterThanOrEqual(16);
    expect(puzzle.words.length).toBeGreaterThan(10);
    for (const word of puzzle.words) {
      expect(gridContains(puzzle.grid, word)).toBe(true);
    }
    for (const row of puzzle.grid) {
      expect(row.every((letter) => /^[A-Z]$/.test(letter))).toBe(true);
    }
  });

  it("reads a straight or diagonal line and accepts it backward", () => {
    const grid = [
      ["C", "A", "T"],
      ["X", "B", "Y"],
      ["Z", "Q", "R"],
    ];
    const across = cellsOnLine({ row: 0, col: 0 }, { row: 0, col: 2 });
    expect(across).not.toBeNull();
    expect(lettersOnLine(grid, across ?? [])).toBe("CAT");
    expect(cellsOnLine({ row: 0, col: 0 }, { row: 1, col: 2 })).toBeNull();
    const back = cellsOnLine({ row: 0, col: 2 }, { row: 0, col: 0 });
    expect(matchWord(lettersOnLine(grid, back ?? []), ["CAT"])).toBe("CAT");
    expect(matchWord("DOG", ["CAT"])).toBeNull();
    expect(matchWord("A", ["CAT"])).toBeNull();
  });

  it("uses an 8 by 16 phone grid when the verse fits, and hides every word", () => {
    const short = "The LORD is my shepherd; I shall not want.";
    expect(mobileShapeFor(short)).toEqual(MOBILE_SHAPE);
    let n = 0;
    const lcg = () => {
      n = (n * 9301 + 49297) % 233280;
      return n / 233280;
    };
    for (const r of [() => 0, () => 0.5, () => 0.999, lcg]) {
      const puzzle = buildPuzzle(short, r, mobileShapeFor(short));
      expect(puzzle.cols).toBe(8);
      expect(puzzle.rows).toBe(16);
      expect(puzzle.grid).toHaveLength(16);
      for (const row of puzzle.grid) expect(row).toHaveLength(8);
      expect(new Set(puzzle.words)).toEqual(new Set(puzzleWords(short)));
      for (const word of puzzle.words) expect(gridContains(puzzle.grid, word)).toBe(true);
    }
  });

  it("uses 8 by 20 when a verse has too many words or letters for 8 by 16", () => {
    expect(puzzleWords(JOHN).length).toBeGreaterThan(MOBILE_SHORT_WORD_BUDGET);
    const johnLetters = puzzleWords(JOHN).reduce((sum, word) => sum + word.length, 0);
    expect(johnLetters).toBeGreaterThan(MOBILE_SHORT_LETTER_BUDGET);
    expect(mobileShapeFor(JOHN)).toEqual(MOBILE_SHAPE_LONG);

    const lettersOnly = sampleRecords().find((record) => record.reference === "2 Timothy 3:16");
    if (!lettersOnly) throw new Error("missing 2 Timothy 3:16");
    const timothyWords = puzzleWords(lettersOnly.verse);
    expect(timothyWords.length).toBeLessThanOrEqual(MOBILE_SHORT_WORD_BUDGET);
    expect(timothyWords.reduce((sum, word) => sum + word.length, 0)).toBeGreaterThan(MOBILE_SHORT_LETTER_BUDGET);
    expect(mobileShapeFor(lettersOnly.verse)).toEqual(MOBILE_SHAPE_LONG);

    const manyWords = Array.from({ length: MOBILE_SHORT_WORD_BUDGET + 1 }, (_, index) => `ox${index}`).join(" ");
    const many = puzzleWords(manyWords);
    expect(many.length).toBe(MOBILE_SHORT_WORD_BUDGET + 1);
    expect(many.reduce((sum, word) => sum + word.length, 0)).toBeLessThanOrEqual(MOBILE_SHORT_LETTER_BUDGET);
    expect(mobileShapeFor(manyWords)).toEqual(MOBILE_SHAPE_LONG);

    let n = 0;
    const lcg = () => {
      n = (n * 9301 + 49297) % 233280;
      return n / 233280;
    };
    for (const verse of [JOHN, lettersOnly.verse, manyWords]) {
      for (const r of [() => 0, () => 0.5, () => 0.999, lcg]) {
        const puzzle = buildPuzzle(verse, r, mobileShapeFor(verse));
        expect(puzzle.cols).toBe(8);
        expect(puzzle.rows).toBe(20);
        for (const row of puzzle.grid) expect(row).toHaveLength(8);
        for (const word of puzzle.words) expect(gridContains(puzzle.grid, word)).toBe(true);
      }
    }
  });

  it("keeps a phone grid 8 columns wide when a word is longer than 20", () => {
    const huge = `${"A".repeat(24)} is here now`;
    expect(mobileShapeFor(huge)).toEqual({ rows: 24, cols: 8 });
    const puzzle = buildPuzzle(huge, () => 0, mobileShapeFor(huge));
    expect(puzzle.cols).toBe(8);
    expect(puzzle.rows).toBeGreaterThanOrEqual(24);
    expect(gridContains(puzzle.grid, "A".repeat(24))).toBe(true);
    expect(puzzle.words.every((word) => gridContains(puzzle.grid, word))).toBe(true);
  });

  it("places every word of a crowded verse without widening past 8 columns", () => {
    const crowded = Array.from({ length: 40 }, (_, index) => `longword${index}`).join(" ");
    const puzzle = buildPuzzle(crowded, () => 0.3, mobileShapeFor(crowded));
    expect(puzzle.cols).toBe(8);
    expect(puzzle.words).toHaveLength(40);
    for (const word of puzzle.words) expect(gridContains(puzzle.grid, word)).toBe(true);
    for (const row of puzzle.grid) expect(row).toHaveLength(8);
  });

  it("places words in a non-square grid without running off the side", () => {
    const grid = Array.from({ length: 4 }, () => ["", ""]);
    expect(tryPlaceWord(grid, "ABC", 0, 0, 0, 1)).toBeNull();
    expect(tryPlaceWord(grid, "ABCD", 0, 1, 1, 0)?.map((cell) => cell.row)).toEqual([0, 1, 2, 3]);
    expect(gridContains(grid, "ABCD")).toBe(true);
  });

  it("keeps the desktop grid square at 16", () => {
    const puzzle = buildPuzzle(JOHN, () => 0, DESKTOP_SHAPE);
    expect(puzzle.rows).toBe(puzzle.cols);
    expect(puzzle.cols).toBeGreaterThanOrEqual(16);
  });
});