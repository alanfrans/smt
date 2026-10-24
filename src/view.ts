export const appMarkup = `
  <div class="page">
    <header class="mast">
      <div class="brand">
        <h1>Scripture Memory Tool</h1>
        <p class="lede">Read a passage, hide words, and type them back.</p>
      </div>
      <div class="mast-actions">
        <nav class="tabs" role="tablist" aria-label="Screens">
          <button type="button" class="tab" id="tab-study" data-view="study" role="tab" aria-selected="true">Study</button>
          <button type="button" class="tab" id="tab-edit" data-view="edit" role="tab" aria-selected="false">Edit</button>
          <button type="button" class="tab" id="tab-fill" data-view="fill" role="tab" aria-selected="false">Fill in</button>
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
          <article class="panel reading">
            <h2 id="reading-ref" class="reading-ref"></h2>
            <p id="reading-verse" class="reading-verse"></p>
            <p id="reading-empty" class="empty"></p>
            <p id="sample-note" class="note" hidden>
              These example verses are from the King James Version, public domain in the United States.
              Open an .sms file to replace them. Nothing is stored in this browser until you edit.
            </p>
          </article>
        </div>
      </section>

      <section id="view-edit" role="tabpanel" aria-labelledby="tab-edit" hidden>
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
      </section>

      <section id="view-fill" role="tabpanel" aria-labelledby="tab-fill" hidden>
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
      </section>
    </main>

    <section id="print-root" class="print-root" aria-hidden="true"></section>

    <footer class="colophon">
      Verses stay in this browser. Save downloads an <code>.sms</code> file the desktop Scripture Memory Tool can open.
    </footer>
  </div>
`;
