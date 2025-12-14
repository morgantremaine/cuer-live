/**
 * Fractional Indexing Utilities
 * 
 * Implements fractional indexing for conflict-free collaborative reordering.
 * Each item gets a sortOrder string that can be positioned between any two existing items.
 * 
 * Based on the fractional-indexing algorithm using base-95 ASCII characters.
 */

// Base-95 ASCII (space to ~) for dense fractional positions
const BASE = 95;
const ZERO_CHAR_CODE = 32; // ASCII space

/**
 * Converts a string position to a numeric value for comparison
 */
function positionToNumber(pos: string): number {
  let result = 0;
  for (let i = 0; i < pos.length; i++) {
    result = result * BASE + (pos.charCodeAt(i) - ZERO_CHAR_CODE);
  }
  return result;
}

/**
 * Generates a position string between two existing positions.
 * If before is null, generates a position before after.
 * If after is null, generates a position after before.
 * If both are null, generates a starting position.
 */
export function generateKeyBetween(
  before: string | null | undefined,
  after: string | null | undefined
): string {
  // Handle null/undefined inputs
  const a = before ?? null;
  const b = after ?? null;
  
  // Generate initial position
  if (a === null && b === null) {
    return 'a'; // Starting position
  }
  
  // Generate position before first item
  if (a === null) {
    // Find a position before 'b'
    const bFirst = b!.charCodeAt(0);
    if (bFirst > ZERO_CHAR_CODE + 1) {
      // Can simply decrement first character
      return String.fromCharCode(bFirst - 1);
    }
    // Need to prepend a character
    return String.fromCharCode(ZERO_CHAR_CODE + 1) + midChar(null, b!.charAt(0));
  }
  
  // Generate position after last item
  if (b === null) {
    // Find a position after 'a'
    const aLast = a.charCodeAt(a.length - 1);
    if (aLast < ZERO_CHAR_CODE + BASE - 2) {
      // Can simply increment last character
      return a.slice(0, -1) + String.fromCharCode(aLast + 1);
    }
    // Append a character
    return a + String.fromCharCode(ZERO_CHAR_CODE + Math.floor(BASE / 2));
  }
  
  // Generate position between two items
  return midpoint(a, b);
}

/**
 * Gets the midpoint character between two characters
 */
function midChar(a: string | null, b: string | null): string {
  const aCode = a ? a.charCodeAt(0) : ZERO_CHAR_CODE;
  const bCode = b ? b.charCodeAt(0) : ZERO_CHAR_CODE + BASE - 1;
  return String.fromCharCode(Math.floor((aCode + bCode) / 2));
}

/**
 * Generates a string midpoint between two strings
 */
function midpoint(a: string, b: string): string {
  // Ensure a < b
  if (a >= b) {
    console.warn('fractionalIndex: a >= b, swapping', { a, b });
    [a, b] = [b, a];
  }
  
  let result = '';
  const maxLen = Math.max(a.length, b.length) + 8; // Extra space for precision
  
  for (let i = 0; i < maxLen; i++) {
    const aChar = i < a.length ? a.charCodeAt(i) : ZERO_CHAR_CODE;
    const bChar = i < b.length ? b.charCodeAt(i) : ZERO_CHAR_CODE + BASE - 1;
    
    if (aChar === bChar) {
      result += String.fromCharCode(aChar);
      continue;
    }
    
    // We can insert between these characters
    const mid = Math.floor((aChar + bChar) / 2);
    
    if (mid > aChar) {
      return result + String.fromCharCode(mid);
    }
    
    // Need more precision - continue with aChar and recurse
    result += String.fromCharCode(aChar);
    
    // Now find midpoint between remaining suffix of a and '~' (max char)
    const aRest = i + 1 < a.length ? a.slice(i + 1) : '';
    const bRest = i + 1 < b.length ? b.slice(i + 1) : String.fromCharCode(ZERO_CHAR_CODE + BASE - 1);
    
    if (aRest < bRest) {
      return result + midpoint(aRest || String.fromCharCode(ZERO_CHAR_CODE), bRest);
    }
    
    // Edge case: append midpoint character
    return result + String.fromCharCode(ZERO_CHAR_CODE + Math.floor(BASE / 2));
  }
  
  // Fallback: append midpoint character
  return result + String.fromCharCode(ZERO_CHAR_CODE + Math.floor(BASE / 2));
}

/**
 * Generates N keys between two positions, evenly distributed.
 * Useful for batch operations like moving multiple items.
 */
export function generateNKeysBetween(
  before: string | null | undefined,
  after: string | null | undefined,
  n: number
): string[] {
  if (n === 0) return [];
  if (n === 1) return [generateKeyBetween(before, after)];
  
  const keys: string[] = [];
  let prevKey = before ?? null;
  
  for (let i = 0; i < n; i++) {
    const nextKey = generateKeyBetween(prevKey, after);
    keys.push(nextKey);
    prevKey = nextKey;
  }
  
  return keys;
}

/**
 * Compares two sortOrder strings for sorting.
 * Returns negative if a < b, positive if a > b, 0 if equal.
 */
export function compareSortOrder(a: string | undefined, b: string | undefined): number {
  // Handle undefined/null - items without sortOrder go to end
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  
  return a.localeCompare(b);
}

/**
 * Initializes sortOrder values for items that don't have them.
 * Generates sequential sort orders maintaining current array order.
 */
export function initializeSortOrders<T extends { sortOrder?: string }>(
  items: T[]
): T[] {
  const needsInit = items.some(item => !item.sortOrder);
  
  if (!needsInit) {
    return items; // All items already have sortOrder
  }
  
  // Generate sequential sort orders
  let prevKey: string | null = null;
  
  return items.map((item, index) => {
    if (item.sortOrder) {
      prevKey = item.sortOrder;
      return item;
    }
    
    // Generate a key after the previous one
    const newKey = generateKeyBetween(prevKey, null);
    prevKey = newKey;
    
    return {
      ...item,
      sortOrder: newKey
    };
  });
}

/**
 * Validates that sortOrder values are in correct ascending order.
 * Returns true if valid, false if there are inconsistencies.
 */
export function validateSortOrder<T extends { sortOrder?: string }>(items: T[]): boolean {
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1].sortOrder;
    const curr = items[i].sortOrder;
    
    if (!prev || !curr) continue; // Skip items without sortOrder
    
    if (prev >= curr) {
      console.warn('validateSortOrder: Invalid order detected', {
        index: i,
        prev,
        curr
      });
      return false;
    }
  }
  
  return true;
}
