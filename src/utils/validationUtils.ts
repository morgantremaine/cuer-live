
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

/**
 * Validation utilities for rundown data
 */

export const validateRundownItem = (item: any): item is RundownItem => {
  return !!(
    item &&
    typeof item === 'object' &&
    item.id &&
    typeof item.id === 'string' &&
    item.type &&
    (item.type === 'regular' || item.type === 'header')
  );
};

export const validateRundownItems = (items: any[]): RundownItem[] => {
  if (!Array.isArray(items)) return [];
  return items.filter(validateRundownItem);
};

export const validateColumn = (column: any): column is Column => {
  return !!(
    column &&
    typeof column === 'object' &&
    column.id &&
    column.key &&
    column.name &&
    typeof column.isVisible === 'boolean' &&
    typeof column.isCustom === 'boolean'
  );
};

export const validateColumns = (columns: any[]): Column[] => {
  if (!Array.isArray(columns)) return [];
  return columns.filter(validateColumn);
};

export const sanitizeString = (str: any): string => {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, 1000); // Limit length for security
};

export const sanitizeNumber = (num: any, fallback: number = 0): number => {
  const parsed = parseFloat(num);
  return isNaN(parsed) ? fallback : parsed;
};

export const sanitizeBoolean = (bool: any, fallback: boolean = false): boolean => {
  if (typeof bool === 'boolean') return bool;
  if (typeof bool === 'string') return bool.toLowerCase() === 'true';
  return fallback;
};
