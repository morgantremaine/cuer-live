
import { RundownItem } from '@/types/rundown';
import { SearchReplaceCriteria, SearchMatch, SearchReplaceResult } from '@/types/searchReplace';

export class SearchReplaceService {
  static searchAndReplace(
    items: RundownItem[],
    criteria: SearchReplaceCriteria,
    selectedItemIds?: Set<string>
  ): SearchReplaceResult {
    const matches: SearchMatch[] = [];
    const itemsToSearch = criteria.scope === 'selected' && selectedItemIds
      ? items.filter(item => selectedItemIds.has(item.id))
      : items;

    const enabledTargets = criteria.targets.filter(target => target.enabled);

    for (const item of itemsToSearch) {
      for (const target of enabledTargets) {
        const fieldValue = this.getFieldValue(item, target.fieldKey);
        if (!fieldValue) continue;

        const itemMatches = this.findMatches(
          item,
          target,
          fieldValue,
          criteria.searchTerm,
          criteria.replaceTerm,
          criteria.options
        );
        matches.push(...itemMatches);
      }
    }

    const uniqueItemIds = new Set(matches.map(match => match.itemId));

    return {
      matches,
      totalMatches: matches.length,
      itemsAffected: uniqueItemIds.size
    };
  }

  private static getFieldValue(item: RundownItem, fieldKey: string): string {
    const value = (item as any)[fieldKey];
    return typeof value === 'string' ? value : '';
  }

  private static findMatches(
    item: RundownItem,
    target: { fieldKey: string; fieldName: string },
    fieldValue: string,
    searchTerm: string,
    replaceTerm: string,
    options: { caseSensitive: boolean; wholeWordsOnly: boolean; useRegex: boolean }
  ): SearchMatch[] {
    const matches: SearchMatch[] = [];

    try {
      let pattern: RegExp;
      
      if (options.useRegex) {
        const flags = options.caseSensitive ? 'g' : 'gi';
        pattern = new RegExp(searchTerm, flags);
      } else {
        let escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        if (options.wholeWordsOnly) {
          escapedSearch = `\\b${escapedSearch}\\b`;
        }
        
        const flags = options.caseSensitive ? 'g' : 'gi';
        pattern = new RegExp(escapedSearch, flags);
      }

      let match;
      while ((match = pattern.exec(fieldValue)) !== null) {
        const matchStart = match.index;
        const matchEnd = match.index + match[0].length;
        const matchText = match[0];
        
        // Calculate replacement text (handling regex capture groups)
        const replacementText = options.useRegex 
          ? matchText.replace(new RegExp(searchTerm, options.caseSensitive ? '' : 'i'), replaceTerm)
          : replaceTerm;

        // Generate preview value
        const previewValue = fieldValue.substring(0, matchStart) + 
                           replacementText + 
                           fieldValue.substring(matchEnd);

        matches.push({
          itemId: item.id,
          itemName: item.name || item.segmentName || 'Unnamed Item',
          fieldKey: target.fieldKey,
          fieldName: target.fieldName,
          originalValue: fieldValue,
          matchStart,
          matchEnd,
          matchText,
          replacementText,
          previewValue
        });

        // Prevent infinite loop with zero-width matches
        if (match[0].length === 0) {
          pattern.lastIndex++;
        }
      }
    } catch (error) {
      console.error('Search pattern error:', error);
      // For non-regex searches, fall back to simple string matching
      if (!options.useRegex) {
        const searchText = options.caseSensitive ? searchTerm : searchTerm.toLowerCase();
        const fieldText = options.caseSensitive ? fieldValue : fieldValue.toLowerCase();
        
        let index = fieldText.indexOf(searchText);
        while (index !== -1) {
          // Check word boundaries if needed
          if (options.wholeWordsOnly) {
            const before = index > 0 ? fieldValue[index - 1] : ' ';
            const after = index + searchTerm.length < fieldValue.length ? fieldValue[index + searchTerm.length] : ' ';
            
            if (!/\W/.test(before) || !/\W/.test(after)) {
              index = fieldText.indexOf(searchText, index + 1);
              continue;
            }
          }

          const matchStart = index;
          const matchEnd = index + searchTerm.length;
          const matchText = fieldValue.substring(matchStart, matchEnd);
          const previewValue = fieldValue.substring(0, matchStart) + 
                             replaceTerm + 
                             fieldValue.substring(matchEnd);

          matches.push({
            itemId: item.id,
            itemName: item.name || item.segmentName || 'Unnamed Item',
            fieldKey: target.fieldKey,
            fieldName: target.fieldName,
            originalValue: fieldValue,
            matchStart,
            matchEnd,
            matchText,
            replacementText: replaceTerm,
            previewValue
          });

          index = fieldText.indexOf(searchText, index + 1);
        }
      }
    }

    return matches;
  }

  static applyReplacements(
    matches: SearchMatch[],
    updateItem: (id: string, field: string, value: string) => void
  ): void {
    // Group matches by item and field to handle multiple replacements in the same field
    const groupedMatches = new Map<string, SearchMatch[]>();
    
    for (const match of matches) {
      const key = `${match.itemId}-${match.fieldKey}`;
      if (!groupedMatches.has(key)) {
        groupedMatches.set(key, []);
      }
      groupedMatches.get(key)!.push(match);
    }

    // Apply replacements field by field
    for (const [key, fieldMatches] of groupedMatches) {
      // Sort matches by position (descending) to avoid index shifting issues
      fieldMatches.sort((a, b) => b.matchStart - a.matchStart);
      
      let updatedValue = fieldMatches[0].originalValue;
      
      for (const match of fieldMatches) {
        updatedValue = updatedValue.substring(0, match.matchStart) + 
                      match.replacementText + 
                      updatedValue.substring(match.matchEnd);
      }

      updateItem(fieldMatches[0].itemId, fieldMatches[0].fieldKey, updatedValue);
    }
  }
}
