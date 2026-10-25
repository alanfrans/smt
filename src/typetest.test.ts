import { describe, expect, it } from "vitest";
import { describeGrade, gradeTyping, verseCores } from "./typetest.ts";

describe("type test", () => {
  it("ignores case and punctuation", () => {
    const grade = gradeTyping("For God so loved the world,", "for god so loved the world");
    expect(verseCores("world,")).toEqual(["world"]);
    expect(verseCores("don't")).toEqual(["dont"]);
    expect(grade.perfect).toBe(true);
    expect(describeGrade(grade)).toBe("Excellent!");
  });

  it("names a mismatch and a missing or extra word", () => {
    const mismatch = gradeTyping("For God so loved the world", "For God so liked the world");
    expect(mismatch.perfect).toBe(false);
    expect(describeGrade(mismatch)).toContain("(liked) does not match (loved)");

    const missing = gradeTyping("For God so loved", "For God loved");
    expect(describeGrade(missing)).toContain("There is 1 word missing.");
    expect(describeGrade(missing)).toContain("Missing (so)");

    const extra = gradeTyping("For God so loved", "For God so very loved");
    expect(describeGrade(extra)).toContain("There is 1 word too many.");
    expect(describeGrade(extra)).toContain("Extra (very)");
  });
});
