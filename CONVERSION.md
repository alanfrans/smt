# Conversion notes

The desktop project is a VB.NET WinForms app (Visual Studio 2003, `SMT.vbproj`), not VB6. One form, about 1,100 lines of code plus a `.resx` of button and scroll bitmaps. There is no database, no packed Bible, and no score file.

A one-shot port was realistic. This repository is that port: the study list, the editor, and the fill-in drill, with `.sms` import and export and browser storage.

## Where the desktop app kept data

A verse is three strings: topic (called Category on screen), reference, and verse text (`smtRecord` in `modEdit.vb`).

While the app is open they live in the `NewRecord` array. Nothing is written until Save. Save (`frmSMT.SaveCurrentRecords`) shows a save dialog and writes a `.sms` text file:

```text
<SMTFile>
  <Record>
    <Topic>
      Gospel
    </Topic>
    <Reference>
      John 3:16
    </Reference>
    <Verse>
      For God so loved the world
    </Verse>
  </Record>
</SMTFile>
```

Open reads that shape line by line. Tags are matched after trim and case-fold. The value is the next line. There is no progress, score, or settings file.

The browser copy uses the same `.sms` text for Open and Save. Between sessions it stores JSON in `localStorage` (`smt.library.v1`): `{ version: 1, records: [{ id, topic, reference, verse }] }`. The `id` is only for the browser; it is not written into `.sms` files. Multiline verses are kept in the browser. A `.sms` export flattens each field onto one line, because the desktop reader stops at the first line.

## Feature checklist

| Desktop feature | In this port |
| --- | --- |
| Category list and reference list | Yes. Study tab. |
| Read the selected verse | Yes. |
| New verse | Yes. Header **New** and editor **Add**. |
| Edit category, reference, and verse as you type | Yes. |
| Previous / next record | Yes. Same messages at the ends: “This is the first record.” / “This is the last record.” |
| Save `.sms` | Yes. **Save** downloads `scripture.sms`. |
| Open `.sms` | Yes. A VB6 `.smt` file opens too. Anything else gets “This file is not a Scripture Memory Tool file.” |
| Fill in: hide N words with underscores | Yes. Slider plus a number, same idea as the trackbar and `txtFillNum`. |
| Type the missing word | Yes. The matching word is written back into the verse. |
| Print | Yes, via the browser print dialog. The desktop Print button had no code. |
| Delete (“− Sub”) | Yes, with a confirm. The desktop button had no code. |
| File > Edit | Yes. The Edit tab opens the current verse. The desktop handler was empty. |
| File > Exit | Not ported. It ended the Windows process. |
| Tools buttons Label1, Label3, Label4 | Not ported. They had pictures, no captions, and no code. |
| Borderless window, red transparency, scroll images, drag to move | Not ported. That is window chrome from `frmSMT.resx`. |
| Papyrus labels, Courier New drill text | Partially. The drill uses Courier New while words are hidden. Papyrus is not used. |
| Hover menus | Replaced by visible Study / Edit / Fill in and Open / Save / Print so a phone can reach them. |
| Scoring, accounts, spaced repetition, packed Bible text | Not in the VB.NET app. Scoring arrived later from the VB6 type test; see below. |

## Fill-in behavior

`clsSMT` splits the verse on spaces, pushes the words onto a stack, and replaces N of them with underscores of the same length. Opening Fill in set the count to 0, so the verse started fully visible and the slider raised the difficulty. This port does the same.

The desktop checker (`IsMissingWord`) compared the typed text to the stack and, on a hit, showed a message box that said “Is Missing”. It did not put the word back. It also only listened for A–Z key codes, so a word like `world,` could not be typed. Several index bugs meant the last word was never chosen, a fully hidden verse forgot which positions were blank, and the highlight position skipped the first word.

This port:

- hides any of the words, including the last, and still tracks a fully hidden verse
- checks the leftmost blank, which is what the highlight was trying to do
- accepts the word ignoring case
- treats a trailing comma, period, or similar mark as optional
- writes the original word back and moves to the next blank

