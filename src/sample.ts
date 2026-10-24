import type { VerseRecord } from "./types.ts";

/**
 * A small public-domain starter set so the drill can be tried before
 * an .sms file is imported. King James Version, public domain in the
 * United States. These are not saved until the library is edited.
 */
const STARTER: readonly VerseRecord[] = [
  {
    id: "sample-john-3-16",
    topic: "Gospel",
    reference: "John 3:16",
    verse:
      "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
  },
  {
    id: "sample-john-14-6",
    topic: "Gospel",
    reference: "John 14:6",
    verse:
      "Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me.",
  },
  {
    id: "sample-proverbs-3",
    topic: "Trust",
    reference: "Proverbs 3:5-6",
    verse:
      "Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.",
  },
  {
    id: "sample-romans-8-28",
    topic: "Trust",
    reference: "Romans 8:28",
    verse:
      "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.",
  },
  {
    id: "sample-joshua-1-9",
    topic: "Trust",
    reference: "Joshua 1:9",
    verse:
      "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.",
  },
  {
    id: "sample-psalm-23-1",
    topic: "Comfort",
    reference: "Psalm 23:1",
    verse: "The LORD is my shepherd; I shall not want.",
  },
  {
    id: "sample-isaiah-41-10",
    topic: "Comfort",
    reference: "Isaiah 41:10",
    verse:
      "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.",
  },
  {
    id: "sample-matthew-11-28",
    topic: "Comfort",
    reference: "Matthew 11:28",
    verse: "Come unto me, all ye that labour and are heavy laden, and I will give you rest.",
  },
  {
    id: "sample-1-john-4-8",
    topic: "Love",
    reference: "1 John 4:8",
    verse: "He that loveth not knoweth not God; for God is love.",
  },
  {
    id: "sample-psalm-119-11",
    topic: "Scripture",
    reference: "Psalm 119:11",
    verse: "Thy word have I hid in mine heart, that I might not sin against thee.",
  },
  {
    id: "sample-2-timothy-3-16",
    topic: "Scripture",
    reference: "2 Timothy 3:16",
    verse:
      "All scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness:",
  },
  {
    id: "sample-philippians-4-13",
    topic: "Strength",
    reference: "Philippians 4:13",
    verse: "I can do all things through Christ which strengtheneth me.",
  },
];

export function sampleRecords(): VerseRecord[] {
  return STARTER.map((record) => ({ ...record }));
}
