export type VerseRecord = {
  id: string;
  topic: string;
  reference: string;
  verse: string;
};

export type Library = {
  version: 1;
  records: VerseRecord[];
};

export type ViewName = "study" | "edit" | "fill" | "search" | "type";
