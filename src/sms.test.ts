import { describe, expect, it } from "vitest";
import { parseSms, serializeSms } from "./sms.ts";
import type { VerseRecord } from "./types.ts";

const desktopFile = [
  "<SMTFile>",
  "\t<Record>",
  "\t\t<Topic>",
  "\t\t\tGospel",
  "\t\t</Topic>",
  "\t\t<Reference>",
  "\t\t\tJohn 3:16",
  "\t\t</Reference>",
  "\t\t<Verse>",
  "\t\t\tFor God so loved the world",
  "\t\t</Verse>",
  "\t</Record>",
  "\t<Record>",
  "\t\t<Topic>",
  "\t\t",
  "\t\t</Topic>",
  "\t\t<Reference>",
  "\t\t",
  "\t\t</Reference>",
  "\t\t<Verse>",
  "\t\t",
  "\t\t</Verse>",
  "\t</Record>",
  "</SMTFile>",
  "",
].join("\r\n");

describe("parseSms", () => {
  it("reads a desktop-style file and skips an empty record", () => {
    const records = parseSms(desktopFile);
    expect(records).toHaveLength(1);
    expect(records[0]?.topic).toBe("Gospel");
    expect(records[0]?.reference).toBe("John 3:16");
    expect(records[0]?.verse).toBe("For God so loved the world");
  });

  it("matches tags without caring about case", () => {
    const records = parseSms(
      "<record>\n<topic>\nGospel\n</topic>\n<reference>\nJohn 3:16\n</reference>\n<verse>\nFor God so loved the world\n</verse>\n</record>\n",
    );
    expect(records).toHaveLength(1);
    expect(records[0]?.topic).toBe("Gospel");
    expect(records[0]?.verse).toBe("For God so loved the world");
  });

  it("keeps wrapped verse lines until the closing tag", () => {
    const records = parseSms("<Record>\n<Verse>\nline one\nline two\n</Verse>\n</Record>\n");
    expect(records[0]?.verse).toBe("line one\nline two");
  });

  it("returns nothing for a file that is not a verse set", () => {
    expect(parseSms("hello")).toEqual([]);
  });
});

describe("serializeSms", () => {
  it("round-trips fields and flattens line breaks for the desktop reader", () => {
    const records: VerseRecord[] = [
      {
        id: "1",
        topic: "Comfort",
        reference: "Psalm 23:1",
        verse: "The LORD is my shepherd;\nI shall not want.",
      },
      { id: "2", topic: "", reference: "", verse: "" },
    ];
    const parsed = parseSms(serializeSms(records));
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.topic).toBe("Comfort");
    expect(parsed[0]?.reference).toBe("Psalm 23:1");
    expect(parsed[0]?.verse).toBe("The LORD is my shepherd; I shall not want.");
    expect(serializeSms(records).includes("\r\n")).toBe(true);
  });
});
