/**
 * Fill-in drill, ported from clsSMT.ReturnPartialVerse.
 *
 * The desktop app split a verse on spaces, hid N of those words behind
 * underscores of the same length, and checked what the user typed.
 * This keeps that drill and drops the stack off-by-ones: every word,
 * including the last, can be hidden, and a fully hidden verse still
 * remembers which words are missing.
 */

const EDGE_PUNCTUATION = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

export function splitWords(verse: string): string[] {
  return verse.trim().split(/\s+/).filter((word) => word.length > 0);
}

export function clampCount(value: number, wordCount: number): number {
  if (!Number.isFinite(value)) return 0;
  const count = Math.trunc(value);
  if (count < 0) return 0;
  if (count > wordCount) return wordCount;
  return count;
}

function roll(rng: () => number, span: number): number {
  const raw = rng();
  if (!Number.isFinite(raw) || span <= 1) return 0;
  const scaled = Math.floor(raw * span);
  if (scaled < 0) return 0;
  if (scaled >= span) return span - 1;
  return scaled;
}

/** True where a word should be replaced with underscores. */
export function hideWords(
  words: readonly string[],
  leaveOut: number,
  rng: () => number = Math.random,
): boolean[] {
  const hidden = words.map(() => false);
  const count = clampCount(leaveOut, words.length);
  if (count === 0) return hidden;
  if (count === words.length) return words.map(() => true);

  const order = words.map((_, index) => index);
  for (let i = 0; i < count; i++) {
    const span = order.length - i;
    const j = i + roll(rng, span);
    const swap = order[i];
    order[i] = order[j] ?? i;
    order[j] = swap ?? j;
    const picked = order[i];
    if (picked !== undefined) hidden[picked] = true;
  }
  return hidden;
}

export function blankGlyph(word: string): string {
  return "_".repeat(Math.max(word.length, 1));
}

function fold(value: string): string {
  return value.trim().toLowerCase().replace(/[’‘]/g, "'");
}

/**
 * A typed word matches the blank when it equals the token, ignoring case
 * and curly apostrophes. Trailing punctuation such as the comma in
 * "world," does not have to be typed. The desktop checker was
 * case-sensitive and only accepted A–Z, so "world," could never match.
 */
export function wordMatches(typed: string, expected: string): boolean {
  const attempt = fold(typed);
  if (!attempt) return false;
  if (attempt === fold(expected)) return true;
  const core = fold(expected.replace(EDGE_PUNCTUATION, ""));
  return core.length > 0 && attempt === core;
}

export function firstHiddenIndex(hidden: readonly boolean[]): number {
  return hidden.indexOf(true);
}
