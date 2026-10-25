import { describe, expect, it } from "vitest";
import {
  buildPuzzle,
  cellsOnLine,
  gridContains,
  lettersOnLine,
  matchWord,
  puzzleWords,
  tryPlaceWord,
  wordKey,
} from "./search.ts";

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
});
