import { describe, expect, it } from "vitest";
import { parseSmt } from "./smt.ts";

describe(".smt files", () => {
  it("reads reference, topic, and verse, and keeps a nonzero score", () => {
    const text = [
      `"Alan 1","Test","This is a test 1","","",0`,
      `"Alan 5:2","Test","This is a test Three","","Alan",41`,
      `"Hope","Comfort","This is hope, hope","","",0`,
    ].join("\r\n");
    const imported = parseSmt(text);
    expect(imported.records.map((record) => record.reference)).toEqual(["Alan 1", "Alan 5:2", "Hope"]);
    expect(imported.records[1]?.topic).toBe("Test");
    expect(imported.records[2]?.verse).toBe("This is hope, hope");
    expect(imported.scores).toEqual([{ name: "Alan", score: 41, reference: "Alan 5:2" }]);
  });

  it("keeps a comma that sits inside quotes", () => {
    const imported = parseSmt(`"John 3:16","Gospel","For God so loved, the world","","",0\n`);
    expect(imported.records[0]?.verse).toBe("For God so loved, the world");
  });
});
