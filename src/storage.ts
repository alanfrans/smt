import { newId } from "./id.ts";
import type { Library, VerseRecord } from "./types.ts";

export const STORAGE_KEY = "smt.library.v1";

export type LoadResult =
  | { ok: true; records: VerseRecord[] }
  | { ok: false; reason: "empty" | "corrupt" };

function sanitize(value: unknown, seen: Set<string>): VerseRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.topic !== "string") return null;
  if (typeof record.reference !== "string") return null;
  if (typeof record.verse !== "string") return null;
  let id = typeof record.id === "string" && record.id ? record.id : newId();
  if (seen.has(id)) id = newId();
  seen.add(id);
  return { id, topic: record.topic, reference: record.reference, verse: record.verse };
}

export function loadLibrary(): LoadResult {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return { ok: false, reason: "empty" };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ok: false, reason: "corrupt" };
    const library = parsed as Partial<Library>;
    if (library.version !== 1 || !Array.isArray(library.records)) {
      return { ok: false, reason: "corrupt" };
    }
    const seen = new Set<string>();
    const records = library.records
      .map((record) => sanitize(record, seen))
      .filter((record): record is VerseRecord => record !== null);
    return { ok: true, records };
  } catch {
    return { ok: false, reason: "corrupt" };
  }
}

export function saveLibrary(records: readonly VerseRecord[]): void {
  const payload: Library = { version: 1, records: records.map((record) => ({ ...record })) };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
