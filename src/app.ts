import { newId } from "./id.ts";
import { categoryName, groupCategories, isBlank } from "./library.ts";
import { sampleRecords } from "./sample.ts";
import { parseSms, serializeSms } from "./sms.ts";
import { loadLibrary, saveLibrary, type LoadResult } from "./storage.ts";
import type { VerseRecord, ViewName } from "./types.ts";
import { appMarkup } from "./view.ts";
import {
  blankGlyph,
  clampCount,
  firstHiddenIndex,
  hideWords,
  splitWords,
  wordMatches,
} from "./words.ts";

export type AppPorts = {
  load: () => LoadResult;
  save: (records: VerseRecord[]) => void;
  confirm: (message: string) => boolean;
  download: (filename: string, contents: string) => void;
  print: () => void;
  random: () => number;
};

function defaultPorts(): AppPorts {
  return {
    load: loadLibrary,
    save: saveLibrary,
    confirm: (message) => window.confirm(message),
    download: downloadFile,
    print: () => window.print(),
    random: Math.random,
  };
}

function downloadFile(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function must<T extends HTMLElement>(root: ParentNode, id: string): T {
  const element = root.querySelector<T>(`#${id}`);
  if (!element) throw new Error(`Missing #${id}`);
  return element;
}

export function mountApp(root: HTMLElement, ports: Partial<AppPorts> = {}): void {
  const io: AppPorts = { ...defaultPorts(), ...ports };
  root.innerHTML = appMarkup;

  const tabStudy = must<HTMLButtonElement>(root, "tab-study");
  const tabEdit = must<HTMLButtonElement>(root, "tab-edit");
  const tabFill = must<HTMLButtonElement>(root, "tab-fill");
  const viewStudy = must<HTMLElement>(root, "view-study");
  const viewEdit = must<HTMLElement>(root, "view-edit");
  const viewFill = must<HTMLElement>(root, "view-fill");
  const statusEl = must<HTMLElement>(root, "status");
  const categorySelect = must<HTMLSelectElement>(root, "category");
  const refList = must<HTMLElement>(root, "ref-list");
  const readingRef = must<HTMLElement>(root, "reading-ref");
  const readingVerse = must<HTMLElement>(root, "reading-verse");
  const readingEmpty = must<HTMLElement>(root, "reading-empty");
  const sampleNote = must<HTMLElement>(root, "sample-note");
  const editForm = must<HTMLFormElement>(root, "edit-form");
  const editTopic = must<HTMLInputElement>(root, "edit-topic");
  const editReference = must<HTMLInputElement>(root, "edit-reference");
  const editVerse = must<HTMLTextAreaElement>(root, "edit-verse");
  const topicList = must<HTMLDataListElement>(root, "topic-list");
  const editPosition = must<HTMLElement>(root, "edit-position");
  const btnAdd = must<HTMLButtonElement>(root, "btn-add");
  const btnDelete = must<HTMLButtonElement>(root, "btn-delete");
  const btnPrev = must<HTMLButtonElement>(root, "btn-prev");
  const btnNext = must<HTMLButtonElement>(root, "btn-next");
  const fillTopic = must<HTMLElement>(root, "fill-topic");
  const fillReference = must<HTMLElement>(root, "fill-reference");
  const fillRange = must<HTMLInputElement>(root, "fill-range");
  const fillCount = must<HTMLInputElement>(root, "fill-count");
  const fillTotal = must<HTMLElement>(root, "fill-total");
  const fillVerse = must<HTMLElement>(root, "fill-verse");
  const fillPrompt = must<HTMLElement>(root, "fill-prompt");
  const fillEntry = must<HTMLInputElement>(root, "fill-entry");
  const fillHint = must<HTMLElement>(root, "fill-hint");
  const printRoot = must<HTMLElement>(root, "print-root");
  const fileInput = must<HTMLInputElement>(root, "file-open");

  const loaded = io.load();
  let records: VerseRecord[] = [];
  let usingSample = false;
  let statusMessage = "";
  let statusKind: "info" | "error" = "info";

  if (loaded.ok) {
    records = loaded.records;
  } else if (loaded.reason === "corrupt") {
    statusMessage = "The verses saved in this browser could not be read. Open an .sms file to bring them back.";
    statusKind = "error";
  } else {
    records = sampleRecords();
    usingSample = true;
  }

  let view: ViewName = "study";
  let category = "";
  let selectedId: string | null = records.find((record) => !isBlank(record))?.id ?? null;
  const unsaved = new Set<string>();
  let hiddenCount = 0;
  let hidden: boolean[] = [];
  let typed = "";
  let drillId: string | null = null;
  let drillText = "";
  let focusTopic = false;
  let focusFill = false;
  let returnId: string | null = null;

  const selected = () => records.find((record) => record.id === selectedId) ?? null;

  const currentWords = () => splitWords(selected()?.verse ?? "");

  function show(message: string, kind: "info" | "error" = "info") {
    statusMessage = message;
    statusKind = kind;
    render();
  }

  function persist(): boolean {
    try {
      io.save(records.filter((record) => !(unsaved.has(record.id) && isBlank(record))));
      usingSample = false;
      return true;
    } catch {
      show("This browser could not store the verses.", "error");
      return false;
    }
  }

  function syncCategory() {
    const groups = groupCategories(records);
    if (!groups.length) {
      category = "";
      return;
    }
    const record = selected();
    if (record && !isBlank(record)) {
      const name = categoryName(record.topic);
      const group = groups.find((item) => item.name.toLowerCase() === name.toLowerCase());
      if (group) {
        category = group.name;
        return;
      }
    }
    if (!groups.some((item) => item.name === category)) category = groups[0]?.name ?? "";
    const visible = groups.find((item) => item.name === category)?.verses ?? [];
    if (!visible.some((item) => item.id === selectedId) && !(record && isBlank(record))) {
      selectedId = visible[0]?.id ?? null;
    }
  }

  function discardUnsavedBlank() {
    const record = selected();
    if (!record || !unsaved.has(record.id) || !isBlank(record)) return;
    unsaved.delete(record.id);
    records = records.filter((item) => item.id !== record.id);
    if (returnId && records.some((item) => item.id === returnId)) {
      selectedId = returnId;
    } else {
      const groups = groupCategories(records);
      const same = groups.find((item) => item.name === category);
      selectedId = same?.verses[0]?.id ?? groups[0]?.verses[0]?.id ?? null;
    }
    returnId = null;
  }

  function showView(next: ViewName) {
    if (view === "edit" && next !== "edit") discardUnsavedBlank();
    if (next === "fill" && view !== "fill") {
      hiddenCount = 0;
      drillId = null;
      typed = "";
    }
    view = next;
    if (next === "fill") focusFill = true;
    statusMessage = "";
    render();
  }

  function addRecord() {
    const current = selected();
    if (current && unsaved.has(current.id) && isBlank(current)) {
      view = "edit";
      focusTopic = true;
      render();
      return;
    }
    returnId = current && !isBlank(current) ? current.id : returnId;
    const record: VerseRecord = { id: newId(), topic: "", reference: "", verse: "" };
    records.push(record);
    unsaved.add(record.id);
    selectedId = record.id;
    view = "edit";
    focusTopic = true;
    statusMessage = "";
    render();
  }

  function step(delta: number) {
    if (!records.length || !selected()) {
      show("There is no record to edit.");
      return;
    }
    const index = records.findIndex((record) => record.id === selectedId);
    const next = index + delta;
    if (next < 0) {
      show("This is the first record.");
      return;
    }
    if (next >= records.length) {
      show("This is the last record.");
      return;
    }
    selectedId = records[next]?.id ?? null;
    drillId = null;
    statusMessage = "";
    render();
  }

  function deleteSelected() {
    const index = records.findIndex((record) => record.id === selectedId);
    if (index < 0) {
      show("There is no record to remove.");
      return;
    }
    const record = records[index];
    if (!record) return;
    const label = record.reference.trim() || "this verse";
    if (!io.confirm(`Remove ${label}?`)) return;
    const unsavedBlank = unsaved.has(record.id) && isBlank(record);
    unsaved.delete(record.id);
    records.splice(index, 1);
    selectedId = records[index]?.id ?? records[index - 1]?.id ?? null;
    drillId = null;
    if (!(usingSample && unsavedBlank)) {
      if (!persist()) return;
    }
    show(`Removed ${label}.`);
  }

  function saveFile() {
    if (!records.some((record) => !isBlank(record))) {
      show("There is nothing to save yet.");
      return;
    }
    io.download("scripture.sms", serializeSms(records));
    show("Saved scripture.sms. The desktop app can open that file.");
  }

  function buildPrint() {
    printRoot.replaceChildren();
    const title = document.createElement("h1");
    title.textContent = "Scripture Memory Tool";
    printRoot.append(title);
    for (const group of groupCategories(records)) {
      const heading = document.createElement("h2");
      heading.textContent = group.name;
      printRoot.append(heading);
      for (const record of group.verses) {
        const block = document.createElement("article");
        const reference = document.createElement("h3");
        reference.textContent = record.reference.trim() || "(No reference)";
        const body = document.createElement("p");
        body.textContent = record.verse.trim();
        block.append(reference, body);
        printRoot.append(block);
      }
    }
  }

  function printLibrary() {
    if (!groupCategories(records).length) {
      show("There is nothing to print yet.");
      return;
    }
    buildPrint();
    io.print();
  }

  async function openFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".sms")) {
      show("This file is not a Scripture Memory Tool file.", "error");
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      show("That file could not be read.", "error");
      return;
    }
    const parsed = parseSms(text);
    if (!parsed.length) {
      show("That file did not contain any verses.", "error");
      return;
    }
    if (records.some((record) => !isBlank(record))) {
      if (!io.confirm(`Replace the verses in this browser with ${file.name}?`)) return;
    }
    records = parsed;
    unsaved.clear();
    selectedId = parsed[0]?.id ?? null;
    category = "";
    view = "study";
    drillId = null;
    if (!persist()) return;
    const count = parsed.length;
    show(`Opened ${count} ${count === 1 ? "verse" : "verses"} from ${file.name}.`);
  }

  function assignValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
    if (document.activeElement === element) return;
    if (element.value !== value) element.value = value;
  }

  function ensureDrill() {
    const record = selected();
    const text = record?.verse ?? "";
    const id = record?.id ?? null;
    const words = splitWords(text);
    if (drillId !== id || drillText !== text || hidden.length !== words.length) {
      hiddenCount = clampCount(hiddenCount, words.length);
      hidden = hideWords(words, hiddenCount, io.random);
      typed = "";
      drillId = id;
      drillText = text;
    }
  }

  function applyHiddenCount(next: number) {
    const record = selected();
    const text = record?.verse ?? "";
    const words = splitWords(text);
    const count = clampCount(next, words.length);
    const same =
      count === hiddenCount &&
      hidden.length === words.length &&
      drillId === (record?.id ?? null) &&
      drillText === text;
    if (!same) {
      hiddenCount = count;
      hidden = hideWords(words, count, io.random);
      typed = "";
      drillId = record?.id ?? null;
      drillText = text;
    }
    render();
  }

  function tryAccept(commit: boolean) {
    const words = currentWords();
    const index = firstHiddenIndex(hidden);
    if (index < 0) return;
    const expected = words[index] ?? "";
    if (wordMatches(typed, expected)) {
      hidden[index] = false;
      typed = "";
      const remaining = firstHiddenIndex(hidden) >= 0;
      statusMessage = remaining
        ? "That word is back in the verse."
        : "Every hidden word is filled in.";
      statusKind = "info";
      render();
      const currentBlank = fillVerse.querySelector(".current");
      if (currentBlank instanceof HTMLElement) currentBlank.scrollIntoView({ block: "nearest", inline: "nearest" });
      return;
    }
    if (commit && typed.trim()) {
      show("That does not match the next blank.");
    }
  }

  function renderTabs() {
    const tabs: [HTMLButtonElement, ViewName, HTMLElement][] = [
      [tabStudy, "study", viewStudy],
      [tabEdit, "edit", viewEdit],
      [tabFill, "fill", viewFill],
    ];
    for (const [tab, name, panel] of tabs) {
      const active = view === name;
      tab.setAttribute("aria-selected", active ? "true" : "false");
      panel.hidden = !active;
    }
  }

  function renderStatus() {
    statusEl.hidden = statusMessage === "";
    statusEl.textContent = statusMessage;
    statusEl.classList.toggle("error", statusKind === "error");
  }

  function renderStudy() {
    const groups = groupCategories(records);
    const signature = groups.map((group) => group.name).join("\n");
    if (categorySelect.dataset.signature !== signature) {
      categorySelect.replaceChildren();
      for (const group of groups) {
        const option = document.createElement("option");
        option.value = group.name;
        option.textContent = group.name;
        categorySelect.append(option);
      }
      if (!groups.length) {
        const option = document.createElement("option");
        option.textContent = "No categories";
        option.value = "";
        categorySelect.append(option);
      }
      categorySelect.dataset.signature = signature;
    }
    categorySelect.disabled = groups.length === 0;
    if (categorySelect.value !== category) categorySelect.value = category;

    const verses = groups.find((group) => group.name === category)?.verses ?? [];
    refList.replaceChildren();
    for (const record of verses) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ref";
      button.setAttribute("role", "option");
      const active = record.id === selectedId;
      button.setAttribute("aria-selected", active ? "true" : "false");
      button.textContent = record.reference.trim() || "(No reference)";
      button.addEventListener("click", () => {
        selectedId = record.id;
        drillId = null;
        statusMessage = "";
        render();
      });
      refList.append(button);
    }
    if (!verses.length) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.textContent = groups.length ? "No verses in this category." : "No verses yet.";
      refList.append(empty);
    }

    const record = selected();
    if (!record || isBlank(record)) {
      readingRef.hidden = true;
      readingRef.textContent = "";
      readingVerse.hidden = true;
      readingVerse.textContent = "";
      readingEmpty.hidden = false;
      readingEmpty.textContent = groups.length
        ? "This verse is empty. Use Edit to write it."
        : "No verses yet. Use New, or Open an .sms file from the desktop app.";
    } else if (!record.verse.trim()) {
      readingRef.hidden = false;
      readingRef.textContent = record.reference.trim() || "(No reference)";
      readingVerse.hidden = true;
      readingVerse.textContent = "";
      readingEmpty.hidden = false;
      readingEmpty.textContent = "No verse text yet.";
    } else {
      readingRef.hidden = false;
      readingRef.textContent = record.reference.trim() || "(No reference)";
      readingVerse.hidden = false;
      readingVerse.textContent = record.verse;
      readingEmpty.hidden = true;
      readingEmpty.textContent = "";
    }
    sampleNote.hidden = !usingSample;

    topicList.replaceChildren();
    for (const group of groups) {
      if (group.name === "(No category)") continue;
      const option = document.createElement("option");
      option.value = group.name;
      topicList.append(option);
    }
  }

  function renderEdit() {
    const record = selected();
    const index = records.findIndex((item) => item.id === selectedId);
    const fields: [HTMLInputElement | HTMLTextAreaElement, string][] = [
      [editTopic, record?.topic ?? ""],
      [editReference, record?.reference ?? ""],
      [editVerse, record?.verse ?? ""],
    ];
    for (const [element, value] of fields) {
      element.disabled = !record;
      assignValue(element, value);
    }
    btnDelete.disabled = !record;
    btnPrev.disabled = records.length === 0;
    btnNext.disabled = records.length === 0;
    editPosition.textContent = record
      ? `Record ${index + 1} of ${records.length}`
      : "No records yet. Add one to start.";
  }

  function renderFill() {
    ensureDrill();
    const record = selected();
    const words = splitWords(record?.verse ?? "");
    if (record && !isBlank(record)) {
      fillTopic.textContent = categoryName(record.topic);
      fillReference.textContent = record.reference.trim() || "(No reference)";
    } else {
      fillTopic.textContent = "—";
      fillReference.textContent = "—";
    }
    const max = String(words.length);
    const nextRange = String(clampCount(hiddenCount, words.length));
    if (fillRange.max !== max) fillRange.max = max;
    if (fillRange.value !== nextRange) fillRange.value = nextRange;
    fillRange.disabled = words.length === 0;
    if (fillCount.max !== max) fillCount.max = max;
    fillCount.disabled = words.length === 0;
    syncCountField();
    fillTotal.textContent =
      words.length === 0 ? "" : words.length === 1 ? "of 1 word" : `of ${words.length} words`;

    fillVerse.classList.toggle("mono", hiddenCount > 0);
    fillVerse.replaceChildren();
    if (!words.length) {
      const hasVerse = records.some((item) => !isBlank(item));
      fillVerse.textContent =
        record && !isBlank(record)
          ? "This verse has no words to hide."
          : hasVerse
            ? "Choose a verse on the Study tab."
            : "Add a verse before practicing.";
    } else {
      const current = firstHiddenIndex(hidden);
      words.forEach((word, index) => {
        if (index > 0) fillVerse.append(" ");
        const span = document.createElement("span");
        if (hidden[index]) {
          span.className = index === current ? "blank current" : "blank";
          span.textContent = blankGlyph(word);
        } else {
          span.textContent = word;
        }
        fillVerse.append(span);
      });
    }

    const current = firstHiddenIndex(hidden);
    const remaining = current >= 0;
    fillEntry.disabled = !remaining;
    if (fillEntry.value !== typed) fillEntry.value = typed;
    if (hiddenCount === 0) {
      fillPrompt.textContent = "Type the next blank";
      fillHint.textContent = words.length
        ? "Raise Words hidden, then type the highlighted blank."
        : "";
    } else if (!remaining) {
      fillPrompt.textContent = "Verse complete";
      fillHint.textContent = "Every hidden word is filled in. Raise the slider to hide more.";
    } else {
      fillPrompt.textContent = "Type the next blank";
      fillHint.textContent = "The highlighted blank is next. Punctuation at the end of a word is optional.";
    }
  }

  function syncCountField() {
    const next = String(hiddenCount);
    if (document.activeElement === fillCount) {
      if (fillCount.value.trim() === "") return;
      const typedCount = Number(fillCount.value);
      if (Number.isFinite(typedCount) && Math.trunc(typedCount) === hiddenCount) return;
    }
    if (fillCount.value !== next) fillCount.value = next;
  }

  function render() {
    syncCategory();
    renderTabs();
    renderStatus();
    renderStudy();
    renderEdit();
    renderFill();
    if (focusTopic) {
      focusTopic = false;
      editTopic.focus();
    }
    if (focusFill) {
      focusFill = false;
      if (!fillEntry.disabled) fillEntry.focus();
    }
  }

  tabStudy.addEventListener("click", () => showView("study"));
  tabEdit.addEventListener("click", () => showView("edit"));
  tabFill.addEventListener("click", () => showView("fill"));
  must<HTMLButtonElement>(root, "btn-new").addEventListener("click", addRecord);
  btnAdd.addEventListener("click", addRecord);
  btnDelete.addEventListener("click", deleteSelected);
  btnPrev.addEventListener("click", () => step(-1));
  btnNext.addEventListener("click", () => step(1));
  must<HTMLButtonElement>(root, "btn-edit-close").addEventListener("click", () => showView("study"));
  must<HTMLButtonElement>(root, "btn-save").addEventListener("click", saveFile);
  must<HTMLButtonElement>(root, "btn-edit-save").addEventListener("click", saveFile);
  must<HTMLButtonElement>(root, "btn-print").addEventListener("click", printLibrary);
  must<HTMLButtonElement>(root, "btn-open").addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (file) void openFile(file);
  });

  editForm.addEventListener("submit", (event) => event.preventDefault());

  const onEdit = () => {
    const record = selected();
    if (!record) return;
    record.topic = editTopic.value;
    record.reference = editReference.value;
    record.verse = editVerse.value;
    if (isBlank(record) && unsaved.has(record.id)) {
      render();
      return;
    }
    unsaved.delete(record.id);
    persist();
    render();
  };
  editTopic.addEventListener("input", onEdit);
  editReference.addEventListener("input", onEdit);
  editVerse.addEventListener("input", onEdit);

  categorySelect.addEventListener("change", () => {
    category = categorySelect.value;
    const verses = groupCategories(records).find((group) => group.name === category)?.verses;
    selectedId = verses?.[0]?.id ?? null;
    drillId = null;
    statusMessage = "";
    render();
  });

  fillRange.addEventListener("input", () => applyHiddenCount(Number(fillRange.value)));
  fillCount.addEventListener("input", () => {
    if (fillCount.value.trim() === "") return;
    applyHiddenCount(Number(fillCount.value));
  });
  fillCount.addEventListener("blur", () => {
    fillCount.value = String(hiddenCount);
  });
  fillEntry.addEventListener("input", () => {
    typed = fillEntry.value;
    tryAccept(false);
  });
  fillEntry.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    tryAccept(true);
  });

  window.addEventListener("beforeprint", buildPrint);
  render();
}
