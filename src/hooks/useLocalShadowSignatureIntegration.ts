import { useCallback } from 'react';
import { createContentSignature } from '@/utils/contentSignature';
import { localShadowStore } from '@/state/localShadows';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/types/columns';

/**
 * Integration between LocalShadow system and unified content signatures
 * Ensures that shadow-protected data maintains signature consistency
 */
export const useLocalShadowSignatureIntegration = () => {
  
  // Create signature with LocalShadow protection applied
  const createShadowProtectedSignature = useCallback((
    items: RundownItem[],
    title: string,
    columns: Column[],
    timezone: string = '',
    startTime: string = '',
    showDate: Date | null = null,
    externalNotes: any = ''
  ): string => {
    // Apply active shadows to the data before creating signature
    const baseData = {
      items,
      title,
      start_time: startTime,
      timezone,
      show_date: showDate,
      external_notes: externalNotes
    };
    
    const shadowProtectedData = localShadowStore.applyShadowsToData(baseData);
    
    return createContentSignature({
      items: shadowProtectedData.items || items,
      title: shadowProtectedData.title || title,
      columns,
      timezone: shadowProtectedData.timezone || timezone,
      startTime: shadowProtectedData.start_time || startTime,
      showDate: shadowProtectedData.show_date || showDate,
      externalNotes: shadowProtectedData.external_notes || externalNotes
    });
  }, []);

  // Check if shadows would affect signature calculation
  const wouldShadowsAffectSignature = useCallback((
    items: RundownItem[],
    title: string
  ): boolean => {
    const activeShadows = localShadowStore.getActiveShadows();
    
    // Check global shadows that affect content
    if (activeShadows.globals.has('title')) {
      return true;
    }
    
    // Check item shadows that affect content
    for (const [itemId, itemShadows] of activeShadows.items) {
      const item = items.find(i => i.id === itemId);
      if (item && Object.keys(itemShadows).length > 0) {
        return true;
      }
    }
    
    return false;
  }, []);

  // Validate that LocalShadow integration doesn't break signature consistency
  const validateShadowSignatureConsistency = useCallback((
    originalSignature: string,
    shadowProtectedSignature: string,
    context: string
  ): { isConsistent: boolean; explanation: string } => {
    const activeShadows = localShadowStore.getActiveShadows();
    const hasActiveShadows = activeShadows.items.size > 0 || activeShadows.globals.size > 0;
    
    if (!hasActiveShadows && originalSignature !== shadowProtectedSignature) {
      return {
        isConsistent: false,
        explanation: `Signatures differ with no active shadows in ${context}. This indicates a LocalShadow integration bug.`
      };
    }
    
    if (hasActiveShadows && originalSignature === shadowProtectedSignature) {
      return {
        isConsistent: false,
        explanation: `Signatures identical despite active shadows in ${context}. LocalShadow protection may not be working.`
      };
    }
    
    return {
      isConsistent: true,
      explanation: hasActiveShadows 
        ? `Signatures correctly differ due to active LocalShadow protection in ${context}`
        : `Signatures correctly match with no active shadows in ${context}`
    };
  }, []);

  return {
    createShadowProtectedSignature,
    wouldShadowsAffectSignature,
    validateShadowSignatureConsistency
  };
};