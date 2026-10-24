# Scripture Memory Tool

A browser port of Alan’s Scripture Memory Tool. Study a verse, hide some of its words, and type them back. Verses stay in this browser. No account.

## Run

```bash
npm install
npm run dev
```

Open http://127.0.0.1:4317

`npm test` runs the unit tests. `npm run build` writes a static site to `dist/`.

## What’s here

- **Study.** Pick a category, then a reference, and read the verse.
- **Edit.** Add, change, or delete verses. Prev and Next walk the whole library.
- **Fill in.** The slider hides that many words behind underscores. Type the highlighted blank. A comma or period at the end of a word is optional.
- **Open / Save.** `.sms` files use the desktop app’s text format, so a file saved here can be opened there, and the other way around.
- **Print.** Prints the library with the browser’s print dialog.

Until you edit anything, the app shows a small King James Version starter set (public domain in the United States) and does not write it to storage. Open replaces that set with your file. After the first edit, the library is stored in `localStorage` under `smt.library.v1`.

An example file is in `examples/john.sms`.

## What was not ported

The desktop window chrome (borderless form, scroll artwork, drag-to-move, Exit), the three unlabeled Tools buttons that had no code, and any scoring. The original app did not score quizzes or ship Bible text. See `CONVERSION.md` for the feature checklist and the bugs this port fixes.
