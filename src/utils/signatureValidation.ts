/**
 * Development-only validation to ensure all signature systems are consistent
 */

import { createContentSignature } from './contentSignature';
import { RundownItem } from '@/types/rundown';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates that all signature creation methods produce identical results
 */
export const validateSignatureConsistency = (
  items: RundownItem[],
  title: string
): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  try {
    // Create signatures using the standardized content-only method
    const contentSignature1 = createContentSignature({
      items,
      title,
      columns: [], // Should not affect content signature
      timezone: 'America/New_York', // Should not affect content signature
      startTime: '09:00:00', // Should not affect content signature
      showDate: null,
      externalNotes: ''
    });

    const contentSignature2 = createContentSignature({
      items,
      title,
      columns: [{ id: 'test', key: 'test', name: 'Test', isVisible: true, isCustom: false, width: '100px', isEditable: false }], // Different columns
      timezone: 'UTC', // Different timezone
      startTime: '12:00:00', // Different start time
      showDate: new Date('2024-01-01'), // Different date
      externalNotes: 'test notes' // Different notes
    });

    // These should be IDENTICAL for content-only signatures
    if (contentSignature1 !== contentSignature2) {
      result.isValid = false;
      result.errors.push(
        `Content signatures differ when they should be identical. ` +
        `This indicates columns, timezone, or startTime are affecting content signatures.`
      );
    }

    // Test with different content - these SHOULD be different
    const modifiedItems = items.map((item, index) => 
      index === 0 ? { ...item, name: item.name + ' MODIFIED' } : item
    );

    const contentSignature3 = createContentSignature({
      items: modifiedItems,
      title,
      columns: [],
      timezone: '',
      startTime: '',
      showDate: null,
      externalNotes: ''
    });

    if (contentSignature1 === contentSignature3) {
      result.isValid = false;
      result.errors.push(
        `Content signatures are identical when content has changed. ` +
        `This indicates the signature is not detecting content changes properly.`
      );
    }

    // Test with different title
    const contentSignature4 = createContentSignature({
      items,
      title: title + ' MODIFIED',
      columns: [],
      timezone: '',
      startTime: '',
      showDate: null,
      externalNotes: ''
    });

    if (contentSignature1 === contentSignature4) {
      result.isValid = false;
      result.errors.push(
        `Content signatures are identical when title has changed. ` +
        `This indicates the signature is not detecting title changes properly.`
      );
    }

  } catch (error) {
    result.isValid = false;
    result.errors.push(`Signature validation failed with error: ${error}`);
  }

  return result;
};

/**
 * Run validation in development mode only
 */
export const runSignatureValidation = (items: RundownItem[], title: string) => {
  if (process.env.NODE_ENV !== 'development') return;
  
  const result = validateSignatureConsistency(items, title);
  
  if (!result.isValid) {
    console.group('🚨 SIGNATURE VALIDATION FAILED');
    result.errors.forEach(error => console.error('❌', error));
    result.warnings.forEach(warning => console.warn('⚠️', warning));
    console.groupEnd();
  } else {
    console.log('✅ Signature validation passed - all systems are consistent');
  }
  
  return result;
};