export interface LookupResult {
  word: string;
  lemma: string | null;
  pos: string | null;
  meaningJa: string | null;
  exampleEn: string | null;
  contextSentence?: string | null;
  cached: boolean;
  autoSaved?: boolean;
}

export interface LookupHistoryItem {
  id: number;
  word: string;
  lemma: string | null;
  contextSentence: string | null;
  meaningJa: string | null;
  pos: string | null;
  exampleEn: string | null;
  createdAt: string;
}

export interface VocabItem {
  id: number;
  word: string;
  pos: string | null;
  meaningJa: string | null;
  exampleEn: string | null;
  sourceArticleId: number | null;
  sourceArticleTitle: string | null;
  mastered: boolean;
  createdAt: string;
  updatedAt: string;
}
