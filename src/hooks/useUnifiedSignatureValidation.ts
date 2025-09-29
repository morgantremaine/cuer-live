import { useCallback } from 'react';
import { createContentSignature } from '@/utils/contentSignature';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/types/columns';

interface ValidationContext {
  source: 'autosave' | 'manual-save' | 'undo' | 'blueprint' | 'conflict-resolution' | 'localshadow' | 'realtime';
  location: string;
}

interface SignatureValidationResult {
  isValid: boolean;
  expectedSignature: string;
  actualSignature: string;
  errors: string[];
  warnings: string[];
}

/**
 * Unified signature validation to ensure all systems use consistent content signatures
 * This helps identify and prevent signature mismatches that cause false saves and data loss
 */
export const useUnifiedSignatureValidation = () => {
  
  // Validate that a signature was created correctly
  const validateSignature = useCallback((
    items: RundownItem[],
    title: string,
    columns: Column[],
    actualSignature: string,
    context: ValidationContext
  ): SignatureValidationResult => {
    const expectedSignature = createContentSignature({
      items,
      title,
      columns,
      timezone: '',
      startTime: '',
      showDate: null,
      externalNotes: ''
    });

    const result: SignatureValidationResult = {
      isValid: expectedSignature === actualSignature,
      expectedSignature,
      actualSignature,
      errors: [],
      warnings: []
    };

    if (!result.isValid) {
      result.errors.push(
        `Signature mismatch in ${context.source} at ${context.location}. ` +
        `Expected: ${expectedSignature.slice(0, 50)}..., ` +
        `Got: ${actualSignature.slice(0, 50)}...`
      );
      
      console.error('🚨 SIGNATURE VALIDATION FAILED:', {
        context,
        expected: expectedSignature.slice(0, 100),
        actual: actualSignature.slice(0, 100),
        itemCount: items.length,
        titleLength: title.length,
        columnCount: columns.length
      });
    }

    return result;
  }, []);

  // Validate that two signatures match (for consistency checks)
  const validateSignatureConsistency = useCallback((
    signature1: string,
    signature2: string,
    context1: ValidationContext,
    context2: ValidationContext
  ): SignatureValidationResult => {
    const result: SignatureValidationResult = {
      isValid: signature1 === signature2,
      expectedSignature: signature1,
      actualSignature: signature2,
      errors: [],
      warnings: []
    };

    if (!result.isValid) {
      result.errors.push(
        `Signature inconsistency between ${context1.source} and ${context2.source}. ` +
        `Locations: ${context1.location} vs ${context2.location}`
      );
      
      console.error('🚨 SIGNATURE CONSISTENCY FAILED:', {
        context1,
        context2,
        signature1: signature1.slice(0, 100),
        signature2: signature2.slice(0, 100)
      });
    }

    return result;
  }, []);

  // Check if a signature was created using deprecated methods
  const validateNotDeprecated = useCallback((
    signature: string,
    context: ValidationContext
  ): SignatureValidationResult => {
    const result: SignatureValidationResult = {
      isValid: true,
      expectedSignature: signature,
      actualSignature: signature,
      errors: [],
      warnings: []
    };

    // Check for signs of deprecated signature creation
    if (signature.includes('"columns":') && context.source !== 'conflict-resolution') {
      result.warnings.push(
        `Possible deprecated signature detected in ${context.source} at ${context.location}. ` +
        `Content signatures should exclude columns for consistency.`
      );
      
      console.warn('⚠️ DEPRECATED SIGNATURE PATTERN:', {
        context,
        signaturePreview: signature.slice(0, 100)
      });
    }

    return result;
  }, []);

  return {
    validateSignature,
    validateSignatureConsistency,
    validateNotDeprecated
  };
};