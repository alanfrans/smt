# Scripture Memory Tool

A browser port of Alan’s Scripture Memory Tool. Study a verse, hide words, search for them in a puzzle, or type the whole verse from memory. Verses stay in this browser. No account.

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
- **Search.** The verse’s words are hidden in a letter grid. Drag a straight line across, down, or on a diagonal. The word goes back into the verse. **New puzzle** shuffles it. **Print puzzle** prints the grid.
- **Type.** The verse stays hidden. Type it and press **Check**. Punctuation is ignored. A perfect verse under 16 minutes is kept as a score, in tenths of a second, the same unit as the older desktop app. The three fastest times for that reference are listed. **Random verse** jumps to another passage.
- **Open / Save.** `.sms` files use the desktop app’s text format, so a file saved here can be opened there, and the other way around. A VB6 `.smt` file opens as verses. A `scores.sms` list opens as times and does not replace the verses.
- **Print.** Prints the library with the browser’s print dialog.

Until you edit anything, the app shows a small King James Version starter set (public domain in the United States) and does not write it to storage. Open replaces that set with your file. After the first edit, the library is stored in `localStorage` under `smt.library.v1`. Times are stored separately under `smt.scores.v1` and are not written into `.sms` files.

An example file is in `examples/john.sms`.

### Try the word search

`npm run dev`, open http://127.0.0.1:4317, and choose **Search**. Drag through a word in the grid. The matching blank in the verse fills in. The clock starts when the puzzle is built.

### Try the type test

Choose **Type**, type the verse you were just reading, and press **Check**. Put your name in before you check if you want the time kept. **Random verse** switches the passage and clears what you typed.

## What was not ported

From the VB.NET app: the borderless window, scroll artwork, drag-to-move, Exit, and the three unlabeled Tools buttons that had no code. That app did not score quizzes.

From the earlier VB6 app: label printing, unfinished print cards, the splash screen, the hover-to-peek list, word-by-word reveal, and the registry review window. The VB6 built-in verse list is not included. See `CONVERSION.md` for both checklists.
