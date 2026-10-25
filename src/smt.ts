/**
 * VB6 verse files (.smt) are CSV written with Input # / Write #.
 * Each row is Reference, Topic, Verse, Version, Name, Score.
 * A score of 0 means the verse has no time attached.
 */

import { newId } from "./id.ts";
import type { ScoreEntry } from "./scores.ts";
import type { VerseRecord } from "./types.ts";

export type SmtImport = {
  records: VerseRecord[];
  scores: ScoreEntry[];
};

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < source.length; i++) {
    const ch = source[i] ?? "";
    if (quoted) {
      if (ch === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
      continue;
    }
    if (ch === ",") {
      pushField();
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && source[i + 1] === "\n") i += 1;
      pushRow();
      continue;
    }
    field += ch;
  }
  if (field.length > 0 || row.length > 0) pushRow();
  return rows;
}

export function parseSmt(text: string): SmtImport {
  const records: VerseRecord[] = [];
  const scores: ScoreEntry[] = [];
  for (const row of parseCsv(text)) {
    const reference = (row[0] ?? "").trim();
    const topic = (row[1] ?? "").trim();
    const verse = (row[2] ?? "").trim();
    const name = (row[4] ?? "").trim();
    const scoreText = (row[5] ?? "").trim();
    if (!reference && !topic && !verse) continue;
    records.push({ id: newId(), topic, reference, verse });
    const score = Number(scoreText);
    if (name && reference && Number.isFinite(score) && score > 0) {
      scores.push({ name, reference, score: Math.trunc(score) });
    }
  }
  return { records, scores };
}
