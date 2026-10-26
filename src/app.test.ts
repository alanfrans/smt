import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountApp, type AppPorts } from "./app.ts";
import { buildPuzzle } from "./search.ts";
import { sampleRecords } from "./sample.ts";
import { STORAGE_KEY } from "./storage.ts";
import { SCORES_KEY } from "./scores.ts";
import type { VerseRecord } from "./types.ts";

function setup(ports: Partial<AppPorts> = {}) {
  document.body.innerHTML = `<div id="app"></div>`;
  const root = document.querySelector<HTMLElement>("#app");
  if (!root) throw new Error("missing app root");
  const downloads: string[] = [];
  const confirms: string[] = [];
  let printed = false;
  mountApp(root, {
    load: () => ({ ok: false, reason: "empty" }),
    save: () => {},
    confirm: (message) => {
      confirms.push(message);
      return true;
    },
    download: (_filename, contents) => downloads.push(contents),
    print: () => {
      printed = true;
    },
    random: () => 0,
    ...ports,
  });
  return {
    downloads,
    confirms,
    printed: () => printed,
  };
}

function click(id: string) {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement)) throw new Error(`missing ${id}`);
  element.click();
}

function text(id: string) {
  return document.getElementById(id)?.textContent ?? "";
}

describe("Scripture Memory Tool", () => {
  beforeEach(() => localStorage.clear());

  it("shows the classic title, icon, and scroll", () => {
    setup();
    const wordmark = document.querySelector(".wordmark");
    if (!(wordmark instanceof HTMLImageElement)) throw new Error("missing wordmark");
    expect(wordmark.alt).toBe("Scripture Memory Tool");
    expect(wordmark.getAttribute("src")).toBe("/art/smt-logo.png");
    expect(document.querySelector(".crest")?.getAttribute("src")).toBe("/favicon.png");
    expect(document.querySelector(".roller-left .shaft")).toBeTruthy();
    expect(document.querySelector(".roller-right .shaft")).toBeTruthy();
    expect(document.querySelector(".scroll-curl")?.getAttribute("src")).toBe("/art/bscroll.png");
    expect(document.querySelector(".colophon-mark")?.getAttribute("src")).toBe("/art/wordmark.png");
  });

  it("opens on a starter verse and filters by category", () => {
    setup();
    expect(text("reading-ref")).toBe("John 3:16");
    expect(text("reading-verse")).toContain("only begotten Son");
    expect(document.getElementById("sample-note")?.hidden).toBe(false);

    const category = document.getElementById("category");
    if (!(category instanceof HTMLSelectElement)) throw new Error("missing category");
    category.value = "Comfort";
    category.dispatchEvent(new Event("change"));
    expect(text("reading-ref")).toBe("Psalm 23:1");
    expect(text("reading-verse")).toBe("The LORD is my shepherd; I shall not want.");
  });

  it("edits the current verse and keeps it in the reference list", () => {
    const saved: VerseRecord[][] = [];
    setup({
      save: (records) => saved.push(records.map((record) => ({ ...record }))),
    });
    click("tab-edit");
    expect(text("edit-position")).toBe("Record 1 of 12");
    const reference = document.getElementById("edit-reference");
    if (!(reference instanceof HTMLInputElement)) throw new Error("missing reference");
    reference.value = "John 3:16a";
    reference.dispatchEvent(new Event("input"));
    expect(saved.at(-1)?.[0]?.reference).toBe("John 3:16a");
    expect(document.querySelector(".ref")?.textContent).toBe("John 3:16a");
    expect(document.getElementById("sample-note")?.hidden).toBe(true);
  });

  it("returns to the verse that was open after an empty New", () => {
    setup();
    click("tab-edit");
    click("btn-next");
    expect(text("edit-position")).toBe("Record 2 of 12");
    click("btn-new");
    click("tab-study");
    click("tab-edit");
    expect(text("edit-position")).toBe("Record 2 of 12");
    const reference = document.getElementById("edit-reference");
    if (!(reference instanceof HTMLInputElement)) throw new Error("missing reference");
    expect(reference.value).toBe("John 14:6");
  });

  it("discards a new verse that was never filled in", () => {
    setup();
    click("btn-new");
    expect(text("edit-position")).toBe("Record 13 of 13");
    click("tab-study");
    click("tab-edit");
    expect(text("edit-position")).toBe("Record 1 of 12");
    expect(text("reading-ref")).toBe("John 3:16");
  });

  it("stops at the ends of the library and deletes after confirm", () => {
    const harness = setup();
    click("tab-edit");
    click("btn-prev");
    expect(text("status")).toBe("This is the first record.");
    click("btn-delete");
    expect(harness.confirms[0]).toContain("John 3:16");
    expect(text("reading-ref")).toBe("John 14:6");
    expect(text("status")).toBe("Removed John 3:16.");
  });

  it("hides words and accepts the next blank without its trailing punctuation", () => {
    setup();
    click("tab-fill");
    const count = document.getElementById("fill-count");
    if (!(count instanceof HTMLInputElement)) throw new Error("missing count");
    expect(count.value).toBe("1");
    expect(document.querySelectorAll("#fill-verse .blank")).toHaveLength(1);
    count.value = "25";
    count.dispatchEvent(new Event("input"));
    expect(document.querySelector(".blank.current")?.textContent).toBe("___");
    const entry = document.getElementById("fill-entry");
    if (!(entry instanceof HTMLInputElement)) throw new Error("missing entry");
    entry.value = "for";
    entry.dispatchEvent(new Event("input"));
    expect(document.querySelector("#fill-verse span")?.textContent).toBe("For");
    expect(text("status")).toBe("That word is back in the verse.");

    entry.value = "nope";
    entry.dispatchEvent(new Event("input"));
    entry.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(text("status")).toBe("That does not match the next blank.");
    expect(count.value).toBe("25");
  });

  it("raises the hidden-word count and starts a new round after a fill-in success", () => {
    setup({
      load: () => ({
        ok: true,
        records: [verse("Alpha beta gamma")],
      }),
    });
    click("tab-fill");
    const count = fillInput("fill-count");
    const entry = fillInput("fill-entry");
    expect(count.value).toBe("1");
    expect(blankGlyphs()).toEqual(["_____"]);

    entry.value = "nope";
    entry.dispatchEvent(new Event("input"));
    entry.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(text("status")).toBe("That does not match the next blank.");
    expect(count.value).toBe("1");
    expect(blankGlyphs()).toEqual(["_____"]);

    entry.value = "Alpha";
    entry.dispatchEvent(new Event("input"));
    expect(count.value).toBe("2");
    expect(fillInput("fill-range").value).toBe("2");
    expect(blankGlyphs()).toEqual(["_____", "____"]);
    expect(document.querySelector(".blank.current")).not.toBeNull();
    expect(entry.value).toBe("");
    expect(entry.disabled).toBe(false);
    expect(text("status")).toBe("Filled in. Now hiding 2 words.");
    expect(text("fill-verse")).toContain("gamma");

    typeBlank("Alpha");
    expect(count.value).toBe("2");
    typeBlank("beta");
    expect(count.value).toBe("3");
    expect(blankGlyphs()).toHaveLength(3);
    expect(text("status")).toBe("Filled in. Now hiding 3 words.");

    typeBlank("Alpha");
    typeBlank("beta");
    typeBlank("gamma");
    expect(count.value).toBe("3");
    expect(fillInput("fill-range").max).toBe("3");
    expect(document.querySelectorAll("#fill-verse .blank")).toHaveLength(0);
    expect(text("status")).toBe("You filled in the whole verse.");
  });

  it("does not hide more words than the verse has after the full fill-in round", () => {
    setup({
      load: () => ({
        ok: true,
        records: [verse("Alpha beta gamma")],
      }),
    });
    click("tab-fill");
    const count = fillInput("fill-count");
    const range = fillInput("fill-range");
    count.value = "3";
    count.dispatchEvent(new Event("input"));
    expect(blankGlyphs()).toEqual(["_____", "____", "_____"]);

    typeBlank("Alpha");
    typeBlank("beta");
    typeBlank("gamma");

    expect(count.value).toBe("3");
    expect(range.value).toBe("3");
    expect(range.max).toBe("3");
    expect(document.querySelectorAll("#fill-verse .blank")).toHaveLength(0);
    expect(text("fill-verse")).toBe("Alpha beta gamma");
    expect(text("status")).toBe("You filled in the whole verse.");
    expect(text("fill-prompt")).toBe("Verse complete");
    expect(text("fill-hint")).toBe("You filled in the whole verse.");
    expect(fillInput("fill-entry").disabled).toBe(true);
  });

  it("saves an .sms file and replaces the library on open", async () => {
    const harness = setup();
    click("btn-save");
    expect(harness.downloads[0]).toContain("<SMTFile>");
    expect(harness.downloads[0]).toContain("John 3:16");

    const input = document.getElementById("file-open");
    if (!(input instanceof HTMLInputElement)) throw new Error("missing file input");
    const wrong = new File(["nope"], "notes.txt", { type: "text/plain" });
    setFiles(input, wrong);
    input.dispatchEvent(new Event("change"));
    expect(text("status")).toBe("This file is not a Scripture Memory Tool file.");

    const sms = new File(
      [
        "<SMTFile>\n<Record>\n<Topic>\nWisdom\n</Topic>\n<Reference>\nMicah 6:8\n</Reference>\n<Verse>\nwhat doth the LORD require of thee\n</Verse>\n</Record>\n</SMTFile>\n",
      ],
      "micah.sms",
      { type: "text/plain" },
    );
    setFiles(input, sms);
    input.dispatchEvent(new Event("change"));
    await vi.waitFor(() => expect(text("reading-ref")).toBe("Micah 6:8"));
    expect(text("reading-verse")).toBe("what doth the LORD require of thee");
    expect(harness.confirms.some((message) => message.includes("micah.sms"))).toBe(true);
  });

  it("prints the library and leaves an empty saved library empty", () => {
    const harness = setup({ load: () => ({ ok: true, records: [] }) });
    expect(text("reading-empty")).toContain("No verses yet");
    click("btn-print");
    expect(harness.printed()).toBe(false);
    expect(text("status")).toBe("There is nothing to print yet.");
  });

  it("does not store the starter set until something changes", () => {
    document.body.innerHTML = `<div id="app"></div>`;
    const root = document.querySelector<HTMLElement>("#app");
    if (!root) throw new Error("missing app root");
    mountApp(root);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    click("tab-edit");
    const verse = document.getElementById("edit-verse");
    if (!(verse instanceof HTMLTextAreaElement)) throw new Error("missing verse");
    verse.value = `${verse.value} Amen.`;
    verse.dispatchEvent(new Event("input"));
    expect(localStorage.getItem(STORAGE_KEY)).toContain("Amen.");
  });

  it("reveals a word dragged out of the search and can print the puzzle", () => {
    const harness = setup();
    click("tab-search");
    expect(text("search-ref")).toBe("John 3:16");
    expect(text("search-verse")).toContain("_");
    expect(document.querySelectorAll(".search-cell").length).toBeGreaterThan(16);

    const verse = sampleRecords()[0]?.verse ?? "";
    const puzzle = buildPuzzle(verse, () => 0);
    const placement = puzzle.placements[0];
    if (!placement) throw new Error("puzzle has no words");
    const start = placement.cells[0];
    const end = placement.cells[placement.cells.length - 1];
    if (!start || !end) throw new Error("word has no cells");
    const startEl = document.querySelector(`[data-row="${start.row}"][data-col="${start.col}"]`);
    const endEl = document.querySelector(`[data-row="${end.row}"][data-col="${end.col}"]`);
    if (!(startEl instanceof HTMLElement) || !(endEl instanceof HTMLElement)) {
      throw new Error("missing search cells");
    }
    startEl.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    endEl.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    expect(text("status")).toContain(placement.word);
    expect(text("search-verse").toLowerCase()).toContain(placement.word.toLowerCase());

    click("btn-search-print");
    expect(harness.printed()).toBe(true);
    expect(document.getElementById("print-root")?.textContent).toContain(placement.word[0] ?? "A");
  });

  it("scores a perfect type test without writing the score into the .sms file", () => {
    let now = 5_000;
    const harness = setup({ now: () => now });
    click("tab-type");
    expect(document.getElementById("view-type")?.textContent).not.toContain("only begotten");
    expect(text("type-prompt")).toContain("stays hidden");
    const name = document.getElementById("type-name");
    const entry = document.getElementById("type-entry");
    if (!(name instanceof HTMLInputElement) || !(entry instanceof HTMLTextAreaElement)) {
      throw new Error("missing type fields");
    }
    name.value = "Alan";
    name.dispatchEvent(new Event("input"));
    const verse = sampleRecords()[0]?.verse ?? "";
    entry.value = verse.replace(/[.,]/g, "");
    entry.dispatchEvent(new Event("input"));
    now = 7_500;
    click("btn-type-check");
    expect(text("type-result")).toContain("Excellent!");
    expect(text("type-result")).toContain("kept for Alan");
    expect(text("type-best")).toContain("Alan");
    expect(localStorage.getItem(SCORES_KEY)).toContain("Alan");
    click("btn-save");
    expect(harness.downloads[0]).toContain("<SMTFile>");
    expect(harness.downloads[0]).not.toContain("Alan");
  });

  it("opens a scores file without replacing verses, and opens a .smt verse list", async () => {
    const harness = setup();
    const input = document.getElementById("file-open");
    if (!(input instanceof HTMLInputElement)) throw new Error("missing file input");
    const scores = new File(["Alan\n 77\nJohn 3:16\n"], "scores.sms", { type: "text/plain" });
    setFiles(input, scores);
    input.dispatchEvent(new Event("change"));
    await vi.waitFor(() => expect(text("status")).toBe("Opened 1 score from scores.sms."));
    expect(text("reading-ref")).toBe("John 3:16");
    expect(harness.confirms.some((message) => message.includes("scores.sms"))).toBe(false);
    click("tab-type");
    expect(text("type-best")).toContain("77");

    click("tab-study");
    const smt = new File(
      ['"Hope","Comfort","Be still and know","","Alan",41\n'],
      "hope.smt",
      { type: "text/plain" },
    );
    setFiles(input, smt);
    input.dispatchEvent(new Event("change"));
    await vi.waitFor(() => expect(text("reading-ref")).toBe("Hope"));
    expect(text("reading-verse")).toBe("Be still and know");
    expect(text("status")).toContain("1 time came with them");
  });

  it("picks another verse for a random type test", () => {
    setup();
    click("tab-type");
    click("btn-type-random");
    expect(text("type-ref")).toBe("John 14:6");
    const entry = document.getElementById("type-entry");
    if (!(entry instanceof HTMLTextAreaElement)) throw new Error("missing type entry");
    expect(entry.value).toBe("");
  });
});

function verse(text: string): VerseRecord {
  return { id: "short", topic: "Test", reference: "Test 1:1", verse: text };
}

function fillInput(id: string): HTMLInputElement {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLInputElement)) throw new Error(`missing ${id}`);
  return element;
}

function blankGlyphs(): string[] {
  return [...document.querySelectorAll("#fill-verse .blank")].map((node) => node.textContent ?? "");
}

function typeBlank(word: string) {
  const entry = fillInput("fill-entry");
  entry.value = word;
  entry.dispatchEvent(new Event("input"));
}

function setFiles(input: HTMLInputElement, file: File) {
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
}
