import type { VerseRecord } from "./types.ts";

/** Shown when a verse was saved without a category. The desktop list hid those. */
export const UNCATEGORIZED = "(No category)";

export type CategoryGroup = {
  name: string;
  verses: VerseRecord[];
};

export function isBlank(record: VerseRecord): boolean {
  return !record.topic.trim() && !record.reference.trim() && !record.verse.trim();
}

export function categoryName(topic: string): string {
  const trimmed = topic.trim();
  return trimmed || UNCATEGORIZED;
}

/**
 * Categories in first-seen order, matching the desktop combo box.
 * Names compare case-insensitively. Verses with no category come last
 * so they stay reachable; the desktop list never showed them.
 */
export function groupCategories(records: readonly VerseRecord[]): CategoryGroup[] {
  const order: string[] = [];
  const groups = new Map<string, CategoryGroup>();

  for (const record of records) {
    if (isBlank(record)) continue;
    const name = categoryName(record.topic);
    const key = name.toLowerCase();
    let group = groups.get(key);
    if (!group) {
      group = { name, verses: [] };
      groups.set(key, group);
      order.push(key);
    }
    group.verses.push(record);
  }

  const uncategorizedKey = UNCATEGORIZED.toLowerCase();
  const keys = order.filter((key) => key !== uncategorizedKey);
  if (order.includes(uncategorizedKey)) keys.push(uncategorizedKey);
  return keys.map((key) => {
    const group = groups.get(key);
    if (!group) throw new Error(`Missing category ${key}`);
    return group;
  });
}
