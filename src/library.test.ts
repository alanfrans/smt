import { describe, expect, it } from "vitest";
import { categoryName, groupCategories, UNCATEGORIZED } from "./library.ts";
import type { VerseRecord } from "./types.ts";

function verse(id: string, topic: string, reference: string): VerseRecord {
  return { id, topic, reference, verse: "Text" };
}

describe("groupCategories", () => {
  it("keeps first-seen names, merges case, and parks blank topics at the end", () => {
    const groups = groupCategories([
      verse("1", "Gospel", "John 3:16"),
      verse("2", "gospel", "John 14:6"),
      verse("3", "  ", "Psalm 23:1"),
      { id: "4", topic: "", reference: "", verse: "" },
      verse("5", "Trust", "Romans 8:28"),
    ]);
    expect(groups.map((group) => group.name)).toEqual(["Gospel", "Trust", UNCATEGORIZED]);
    expect(groups[0]?.verses.map((item) => item.reference)).toEqual(["John 3:16", "John 14:6"]);
    expect(groups[2]?.verses.map((item) => item.id)).toEqual(["3"]);
    expect(categoryName("  Trust  ")).toBe("Trust");
  });
});
