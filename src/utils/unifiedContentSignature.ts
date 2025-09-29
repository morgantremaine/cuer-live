import { RundownItem } from '@/types/rundown';
import { Column } from '@/types/columns';

interface UnifiedSignatureData {
  items: RundownItem[];
  title: string;
  columns?: Column[];
  timezone?: string;
  startTime?: string;
  showDate?: Date | null;
  externalNotes?: string;
}

/**
 * UNIFIED content signature system - replaces multiple inconsistent signature functions
 * Single source of truth for what constitutes "content" vs "UI preferences"
 */

// Define exactly what fields are considered "content" vs "UI preferences"
const CONTENT_FIELDS = ['items', 'title', 'showDate', 'externalNotes'] as const;
const UI_PREFERENCE_FIELDS = ['columns', 'timezone', 'startTime'] as const;

/**
 * Creates a content-only signature for change detection.
 * ONLY includes fields that represent actual rundown content.
 */
export const createUnifiedContentSignature = (data: UnifiedSignatureData): string => {
  // Clean items with consistent field handling
  const cleanItems = (data.items || []).map(item => {
    return {
      // Core identification
      id: item.id,
      type: item.type,
      
      // Content fields that users edit
      name: item.name || '',
      talent: item.talent || '',
      script: item.script || '',
      gfx: item.gfx || '',
      video: item.video || '',
      images: item.images || '',
      notes: item.notes || '',
      
      // Timing (part of content)
      duration: item.duration || '',
      startTime: item.startTime || '',
      endTime: item.endTime || '',
      
      // Visual and structure (part of content)
      color: item.color || '',
      isFloating: Boolean(item.isFloating),
      isFloated: Boolean(item.isFloated),
      
      // Custom data (part of content)
      customFields: item.customFields || {},
      segmentName: item.segmentName || '',
      rowNumber: item.rowNumber || 0
    };
  });

  // Create signature with ONLY content fields
  const signature = JSON.stringify({
    items: cleanItems,
    title: data.title || '',
    showDate: data.showDate ? 
      `${data.showDate.getFullYear()}-${String(data.showDate.getMonth() + 1).padStart(2, '0')}-${String(data.showDate.getDate()).padStart(2, '0')}` 
      : null,
    externalNotes: data.externalNotes || ''
  });
  
  // Development logging
  if (process.env.NODE_ENV === 'development') {
    console.log('🔐 UNIFIED CONTENT SIGNATURE:', {
      itemCount: cleanItems.length,
      title: data.title || '',
      signatureLength: signature.length,
      includedFields: CONTENT_FIELDS,
      excludedFields: UI_PREFERENCE_FIELDS
    });
  }
  
  return signature;
};

/**
 * Creates a UI preferences signature for tracking user interface changes.
 * ONLY includes fields that represent UI preferences.
 */
export const createUIPreferencesSignature = (data: UnifiedSignatureData): string => {
  const signature = JSON.stringify({
    columns: data.columns || [],
    timezone: data.timezone || '',
    startTime: data.startTime || ''
  });
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🎨 UI PREFERENCES SIGNATURE:', {
      hasColumns: Boolean(data.columns?.length),
      timezone: data.timezone || '',
      startTime: data.startTime || '',
      signatureLength: signature.length
    });
  }
  
  return signature;
};

/**
 * Creates a full signature including both content and UI preferences.
 * Use only when you need to detect ANY change.
 */
export const createFullSignature = (data: UnifiedSignatureData): string => {
  const contentSig = createUnifiedContentSignature(data);
  const uiSig = createUIPreferencesSignature(data);
  
  return JSON.stringify({
    content: contentSig,
    ui: uiSig
  });
};

/**
 * Lightweight signature for large rundowns (200+ items)
 * Uses checksums to reduce memory usage while maintaining accuracy
 */
export const createLightweightContentSignature = (data: UnifiedSignatureData): string => {
  const itemCount = data.items?.length || 0;
  
  // Create content hash for change detection
  const contentHash = data.items?.map(item => 
    `${item.id}:${item.name || ''}:${item.talent || ''}:${item.script || ''}:${item.gfx || ''}:${item.video || ''}:${item.images || ''}:${item.notes || ''}:${item.duration || ''}:${item.color || ''}`
  ).join('|') || '';
  
  return JSON.stringify({
    itemCount,
    itemIds: data.items?.map(item => item.id) || [],
    title: data.title || '',
    showDate: data.showDate ? 
      `${data.showDate.getFullYear()}-${String(data.showDate.getMonth() + 1).padStart(2, '0')}-${String(data.showDate.getDate()).padStart(2, '0')}` 
      : null,
    externalNotes: data.externalNotes || '',
    checksum: contentHash.length > 1000 ? 
      // For very long content, use a simple hash
      contentHash.split('').reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0) 
      : contentHash
  });
};

/**
 * Determines if a field change should trigger content change detection
 */
export const isContentField = (fieldName: string): boolean => {
  // Item-level content fields
  const itemContentFields = [
    'name', 'talent', 'script', 'gfx', 'video', 'images', 'notes',
    'duration', 'startTime', 'endTime', 'color', 'isFloating', 'isFloated',
    'customFields', 'segmentName', 'rowNumber'
  ];
  
  // Global content fields
  const globalContentFields = ['title', 'showDate', 'externalNotes'];
  
  return itemContentFields.includes(fieldName) || globalContentFields.includes(fieldName);
};

/**
 * Determines if a field change should trigger UI preferences change detection
 */
export const isUIPreferenceField = (fieldName: string): boolean => {
  return UI_PREFERENCE_FIELDS.includes(fieldName as any);
};

// Export the field categorization for use by other systems
export { CONTENT_FIELDS, UI_PREFERENCE_FIELDS };