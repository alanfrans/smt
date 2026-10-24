import { newId } from "./id.ts";
import type { VerseRecord } from "./types.ts";

/**
 * Desktop SMT files (.sms) are line-oriented text, not strict XML.
 * frmSMT.SaveCurrentRecords writes tags with PrintLine, and OpenSMSFile
 * matches the trimmed, uppercased tag on its own line, then reads the
 * next line as the value.
 *
 * This parser also keeps extra lines until the closing tag, so a verse
 * that was wrapped by hand survives. Export writes one line per field
 * with CRLF so the desktop app can open the file.
 */

const OPEN_RECORD = "<RECORD>";
const CLOSE_RECORD = "</RECORD>";

type Field = "topic" | "reference" | "verse";

const OPEN_FIELD: Record<string, Field> = {
  "<TOPIC>": "topic",
  "<REFERENCE>": "reference",
  "<VERSE>": "verse",
};

const CLOSE_FIELD = new Set(["</TOPIC>", "</REFERENCE>", "</VERSE>"]);

function emptyRecord(): VerseRecord {
  return { id: newId(), topic: "", reference: "", verse: "" };
}

export function parseSms(text: string): VerseRecord[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const records: VerseRecord[] = [];
  let current: VerseRecord | null = null;
  let field: Field | null = null;
  const buffer: string[] = [];

  const flushField = () => {
    if (current && field) {
      current[field] = buffer.join("\n").trim();
    }
    field = null;
    buffer.length = 0;
  };

  for (const line of lines) {
    const token = line.trim().toUpperCase();
    if (token === OPEN_RECORD) {
      flushField();
      current = emptyRecord();
      records.push(current);
      continue;
    }
    if (token === CLOSE_RECORD) {
      flushField();
      current = null;
      continue;
    }
    const opened = OPEN_FIELD[token];
    if (opened) {
      flushField();
      if (!current) {
        current = emptyRecord();
        records.push(current);
      }
      field = opened;
      continue;
    }
    if (CLOSE_FIELD.has(token)) {
      flushField();
      continue;
    }
    if (current && field) buffer.push(line.trim());
  }
  flushField();

  return records.filter((record) => record.topic || record.reference || record.verse);
}

function oneLine(value: string): string {
  return value.replace(/\s*\r?\n\s*/g, " ").trim();
}

export function serializeSms(records: readonly VerseRecord[]): string {
  const lines = ["<SMTFile>"];
  for (const record of records) {
    const topic = oneLine(record.topic);
    const reference = oneLine(record.reference);
    const verse = oneLine(record.verse);
    if (!topic && !reference && !verse) continue;
    lines.push(
      "  <Record>",
      "    <Topic>",
      `      ${topic}`,
      "    </Topic>",
      "    <Reference>",
      `      ${reference}`,
      "    </Reference>",
      "    <Verse>",
      `      ${verse}`,
      "    </Verse>",
      "  </Record>",
    );
  }
  lines.push("</SMTFile>", "");
  return lines.join("\r\n");
}
