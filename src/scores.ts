/**
 * Type-test scores, from frmMainPage.checkScores and scores.sms.
 *
 * A score is elapsed time in tenths of a second. Lower is better.
 * The built-in list kept three scores for a reference. A zero in the
 * file means "no score", which is how .smt rows mark an untimed verse.
 *
 * Check() refused a score when the minute field was greater than 15,
 * so a finish of 15 minutes still counted and 16 minutes did not.
 */

export const SCORES_KEY = "smt.scores.v1";

export const PER_REFERENCE = 3;

/** 16 minutes. Matches the desktop `wMinute > 15` cutoff. */
export const MAX_SCORED_MS = 16 * 60 * 1000;

export type ScoreEntry = {
  name: string;
  score: number;
  reference: string;
};

export type ScoreState = {
  version: 1;
  name: string;
  entries: ScoreEntry[];
};

export function referenceKey(reference: string): string {
  return reference.trim().replace(/\s+/g, " ").toLowerCase();
}

export function emptyScores(): ScoreState {
  return { version: 1, name: "", entries: [] };
}

export function scoreTenths(elapsedMs: number): number | null {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return null;
  if (elapsedMs >= MAX_SCORED_MS) return null;
  return Math.floor(elapsedMs / 100);
}

export function formatScoreNumber(tenths: number): string {
  return Math.max(0, Math.trunc(tenths)).toLocaleString("en-US");
}

export function formatTenths(tenths: number): string {
  const total = Math.max(0, Math.trunc(tenths));
  const minutes = Math.floor(total / 600);
  const seconds = Math.floor((total % 600) / 10);
  const tenth = total % 10;
  if (minutes > 0) return `${minutes}:${String(seconds).padStart(2, "0")}.${tenth}`;
  return `${seconds}.${tenth} seconds`;
}

export function formatClock(elapsedMs: number): string {
  const safe = Number.isFinite(elapsedMs) ? Math.max(0, Math.floor(elapsedMs)) : 0;
  const totalSeconds = Math.floor(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** The word-search finish line. The desktop said "N Minutes N Seconds". */
export function formatTimeReport(elapsedMs: number): string {
  const safe = Number.isFinite(elapsedMs) ? Math.max(0, Math.floor(elapsedMs)) : 0;
  const totalSeconds = Math.floor(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const minuteWord = minutes === 1 ? "minute" : "minutes";
  const secondWord = seconds === 1 ? "second" : "seconds";
  return `Time: ${minutes} ${minuteWord} ${seconds} ${secondWord}.`;
}

export function bestScores(
  entries: readonly ScoreEntry[],
  reference: string,
  limit = PER_REFERENCE,
): ScoreEntry[] {
  const key = referenceKey(reference);
  return entries
    .filter((entry) => referenceKey(entry.reference) === key && entry.score >= 0 && entry.name.trim())
    .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function considerScore(
  entries: readonly ScoreEntry[],
  next: ScoreEntry,
): { entries: ScoreEntry[]; saved: boolean } {
  const name = next.name.trim();
  const reference = next.reference.trim();
  if (!name || !reference || !Number.isFinite(next.score) || next.score < 0) {
    return { entries: entries.slice(), saved: false };
  }
  const candidate: ScoreEntry = { name, reference, score: Math.trunc(next.score) };
  const key = referenceKey(reference);
  const same = entries.filter((entry) => referenceKey(entry.reference) === key);
  const rest = entries.filter((entry) => referenceKey(entry.reference) !== key);
  if (same.length < PER_REFERENCE) {
    return { entries: [...rest, ...same, candidate], saved: true };
  }
  let worstAt = 0;
  for (let i = 1; i < same.length; i++) {
    if ((same[i]?.score ?? 0) > (same[worstAt]?.score ?? 0)) worstAt = i;
  }
  const worst = same[worstAt];
  if (!worst || candidate.score >= worst.score) {
    return { entries: entries.slice(), saved: false };
  }
  const kept = same.filter((_, index) => index !== worstAt);
  return { entries: [...rest, ...kept, candidate], saved: true };
}

/**
 * scores.sms is repeating triples: name, score, reference.
 * VB Str() wrote the score with a leading space. Blank lines are ignored.
 */
export function parseScoresSms(text: string): ScoreEntry[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const entries: ScoreEntry[] = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i] ?? "";
    const scoreText = lines[i + 1] ?? "";
    const reference = lines[i + 2] ?? "";
    if (!/^\d+$/.test(scoreText)) continue;
    const score = Number(scoreText);
    if (!name || !reference || score <= 0) continue;
    entries.push({ name, score, reference });
  }
  return entries;
}

export function serializeScoresSms(entries: readonly ScoreEntry[]): string {
  const lines: string[] = [];
  for (const entry of entries) {
    const name = entry.name.trim();
    const reference = entry.reference.trim();
    if (!name || !reference || entry.score <= 0) continue;
    lines.push(name, ` ${Math.trunc(entry.score)}`, reference);
  }
  lines.push("");
  return lines.join("\r\n");
}

function sanitizeEntry(value: unknown): ScoreEntry | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Record<string, unknown>;
  if (typeof entry.name !== "string" || !entry.name.trim()) return null;
  if (typeof entry.reference !== "string" || !entry.reference.trim()) return null;
  if (typeof entry.score !== "number" || !Number.isFinite(entry.score) || entry.score < 0) return null;
  return { name: entry.name.trim(), reference: entry.reference.trim(), score: Math.trunc(entry.score) };
}

export function loadScores(): ScoreState {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    if (raw === null) return emptyScores();
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyScores();
    const state = parsed as Partial<ScoreState>;
    if (state.version !== 1 || !Array.isArray(state.entries)) return emptyScores();
    const name = typeof state.name === "string" ? state.name.slice(0, 40) : "";
    const entries = state.entries
      .map((entry) => sanitizeEntry(entry))
      .filter((entry): entry is ScoreEntry => entry !== null);
    return { version: 1, name, entries };
  } catch {
    return emptyScores();
  }
}

export function saveScores(state: ScoreState): void {
  const payload: ScoreState = {
    version: 1,
    name: state.name.slice(0, 40),
    entries: state.entries.map((entry) => ({
      name: entry.name,
      score: entry.score,
      reference: entry.reference,
    })),
  };
  localStorage.setItem(SCORES_KEY, JSON.stringify(payload));
}
