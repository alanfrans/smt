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
| Open `.sms` | Yes. Other extensions get “This file is not a Scripture Memory Tool file.” |
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
| Scoring, accounts, spaced repetition, packed Bible text | Not in the desktop app, and not added here. |

## Fill-in behavior

`clsSMT` splits the verse on spaces, pushes the words onto a stack, and replaces N of them with underscores of the same length. Opening Fill in set the count to 0, so the verse started fully visible and the slider raised the difficulty. This port does the same.

The desktop checker (`IsMissingWord`) compared the typed text to the stack and, on a hit, showed a message box that said “Is Missing”. It did not put the word back. It also only listened for A–Z key codes, so a word like `world,` could not be typed. Several index bugs meant the last word was never chosen, a fully hidden verse forgot which positions were blank, and the highlight position skipped the first word.

This port:

- hides any of the words, including the last, and still tracks a fully hidden verse
- checks the leftmost blank, which is what the highlight was trying to do
- accepts the word ignoring case
- treats a trailing comma, period, or similar mark as optional
- writes the original word back and moves to the next blank

Enter on a wrong word says it does not match. There is still no score.

## Other desktop quirks that are fixed

- Save wrote a blank record at index 0, and Open started real verses at index 1. Empty records are not written or imported.
- The reference list matched on reference text only, so two verses with the same reference showed the later verse’s text. Selection is by record.
- Verses with no category never appeared in the list. They show under “(No category)”.
- Close hid the edit menu and left the editor panel up. Close returns to Study. A new verse you did not type anything into is dropped, so an accidental New does not save the starter set.
- Category names are refreshed as you edit. The desktop list updated only when a file was opened.

## Phone layout

The reference list is a horizontal row of buttons on a narrow screen and a column beside the verse on a wide one. Controls are at least 44px tall. The library never leaves the device.
