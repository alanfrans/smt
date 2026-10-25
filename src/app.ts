import { newId } from "./id.ts";
import { categoryName, groupCategories, isBlank } from "./library.ts";
import { sampleRecords } from "./sample.ts";
import {
  bestScores,
  considerScore,
  formatClock,
  formatScoreNumber,
  formatTenths,
  formatTimeReport,
  loadScores,
  parseScoresSms,
  saveScores,
  scoreTenths,
  type ScoreEntry,
  type ScoreState,
} from "./scores.ts";
import {
  buildPuzzle,
  cellsOnLine,
  lettersOnLine,
  matchWord,
  puzzleWords,
  wordKey,
  type CellPos,
  type Puzzle,
} from "./search.ts";
import { parseSms, serializeSms } from "./sms.ts";
import { parseSmt } from "./smt.ts";
import { loadLibrary, saveLibrary, type LoadResult } from "./storage.ts";
import { describeGrade, gradeTyping, verseCores } from "./typetest.ts";
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
  now: () => number;
  loadScores: () => ScoreState;
  saveScores: (state: ScoreState) => void;
};

function defaultPorts(): AppPorts {
  return {
    load: loadLibrary,
    save: saveLibrary,
    confirm: (message) => window.confirm(message),
    download: downloadFile,
    print: () => window.print(),
    random: Math.random,
    now: () => Date.now(),
    loadScores,
    saveScores,
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
  const tabSearch = must<HTMLButtonElement>(root, "tab-search");
  const tabType = must<HTMLButtonElement>(root, "tab-type");
  const viewStudy = must<HTMLElement>(root, "view-study");
  const viewEdit = must<HTMLElement>(root, "view-edit");
  const viewFill = must<HTMLElement>(root, "view-fill");
  const viewSearch = must<HTMLElement>(root, "view-search");
  const viewType = must<HTMLElement>(root, "view-type");
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
  const searchTopic = must<HTMLElement>(root, "search-topic");
  const searchRef = must<HTMLElement>(root, "search-ref");
  const searchClock = must<HTMLElement>(root, "search-clock");
  const searchVerse = must<HTMLElement>(root, "search-verse");
  const searchHint = must<HTMLElement>(root, "search-hint");
  const searchBoard = must<HTMLElement>(root, "search-board");
  const typeTopic = must<HTMLElement>(root, "type-topic");
  const typeRef = must<HTMLElement>(root, "type-ref");
  const typeClock = must<HTMLElement>(root, "type-clock");
  const typePrompt = must<HTMLElement>(root, "type-prompt");
  const typeEntry = must<HTMLTextAreaElement>(root, "type-entry");
  const typeName = must<HTMLInputElement>(root, "type-name");
  const typeResult = must<HTMLElement>(root, "type-result");
  const typeBest = must<HTMLElement>(root, "type-best");
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
  let focusType = false;
  let returnId: string | null = null;
  let scoreState: ScoreState = io.loadScores();
  let searchKey = "";
  let searchPuzzle: Puzzle | null = null;
  let searchFound = new Set<string>();
  let searchStarted: number | null = null;
  let searchFinished: number | null = null;
  let searchAnchor: CellPos | null = null;
  let typeKey = "";
  let typeDraft = "";
  let typeStarted: number | null = null;
  let typeFinished: number | null = null;
  let typeReport = "";
  let printMode: "library" | "puzzle" = "library";
  let clockId = 0;

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

  function persistScores(): boolean {
    try {
      io.saveScores(scoreState);
      return true;
    } catch {
      show("This browser could not store the scores.", "error");
      return false;
    }
  }

  function absorbScores(incoming: readonly ScoreEntry[]) {
    let entries = scoreState.entries;
    for (const entry of incoming) {
      entries = considerScore(entries, entry).entries;
    }
    scoreState = { ...scoreState, entries };
    persistScores();
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
    if (next === "type") focusType = true;
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
    printMode = "library";
    buildPrint();
    io.print();
  }

  function resetPractice() {
    drillId = null;
    searchKey = "";
    searchPuzzle = null;
    typeKey = "";
  }

  async function openFile(file: File) {
    const lower = file.name.toLowerCase();
    const isSms = lower.endsWith(".sms");
    const isSmt = lower.endsWith(".smt");
    if (!isSms && !isSmt) {
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
    if (isSmt) {
      const imported = parseSmt(text);
      if (!imported.records.length) {
        show("That file did not contain any verses.", "error");
        return;
      }
      if (records.some((record) => !isBlank(record))) {
        if (!io.confirm(`Replace the verses in this browser with ${file.name}?`)) return;
      }
      records = imported.records;
      if (imported.scores.length) absorbScores(imported.scores);
      unsaved.clear();
      selectedId = imported.records[0]?.id ?? null;
      category = "";
      view = "study";
      resetPractice();
      if (!persist()) return;
      const count = imported.records.length;
      const scoreNote = imported.scores.length
        ? ` ${imported.scores.length} ${imported.scores.length === 1 ? "time" : "times"} came with them.`
        : "";
      show(`Opened ${count} ${count === 1 ? "verse" : "verses"} from ${file.name}.${scoreNote}`);
      return;
    }
    const parsed = parseSms(text);
    if (!parsed.length) {
      const importedScores = parseScoresSms(text);
      if (importedScores.length) {
        absorbScores(importedScores);
        show(
          `Opened ${importedScores.length} ${importedScores.length === 1 ? "score" : "scores"} from ${file.name}.`,
        );
        return;
      }
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
    resetPractice();
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
      [tabSearch, "search", viewSearch],
      [tabType, "type", viewType],
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

  function searchClockText(): string {
    if (searchStarted === null) return "—";
    const end = searchFinished ?? io.now();
    return formatClock(end - searchStarted);
  }

  function typeClockText(): string {
    if (typeStarted === null) return "—";
    const end = typeFinished ?? io.now();
    return formatClock(end - typeStarted);
  }

  function paintClocks() {
    searchClock.textContent = searchClockText();
    typeClock.textContent = typeClockText();
  }

  function syncClock() {
    window.clearInterval(clockId);
    const running =
      (view === "search" && searchStarted !== null && searchFinished === null) ||
      (view === "type" && typeStarted !== null && typeFinished === null);
    if (!running) return;
    clockId = window.setInterval(() => {
      if (!root.isConnected) {
        window.clearInterval(clockId);
        return;
      }
      paintClocks();
    }, 500);
  }

  function ensureSearch() {
    const record = selected();
    const text = record?.verse ?? "";
    const key = `${record?.id ?? ""}\u0000${text}`;
    if (key === searchKey && searchPuzzle) return;
    searchKey = key;
    searchFound = new Set();
    searchFinished = null;
    searchAnchor = null;
    const words = record && !isBlank(record) ? puzzleWords(text) : [];
    if (!words.length) {
      searchPuzzle = { size: 0, grid: [], words: [], placements: [] };
      searchStarted = null;
      return;
    }
    searchPuzzle = buildPuzzle(text, io.random);
    searchStarted = io.now();
  }

  function renderSearchVerse(verse: string) {
    const words = splitWords(verse);
    searchVerse.replaceChildren();
    if (!words.length) {
      searchVerse.textContent = "This verse has no words to hide.";
      return;
    }
    const hidden = new Set(searchPuzzle?.words ?? []);
    words.forEach((word, index) => {
      if (index > 0) searchVerse.append(" ");
      const key = wordKey(word);
      const span = document.createElement("span");
      if (key && hidden.has(key) && !searchFound.has(key)) {
        span.className = "blank";
        span.textContent = blankGlyph(word);
      } else {
        span.textContent = word;
      }
      searchVerse.append(span);
    });
  }

  function renderBoard() {
    const puzzle = searchPuzzle;
    if (!puzzle || puzzle.size === 0) {
      searchBoard.replaceChildren();
      searchBoard.dataset.signature = "";
      return;
    }
    const signature = `${puzzle.size}:${[...searchFound].sort().join(",")}:${puzzle.grid.map((row) => row.join("")).join("/")}`;
    if (searchBoard.dataset.signature === signature) return;
    searchBoard.dataset.signature = signature;
    searchBoard.replaceChildren();
    const grid = document.createElement("div");
    grid.className = "search-grid";
    grid.setAttribute("role", "grid");
    grid.style.setProperty("--size", String(puzzle.size));
    const foundCells = new Set<string>();
    for (const placement of puzzle.placements) {
      if (!searchFound.has(placement.word)) continue;
      for (const cell of placement.cells) foundCells.add(`${cell.row},${cell.col}`);
    }
    puzzle.grid.forEach((row, r) => {
      row.forEach((letter, c) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = foundCells.has(`${r},${c}`) ? "search-cell found" : "search-cell";
        button.dataset.row = String(r);
        button.dataset.col = String(c);
        button.textContent = letter;
        button.setAttribute("role", "gridcell");
        button.setAttribute("aria-label", letter);
        grid.append(button);
      });
    });
    searchBoard.append(grid);
  }

  function renderSearch() {
    if (view !== "search") return;
    ensureSearch();
    const record = selected();
    const meaningful = Boolean(record && !isBlank(record));
    searchTopic.textContent = meaningful && record ? categoryName(record.topic) : "—";
    searchRef.textContent = meaningful && record ? record.reference.trim() || "(No reference)" : "—";
    searchClock.textContent = searchClockText();
    if (!meaningful || !record) {
      searchVerse.textContent = records.some((item) => !isBlank(item))
        ? "Choose a verse on the Study tab."
        : "Add a verse before practicing.";
      searchHint.textContent = "";
      searchBoard.replaceChildren();
      searchBoard.dataset.signature = "";
      return;
    }
    renderSearchVerse(record.verse);
    const words = searchPuzzle?.words ?? [];
    const left = words.filter((word) => !searchFound.has(word)).length;
    if (!words.length) {
      searchHint.textContent = "This verse has no words long enough for a search.";
    } else if (left === 0) {
      searchHint.textContent = "Every word has been found.";
    } else if (left === 1) {
      searchHint.textContent = "Drag through the last word in a straight line, across, down, or diagonal.";
    } else {
      searchHint.textContent = `Drag through a word in a straight line, across, down, or diagonal. ${left} still hidden.`;
    }
    renderBoard();
  }

  function newPuzzle() {
    const record = selected();
    if (!record || puzzleWords(record.verse).length === 0) {
      show("This verse has no words long enough for a search.");
      return;
    }
    searchKey = "";
    searchPuzzle = null;
    ensureSearch();
    statusMessage = "New puzzle.";
    statusKind = "info";
    render();
  }

  function buildPuzzlePrint() {
    printRoot.replaceChildren();
    const record = selected();
    const title = document.createElement("h1");
    title.textContent = record?.reference.trim() || "Word search";
    printRoot.append(title);
    const verse = document.createElement("p");
    verse.textContent = searchVerse.textContent;
    const grid = document.createElement("pre");
    grid.className = "print-grid";
    grid.textContent = (searchPuzzle?.grid ?? []).map((row) => row.join(" ")).join("\n");
    printRoot.append(verse, grid);
  }

  function printPuzzle() {
    if (view !== "search") ensureSearch();
    if (!searchPuzzle || searchPuzzle.words.length === 0) {
      show("Open Search on a verse before printing a puzzle.");
      return;
    }
    printMode = "puzzle";
    buildPuzzlePrint();
    io.print();
    printMode = "library";
  }

  function cellFrom(target: EventTarget | null): CellPos | null {
    if (!(target instanceof Element)) return null;
    const cell = target.closest<HTMLElement>("[data-row]");
    if (!cell) return null;
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
    return { row, col };
  }

  function paintPath(cells: readonly CellPos[] | null) {
    const picked = new Set((cells ?? []).map((cell) => `${cell.row},${cell.col}`));
    for (const element of searchBoard.querySelectorAll<HTMLElement>(".search-cell")) {
      element.classList.toggle("picked", picked.has(`${element.dataset.row},${element.dataset.col}`));
    }
  }

  function finishSelection(end: CellPos | null) {
    const start = searchAnchor;
    searchAnchor = null;
    if (!start || !end || !searchPuzzle) {
      paintPath(null);
      return;
    }
    const cells = cellsOnLine(start, end);
    if (!cells || cells.length < 2) {
      paintPath(null);
      return;
    }
    const remaining = searchPuzzle.words.filter((word) => !searchFound.has(word));
    const hit = matchWord(lettersOnLine(searchPuzzle.grid, cells), remaining);
    if (!hit) {
      paintPath(null);
      statusMessage = "That line is not a missing word.";
      statusKind = "info";
      render();
      return;
    }
    searchFound.add(hit);
    if (searchPuzzle.words.every((word) => searchFound.has(word))) {
      if (searchFinished === null) searchFinished = io.now();
      const elapsed = searchStarted === null ? 0 : searchFinished - searchStarted;
      statusMessage = formatTimeReport(elapsed);
    } else {
      statusMessage = `Found ${hit}.`;
    }
    statusKind = "info";
    render();
  }

  function ensureType() {
    const record = selected();
    const key = `${record?.id ?? ""}\u0000${record?.verse ?? ""}`;
    if (key === typeKey) return;
    typeKey = key;
    typeDraft = "";
    typeStarted = null;
    typeFinished = null;
    typeReport = "";
  }

  function renderType() {
    if (view !== "type") return;
    ensureType();
    const record = selected();
    const meaningful = Boolean(record && !isBlank(record) && record.verse.trim());
    typeTopic.textContent = record && !isBlank(record) ? categoryName(record.topic) : "—";
    typeRef.textContent = record && !isBlank(record) ? record.reference.trim() || "(No reference)" : "—";
    typeClock.textContent = typeClockText();
    typeEntry.disabled = !meaningful;
    assignValue(typeEntry, typeDraft);
    assignValue(typeName, scoreState.name);
    if (!record || isBlank(record)) {
      typePrompt.textContent = records.some((item) => !isBlank(item))
        ? "Choose a verse on the Study tab."
        : "Add a verse before practicing.";
    } else if (!record.verse.trim()) {
      typePrompt.textContent = "This verse has no text to type.";
    } else {
      typePrompt.textContent = "The verse stays hidden. Type it, then check. Punctuation is ignored.";
    }
    typeResult.textContent = typeReport;
    const listed = record ? bestScores(scoreState.entries, record.reference) : [];
    typeBest.replaceChildren();
    if (!listed.length) {
      const empty = document.createElement("li");
      empty.className = "hint";
      empty.textContent = "No times yet for this reference.";
      typeBest.append(empty);
      return;
    }
    for (const entry of listed) {
      const item = document.createElement("li");
      item.textContent = `${entry.name} — ${formatScoreNumber(entry.score)} (${formatTenths(entry.score)})`;
      typeBest.append(item);
    }
  }

  function checkTypedVerse() {
    const record = selected();
    if (!record || isBlank(record) || !record.verse.trim()) {
      show("Choose a verse on the Study tab.");
      return;
    }
    typeDraft = typeEntry.value;
    if (!verseCores(typeDraft).length) {
      typeReport = "Type the verse, then check it.";
      statusMessage = "";
      render();
      return;
    }
    if (typeStarted === null) typeStarted = io.now();
    const grade = gradeTyping(record.verse, typeDraft);
    if (!grade.perfect) {
      typeReport = describeGrade(grade);
      typeFinished = null;
      statusMessage = "";
      render();
      return;
    }
    if (typeFinished === null) typeFinished = io.now();
    const elapsed = typeFinished - typeStarted;
    const tenths = scoreTenths(elapsed);
    const reference = record.reference.trim() || "(No reference)";
    if (tenths === null) {
      typeReport = "Excellent!\nToo long a time to keep score, try again.";
    } else if (!scoreState.name.trim()) {
      typeReport = `Excellent!\nYour score is ${formatScoreNumber(tenths)} (${formatTenths(tenths)}). Enter your name and check again to keep it.`;
    } else {
      const next = considerScore(scoreState.entries, {
        name: scoreState.name,
        score: tenths,
        reference,
      });
      scoreState = { ...scoreState, entries: next.entries };
      if (!persistScores()) return;
      typeReport = next.saved
        ? `Excellent!\nYour score is ${formatScoreNumber(tenths)} (${formatTenths(tenths)}), kept for ${scoreState.name.trim()}.`
        : `Excellent!\nYour score is ${formatScoreNumber(tenths)} (${formatTenths(tenths)}). It is not faster than your three best times.`;
    }
    statusMessage = "";
    render();
  }

  function randomVerse() {
    const pool = records.filter((record) => !isBlank(record) && record.verse.trim());
    if (!pool.length) {
      show("Add a verse before practicing.");
      return;
    }
    if (pool.length === 1) {
      selectedId = pool[0]?.id ?? null;
      show("This is the only verse.");
      return;
    }
    const others = pool.filter((record) => record.id !== selectedId);
    const span = others.length;
    const raw = io.random();
    const scaled = Number.isFinite(raw) ? Math.floor(raw * span) : 0;
    const index = scaled < 0 ? 0 : scaled >= span ? span - 1 : scaled;
    selectedId = others[index]?.id ?? null;
    statusMessage = "";
    render();
  }

  function render() {
    syncCategory();
    renderTabs();
    renderStatus();
    renderStudy();
    renderEdit();
    renderFill();
    renderSearch();
    renderType();
    syncClock();
    if (focusTopic) {
      focusTopic = false;
      editTopic.focus();
    }
    if (focusFill) {
      focusFill = false;
      if (!fillEntry.disabled) fillEntry.focus();
    }
    if (focusType) {
      focusType = false;
      if (!typeEntry.disabled) typeEntry.focus();
    }
  }

  tabStudy.addEventListener("click", () => showView("study"));
  tabEdit.addEventListener("click", () => showView("edit"));
  tabFill.addEventListener("click", () => showView("fill"));
  tabSearch.addEventListener("click", () => showView("search"));
  tabType.addEventListener("click", () => showView("type"));
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

  must<HTMLButtonElement>(root, "btn-search-new").addEventListener("click", newPuzzle);
  must<HTMLButtonElement>(root, "btn-search-print").addEventListener("click", printPuzzle);
  must<HTMLButtonElement>(root, "btn-type-check").addEventListener("click", checkTypedVerse);
  must<HTMLButtonElement>(root, "btn-type-random").addEventListener("click", randomVerse);

  searchBoard.addEventListener("pointerdown", (event) => {
    if (view !== "search" || !searchPuzzle) return;
    const cell = cellFrom(event.target);
    if (!cell) return;
    searchAnchor = cell;
    const board = event.currentTarget;
    if (board instanceof HTMLElement && typeof board.setPointerCapture === "function") {
      try {
        board.setPointerCapture(event.pointerId);
      } catch {
        // The cells still bubble pointer events when capture is unavailable.
      }
    }
    event.preventDefault();
    paintPath(cellsOnLine(cell, cell));
  });
  searchBoard.addEventListener("pointermove", (event) => {
    if (!searchAnchor) return;
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    const cell = cellFrom(hit) ?? cellFrom(event.target);
    if (!cell) return;
    paintPath(cellsOnLine(searchAnchor, cell) ?? [searchAnchor]);
  });
  searchBoard.addEventListener("pointerup", (event) => {
    if (!searchAnchor) return;
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    finishSelection(cellFrom(event.target) ?? cellFrom(hit));
  });
  searchBoard.addEventListener("pointercancel", () => {
    searchAnchor = null;
    paintPath(null);
  });

  typeEntry.addEventListener("input", () => {
    typeDraft = typeEntry.value;
    if (typeDraft.trim() && typeStarted === null) typeStarted = io.now();
    typeFinished = null;
    typeReport = "";
    typeResult.textContent = "";
    syncClock();
    paintClocks();
  });
  typeName.addEventListener("input", () => {
    scoreState = { ...scoreState, name: typeName.value.slice(0, 40) };
    persistScores();
  });

  window.addEventListener("beforeprint", () => {
    if (printMode === "puzzle") buildPuzzlePrint();
    else buildPrint();
  });
  render();
}
