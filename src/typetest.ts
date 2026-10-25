/**
 * Type test grading, from frmMainPage.Check.
 *
 * The desktop checker stripped punctuation (DelSymbols, the default),
 * compared words without caring about case, and on a perfect paper said
 * "Excellent!". Its stack walk was easy to desync, so this is a word
 * alignment that still reports a size difference and a mismatch as
 * "(typed) does not match (expected)".
 */

export type GradeIssue =
  | { kind: "mismatch"; typed: string; expected: string }
  | { kind: "missing"; expected: string }
  | { kind: "extra"; typed: string };

export type Grade = {
  perfect: boolean;
  expectedCount: number;
  typedCount: number;
  issues: GradeIssue[];
};

/** Letters and digits only, matching DelSymbols. Empty tokens drop out. */
export function verseCores(text: string): string[] {
  const cores: string[] = [];
  for (const token of text.trim().split(/\s+/)) {
    const core = token.replace(/[^A-Za-z0-9]/g, "");
    if (core) cores.push(core);
  }
  return cores;
}

function align(expected: readonly string[], typed: readonly string[]): GradeIssue[] {
  const n = expected.length;
  const m = typed.length;
  const cost: number[][] = Array.from({ length: n + 1 }, () => Array.from({ length: m + 1 }, () => 0));
  for (let i = 0; i <= n; i++) cost[i]![0] = i;
  for (let j = 0; j <= m; j++) cost[0]![j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const same = expected[i - 1]?.toUpperCase() === typed[j - 1]?.toUpperCase();
      const sub = (cost[i - 1]?.[j - 1] ?? 0) + (same ? 0 : 1);
      const del = (cost[i - 1]?.[j] ?? 0) + 1;
      const ins = (cost[i]?.[j - 1] ?? 0) + 1;
      cost[i]![j] = Math.min(sub, del, ins);
    }
  }

  const reversed: GradeIssue[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const expectedWord = expected[i - 1] ?? "";
    const typedWord = typed[j - 1] ?? "";
    if (i > 0 && j > 0) {
      const same = expectedWord.toUpperCase() === typedWord.toUpperCase();
      const sub = (cost[i - 1]?.[j - 1] ?? 0) + (same ? 0 : 1);
      if ((cost[i]?.[j] ?? 0) === sub) {
        if (!same) reversed.push({ kind: "mismatch", typed: typedWord, expected: expectedWord });
        i -= 1;
        j -= 1;
        continue;
      }
    }
    if (i > 0 && (cost[i]?.[j] ?? 0) === (cost[i - 1]?.[j] ?? 0) + 1) {
      reversed.push({ kind: "missing", expected: expectedWord });
      i -= 1;
      continue;
    }
    reversed.push({ kind: "extra", typed: typedWord });
    j -= 1;
  }
  return reversed.reverse();
}

export function gradeTyping(expectedVerse: string, typedVerse: string): Grade {
  const expected = verseCores(expectedVerse);
  const typed = verseCores(typedVerse);
  const issues = align(expected, typed);
  return {
    perfect: issues.length === 0 && expected.length === typed.length,
    expectedCount: expected.length,
    typedCount: typed.length,
    issues,
  };
}

function countLine(difference: number): string | null {
  if (difference > 0) {
    return difference === 1 ? "There is 1 word missing." : `There are ${difference} words missing.`;
  }
  if (difference < 0) {
    const extra = -difference;
    return extra === 1 ? "There is 1 word too many." : `There are ${extra} words too many.`;
  }
  return null;
}

/** A short report. The desktop spelled the extra-word line "to many". */
export function describeGrade(grade: Grade): string {
  if (grade.perfect) return "Excellent!";
  const lines: string[] = [];
  const summary = countLine(grade.expectedCount - grade.typedCount);
  if (summary) lines.push(summary);
  const details = grade.issues.slice(0, 8);
  for (const issue of details) {
    if (issue.kind === "mismatch") {
      lines.push(`(${issue.typed}) does not match (${issue.expected})`);
    } else if (issue.kind === "missing") {
      lines.push(`Missing (${issue.expected})`);
    } else {
      lines.push(`Extra (${issue.typed})`);
    }
  }
  if (grade.issues.length > details.length) {
    lines.push(`And ${grade.issues.length - details.length} more.`);
  }
  return lines.join("\n");
}
