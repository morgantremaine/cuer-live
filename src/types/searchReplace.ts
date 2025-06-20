
export interface SearchReplaceOptions {
  caseSensitive: boolean;
  wholeWordsOnly: boolean;
  useRegex: boolean;
}

export interface SearchReplaceTarget {
  fieldKey: string;
  fieldName: string;
  enabled: boolean;
}

export interface SearchMatch {
  itemId: string;
  itemName: string;
  fieldKey: string;
  fieldName: string;
  originalValue: string;
  matchStart: number;
  matchEnd: number;
  matchText: string;
  replacementText: string;
  previewValue: string;
}

export interface SearchReplaceResult {
  matches: SearchMatch[];
  totalMatches: number;
  itemsAffected: number;
}

export interface SearchReplaceCriteria {
  searchTerm: string;
  replaceTerm: string;
  options: SearchReplaceOptions;
  targets: SearchReplaceTarget[];
  scope: 'all' | 'selected';
}
