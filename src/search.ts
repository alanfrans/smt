/**
 * Word search, from frmWordSearch.FillSearch and the line selection in
 * OKToSelect. Letters only, eight directions, and a later word may sit on
 * top of an earlier one when the shared letters match.
 *
 * A repeated word is listed once. One-letter words are left out of the
 * grid; a search made of "a" and "I" is not useful on a phone.
 */

export type CellPos = { row: number; col: number };

export type Placement = {
  word: string;
  cells: CellPos[];
};

export type Puzzle = {
  /** Largest side, kept for callers that only need "is there a grid". */
  size: number;
  rows: number;
  cols: number;
  grid: string[][];
  words: string[];
  placements: Placement[];
};

const DIRECTIONS: readonly (readonly [number, number])[] = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

const MIN_WORD = 2;

export function wordKey(token: string): string | null {
  const key = token.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (key.length < MIN_WORD) return null;
  return key;
}

/** Unique puzzle words in the order they first appear. */
export function puzzleWords(verse: string): string[] {
  const seen = new Set<string>();
  const words: string[] = [];
  for (const token of verse.trim().split(/\s+/)) {
    const key = wordKey(token);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    words.push(key);
  }
  return words;
}

function indexOf(rng: () => number, span: number): number {
  if (span <= 1) return 0;
  const raw = rng();
  const scaled = Number.isFinite(raw) ? Math.floor(raw * span) : 0;
  if (scaled <= 0) return 0;
  if (scaled >= span) return span - 1;
  return scaled;
}

function emptyGrid(rows: number, cols: number = rows): string[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ""));
}

export type GridShape = { rows: number; cols: number };

/** Desktop puzzles are square; phones get a tall grid that fits a narrow screen. */
export const DESKTOP_SHAPE: GridShape = { rows: 16, cols: 16 };
export const MOBILE_SHAPE: GridShape = { rows: 24, cols: 10 };

export function tryPlaceWord(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dr: number,
  dc: number,
): CellPos[] | null {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (r < 0 || c < 0 || r >= rows || c >= cols) return null;
    const letter = grid[r]?.[c] ?? "";
    const next = word[i] ?? "";
    if (letter && letter !== next) return null;
  }
  const cells: CellPos[] = [];
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const rowCells = grid[r];
    if (!rowCells) return null;
    rowCells[c] = word[i] ?? "";
    cells.push({ row: r, col: c });
  }
  return cells;
}

function placeOne(grid: string[][], word: string, rng: () => number): Placement | null {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const tries = Math.max(rows, cols) * 12;
  for (let attempt = 0; attempt < tries; attempt++) {
    const row = indexOf(rng, rows);
    const col = indexOf(rng, cols);
    const direction = DIRECTIONS[indexOf(rng, DIRECTIONS.length)] ?? DIRECTIONS[0];
    const cells = tryPlaceWord(grid, word, row, col, direction[0], direction[1]);
    if (cells) return { word, cells };
  }
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      for (const [dr, dc] of DIRECTIONS) {
        const cells = tryPlaceWord(grid, word, row, col, dr, dc);
        if (cells) return { word, cells };
      }
    }
  }
  return null;
}

function placeAll(words: readonly string[], rows: number, cols: number, rng: () => number): Puzzle | null {
  const grid = emptyGrid(rows, cols);
  const placements: Placement[] = [];
  for (const word of words) {
    const placed = placeOne(grid, word, rng);
    if (!placed) return null;
    placements.push(placed);
  }
  return { size: Math.max(rows, cols), rows, cols, grid, words: [...words], placements };
}

function fallback(words: readonly string[]): Puzzle {
  const longest = words.reduce((max, word) => Math.max(max, word.length), 1);
  const size = Math.max(words.length, longest, 1);
  const grid = emptyGrid(size, size);
  const placements: Placement[] = [];
  words.forEach((word, row) => {
    const cells: CellPos[] = [];
    for (let col = 0; col < word.length; col++) {
      const rowCells = grid[row];
      if (!rowCells) continue;
      rowCells[col] = word[col] ?? "";
      cells.push({ row, col });
    }
    placements.push({ word, cells });
  });
  return { size, rows: size, cols: size, grid, words: [...words], placements };
}

function fillBlanks(grid: string[][], rng: () => number) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const row of grid) {
    for (let col = 0; col < row.length; col++) {
      if (!row[col]) row[col] = alphabet[indexOf(rng, alphabet.length)] ?? "A";
    }
  }
}

export function buildPuzzle(
  verse: string,
  rng: () => number = Math.random,
  preferred: number | GridShape = 16,
): Puzzle {
  const shape = typeof preferred === "number" ? { rows: preferred, cols: preferred } : preferred;
  const ranked = puzzleWords(verse)
    .map((word, order) => ({ word, order }))
    .sort((a, b) => b.word.length - a.word.length || a.order - b.order)
    .map((item) => item.word);
  if (!ranked.length) return { size: 0, rows: 0, cols: 0, grid: [], words: [], placements: [] };

  const longest = ranked.reduce((max, word) => Math.max(max, word.length), 1);
  // A word only has to fit along the long side (vertical); short side stays as asked.
  let rows = Math.max(shape.rows, shape.rows >= shape.cols ? longest : 0);
  let cols = Math.max(shape.cols, shape.cols > shape.rows ? longest : 0);
  if (Math.max(rows, cols) < longest) rows = longest;
  const growRows = rows >= cols;
  const start = growRows ? rows : cols;
  const limit = Math.max(start + 8, Math.min(32, longest + ranked.length));
  let puzzle: Puzzle | null = null;
  while ((growRows ? rows : cols) <= limit && !puzzle) {
    for (let tryNumber = 0; tryNumber < 8 && !puzzle; tryNumber++) {
      puzzle = placeAll(ranked, rows, cols, rng);
    }
    if (!puzzle) {
      if (growRows) rows += 1;
      else cols += 1;
    }
  }
  if (!puzzle) puzzle = fallback(ranked);
  fillBlanks(puzzle.grid, rng);
  return puzzle;
}

export function cellsOnLine(start: CellPos, end: CellPos): CellPos[] | null {
  const dr = end.row - start.row;
  const dc = end.col - start.col;
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  const sr = Math.sign(dr);
  const sc = Math.sign(dc);
  const cells: CellPos[] = [];
  for (let i = 0; i <= steps; i++) {
    cells.push({ row: start.row + sr * i, col: start.col + sc * i });
  }
  return cells;
}

export function lettersOnLine(grid: readonly (readonly string[])[], cells: readonly CellPos[]): string {
  let text = "";
  for (const cell of cells) {
    text += grid[cell.row]?.[cell.col] ?? "";
  }
  return text;
}

/** The remaining word a selection spells, forward or backward. */
export function matchWord(selection: string, remaining: readonly string[]): string | null {
  const text = selection.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (text.length < MIN_WORD) return null;
  const forward = remaining.find((word) => word === text);
  if (forward) return forward;
  const reversed = [...text].reverse().join("");
  return remaining.find((word) => word === reversed) ?? null;
}

export function gridContains(grid: readonly (readonly string[])[], word: string): boolean {
  const target = word.toUpperCase();
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      for (const [dr, dc] of DIRECTIONS) {
        let spelled = "";
        let inside = true;
        for (let i = 0; i < target.length; i++) {
          const r = row + dr * i;
          const c = col + dc * i;
          if (r < 0 || c < 0 || r >= rows || c >= cols) {
            inside = false;
            break;
          }
          spelled += grid[r]?.[c] ?? "";
        }
        if (inside && spelled === target) return true;
      }
    }
  }
  return false;
}