Enter on a wrong word says it does not match. Fill in still does not record a score. The type test, added from the VB6 app, does.

## Other desktop quirks that are fixed

- Save wrote a blank record at index 0, and Open started real verses at index 1. Empty records are not written or imported.
- The reference list matched on reference text only, so two verses with the same reference showed the later verse’s text. Selection is by record.
- Verses with no category never appeared in the list. They show under “(No category)”.
- Close hid the edit menu and left the editor panel up. Close returns to Study. A new verse you did not type anything into is dropped, so an accidental New does not save the starter set.
- Category names are refreshed as you edit. The desktop list updated only when a file was opened.

## VB6 app (smtvb6)

The browser port above started from the VB.NET project. Alan also kept an earlier VB6 app, Scripture Memory 3.2.2 (`smt3.vbp`). That program has the study list and the fill-in drill, and it also has a word search, a type test, and a score file. Those three are now in this app. The VB.NET `.sms` Open/Save path is unchanged.

### Merged

| VB6 feature | In this app |
| --- | --- |
| Word search, 16×16 and up, eight directions | Search tab. The grid grows when a verse needs it. Overlapping letters are allowed when they match. |
| Drag a straight or diagonal line to select a word | Drag across the letters. The line is also accepted backward, so either end can be the start. |
| Found word returns to the verse | Yes. A repeated word is listed once, and finding it fills every copy. |
| Clock, and “Time: N minutes N seconds” when the puzzle is finished | Yes. The clock starts when the puzzle is built. |
| Print the puzzle | **Print puzzle** uses the browser print dialog. |
| Type test hides the verse | Type tab. |
| Check, ignoring punctuation and case | **Check**. The default desktop setting (`bolNoPunc`) was on. |
| “Excellent!” and “(typed) does not match (expected)” | Yes, plus a count of missing or extra words. The desktop extra-word line said “to many”; this says “too many”. |
| Score in tenths of a second, lower is better, refused after the 15-minute mark | A perfect verse is scored when the time is under 16 minutes, matching `wMinute > 15`. |
| Three best times for a reference, with a name | The name field replaces the InputBox. Times are kept in `smt.scores.v1`. |
| `scores.sms` (name, score, reference) | Open a file named `.sms` that has no `<Record>` tags and is those triples. The verse library is left alone. |
| `.smt` CSV: Reference, Topic, Verse, Version, Name, Score | Open imports the verses. A row with a name and a score above 0 also adds a time. Version is ignored. |
| Random type test | **Random verse** picks another passage. It does not start by itself after a perfect score. |

### Not merged

| VB6 feature | Why it stayed out |
| --- | --- |
| Fill in jumps to the type test when every word is hidden | The VB.NET fill-in is the one this app already shipped. Raising the slider still only hides more words. |
| Word by word (`byWord` / `getNext`) | Study already shows the verse. This is a paced reveal, not a second practice. |
| Review window (`frmReview`) | Passed verses were stored in the Windows registry. The Type tab lists the three best times for the open reference instead of a separate window. |
| Together (`frmTogether`) | A hover list that peeks at the verse. Study already shows the verse you select. |
| Entry form (`frmEntry`) | The Edit tab already adds and saves verses. |
| Print cards (`PrintCard`) and `frmPrint` | The card class draws boxes and does not print the verse. `frmPrint` is a Windows label layout. |
| Splash screen, borderless window, scroll art | Window chrome. |
| Built-in Navigators list in `initDataOld` | That wording is not public domain, so it is not shipped here. The King James starter set is unchanged. |
| One score stored back inside a loaded `.smt` row | Save still writes `.sms` only, and that format has no score field. Times stay in the browser. |
| Punctuation on/off, caps on/off | The type test always ignores punctuation and case, which is how the VB6 app was set by default. |

## Phone layout

The reference list is a horizontal row of buttons on a narrow screen and a column beside the verse on a wide one. Controls are at least 44px tall. The library never leaves the device.
