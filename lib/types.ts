export type Segment = {
  startSec: number;
  endSec: number;
  text: string;
};

export type Pack = {
  id: string;
  title: string;
  level: "A2" | "B1" | "B2";
  topic: string;
  audioUrl: string;
  durationSec?: number;
  transcript: string;
  segments?: Segment[];
  phraseIds: string[];
  tags: string[];
};

export type Phrase = {
  id: string;
  text: string;
  corePattern: string;
  meaningJa: string;
  meaningEn?: string;
  notes?: string;
  difficulty: 1 | 2 | 3;
  variants: string[];
  contrasts: string[];
  examples: string[];
  tags: string[];
};

export type PackPhraseLink = {
  packId: string;
  phraseId: string;
  startIndex: number;
  endIndex: number;
  startSec?: number;
  endSec?: number;
  role: "main" | "support";
};

export type ContentData = {
  packs: Pack[];
  phrases: Phrase[];
  links: PackPhraseLink[];
};

export type PhraseProgress = {
  phraseId: string;
  saved: boolean;
  dueAt: string;
  lastReviewedAt?: string;
  stability: number;
  reviewState?: "new" | "learning" | "review" | "mastered";
  easyCount: number;
  closeCount: number;
  hardCount: number;
  favorite: boolean;
  confusing: boolean;
  wantToUse: boolean;
  hidden: boolean;
};

export type PackProgress = {
  packId: string;
  completed: boolean;
  lastOpenedAt?: string;
};

export type ReviewRating = "easy" | "close" | "hard";

export type UserProgressV1 = {
  version: 1;
  phraseProgress: Record<string, PhraseProgress>;
  packProgress: Record<string, PackProgress>;
  savedPhraseIds: string[];
};
