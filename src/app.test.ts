import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountApp, type AppPorts } from "./app.ts";
import { STORAGE_KEY } from "./storage.ts";
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
    expect(text("fill-hint")).toContain("Raise Words hidden");
    const count = document.getElementById("fill-count");
    if (!(count instanceof HTMLInputElement)) throw new Error("missing count");
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
});

function setFiles(input: HTMLInputElement, file: File) {
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
}
