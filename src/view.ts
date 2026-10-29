function parchment(inner: string): string {
  return `
      <div class="scroll">
        <div class="roller roller-left" aria-hidden="true">
          <img class="roll" src="/art/leftscroll.png" alt="" width="164" height="630" />
        </div>
        <div class="scroll-sheet">
          ${inner}
        </div>
        <div class="roller roller-right" aria-hidden="true">
          <img class="roll" src="/art/rightscroll.png" alt="" width="146" height="608" />
        </div>
      </div>
  `;
}
export const appMarkup = `
  <div class="page">
    <header class="mast">
      <div class="brand">
        <h1>
          <img class="wordmark" src="/art/smt.png" alt="Scripture Memory Tool" width="499" height="362" />
        </h1>
        <p class="lede">
          <img class="crest" src="/favicon.png" alt="" width="32" height="32" />
          Read a passage, search for its words, or type it from memory.
        </p>
      </div>
      <div class="mast-actions">
        <nav class="tabs" role="tablist" aria-label="Screens">
          <button type="button" class="tab" id="tab-study" data-view="study" role="tab" aria-selected="true">Study</button>
          <button type="button" class="tab" id="tab-edit" data-view="edit" role="tab" aria-selected="false">Edit</button>
          <button type="button" class="tab" id="tab-fill" data-view="fill" role="tab" aria-selected="false">Fill in</button>
          <button type="button" class="tab" id="tab-search" data-view="search" role="tab" aria-selected="false">Search</button>
          <button type="button" class="tab" id="tab-type" data-view="type" role="tab" aria-selected="false">Type</button>
        </nav>
        <div class="file-actions" aria-label="File">
          <button type="button" class="ghost" id="btn-new">New</button>
          <button type="button" class="ghost" id="btn-open">Open</button>
          <button type="button" class="ghost" id="btn-save">Save</button>
          <button type="button" class="ghost" id="btn-print">Print</button>
          <input id="file-open" type="file" hidden />
        </div>
      </div>
    </header>

    <p id="status" class="status" role="status" hidden></p>

    <main>
      <section id="view-study" role="tabpanel" aria-labelledby="tab-study">
        <div class="study-layout">
          <aside class="panel picker">
            <label class="field" for="category">Category</label>
            <select id="category"></select>
            <p class="field-label" id="ref-label">Reference</p>
            <div id="ref-list" class="ref-list" role="listbox" aria-labelledby="ref-label"></div>
          </aside>
          ${parchment(`
          <article class="panel reading">
            <h2 id="reading-ref" class="reading-ref"></h2>
            <p id="reading-verse" class="reading-verse"></p>
            <p id="reading-empty" class="empty"></p>
            <p id="sample-note" class="note" hidden>
              These example verses are from the King James Version, public domain in the United States.
              Open an .sms file to replace them. Nothing is stored in this browser until you edit.
            </p>
          </article>
          `)}
        </div>
      </section>

      <section id="view-edit" role="tabpanel" aria-labelledby="tab-edit" hidden>
        ${parchment(`
        <form id="edit-form" class="panel editor" autocomplete="off">
          <div class="edit-grid">
            <label class="field">
              <span>Category</span>
              <input id="edit-topic" name="topic" type="text" list="topic-list" placeholder="Gospel, trust, comfort" />
              <datalist id="topic-list"></datalist>
            </label>
            <label class="field">
              <span>Reference</span>
              <input id="edit-reference" name="reference" type="text" placeholder="John 3:16" />
            </label>
          </div>
          <label class="field">
            <span>Verse</span>
            <textarea id="edit-verse" name="verse" rows="8" placeholder="Paste or type the passage."></textarea>
          </label>
          <div class="toolbar">
            <button type="button" id="btn-add">Add</button>
            <button type="button" class="danger" id="btn-delete">Delete</button>
            <button type="button" id="btn-prev">Prev</button>
            <button type="button" id="btn-next">Next</button>
            <button type="button" id="btn-edit-save">Save</button>
            <button type="button" id="btn-edit-close">Close</button>
          </div>
          <p class="hint" id="edit-position"></p>
        </form>
        `)}
      </section>

      <section id="view-fill" role="tabpanel" aria-labelledby="tab-fill" hidden>
        ${parchment(`
        <div class="panel drill">
          <div class="drill-meta">
            <p><span class="meta-label">Category</span> <strong id="fill-topic"></strong></p>
            <p><span class="meta-label">Reference</span> <strong id="fill-reference"></strong></p>
          </div>
          <div class="drill-control">
            <div class="drill-control-top">
              <label id="fill-range-label" for="fill-range">Words hidden</label>
              <input id="fill-count" class="count" type="number" min="0" inputmode="numeric" aria-label="Number of words hidden" />
              <span id="fill-total" class="hint"></span>
            </div>
            <input id="fill-range" type="range" min="0" max="0" step="1" value="0" aria-labelledby="fill-range-label" />
          </div>
          <p id="fill-verse" class="drill-verse" aria-live="polite"></p>
          <label class="field" for="fill-entry">
            <span id="fill-prompt">Type the next blank</span>
          </label>
          <input id="fill-entry" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="next" />
          <p class="hint" id="fill-hint"></p>
        </div>
        `)}
      </section>

      <section id="view-search" role="tabpanel" aria-labelledby="tab-search" hidden>
        ${parchment(`
        <div class="panel drill">
          <div class="drill-meta">
            <p><span class="meta-label">Category</span> <strong id="search-topic"></strong></p>
            <p><span class="meta-label">Reference</span> <strong id="search-ref"></strong></p>
            <p><span class="meta-label">Time</span> <strong id="search-clock"></strong></p>
          </div>
          <p id="search-verse" class="drill-verse" aria-live="polite"></p>
          <p class="hint" id="search-hint"></p>
          <div id="search-board" class="search-board"></div>
          <div class="toolbar">
            <button type="button" id="btn-search-new">New puzzle</button>
            <button type="button" id="btn-search-print">Print puzzle</button>
          </div>
        </div>
        `)}
      </section>

      <section id="view-type" role="tabpanel" aria-labelledby="tab-type" hidden>
        ${parchment(`
        <div class="panel drill">
          <div class="drill-meta">
            <p><span class="meta-label">Category</span> <strong id="type-topic"></strong></p>
            <p><span class="meta-label">Reference</span> <strong id="type-ref"></strong></p>
            <p><span class="meta-label">Time</span> <strong id="type-clock"></strong></p>
          </div>
          <p class="hint" id="type-prompt">The verse stays hidden. Type it, then check.</p>
          <label class="field" for="type-entry">
            <span>Type the verse</span>
            <textarea id="type-entry" rows="6" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Type the verse from memory."></textarea>
          </label>
          <label class="field" for="type-name">
            <span>Name</span>
            <input id="type-name" type="text" maxlength="40" placeholder="Your name, for the score" autocomplete="nickname" />
          </label>
          <div class="toolbar">
            <button type="button" id="btn-type-check">Check</button>
            <button type="button" id="btn-type-random">Random verse</button>
          </div>
          <p id="type-result" class="type-result" aria-live="polite"></p>
          <p class="field-label" id="type-best-label">Best times</p>
          <ul id="type-best" class="best-list" aria-labelledby="type-best-label"></ul>
        </div>
        `)}
      </section>
    </main>

    <section id="print-root" class="print-root" aria-hidden="true"></section>

    <footer class="colophon">
      <img class="colophon-mark" src="/art/wordmark.png" alt="" width="142" height="92" />
      Verses stay in this browser. Save downloads an <code>.sms</code> file the desktop Scripture Memory Tool can open. Type-test times stay in this browser too, and are not written into that file.
    </footer>
  </div>
`;
