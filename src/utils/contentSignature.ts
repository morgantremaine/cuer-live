import { RundownItem } from '@/types/rundown';
import { Column } from '@/types/columns';

interface ContentSignatureData {
  items: RundownItem[];
  title: string;
  columns?: Column[];
  timezone?: string;
  startTime?: string;
  showDate?: Date | null;
  externalNotes?: string;
}

/**
 * Creates a content-only signature for change detection and autosave.
 * This excludes UI preferences like columns, timezone, and startTime.
 */
export const createContentSignature = (data: ContentSignatureData): string => {
  // Clean items with consistent field handling
  const cleanItems = (data.items || []).map(item => {
    const cleanItem: any = {
      // Core identification
      id: item.id,
      type: item.type,
      
      // Content fields
      name: item.name || '',
      talent: item.talent || '',
      script: item.script || '',
      gfx: item.gfx || '',
      video: item.video || '',
      images: item.images || '',
      notes: item.notes || '',
      
      // Timing and layout
      duration: item.duration || '',
      startTime: item.startTime || '',
      endTime: item.endTime || '',
      
      // Visual and structure
      color: item.color || '',
      isFloating: Boolean(item.isFloating),
      isFloated: Boolean(item.isFloated),
      
      // Custom data
      customFields: item.customFields || {},
      segmentName: item.segmentName || '',
      rowNumber: item.rowNumber || 0
    };
    
    return cleanItem;
  });

  // Create signature with ONLY content fields (excludes columns, timezone, startTime)
  const signature = JSON.stringify({
    items: cleanItems,
    title: data.title || '',
    showDate: data.showDate ? 
      `${data.showDate.getFullYear()}-${String(data.showDate.getMonth() + 1).padStart(2, '0')}-${String(data.showDate.getDate()).padStart(2, '0')}` 
      : null,
    externalNotes: data.externalNotes || ''
  });
  
  return signature;
};

/**
 * Creates a UI preferences signature for tracking column changes, timezone, etc.
 */
export const createUIPreferencesSignature = (data: ContentSignatureData): string => {
  const signature = JSON.stringify({
    columns: data.columns || [],
    timezone: data.timezone || '',
    startTime: data.startTime || ''
  });
  
  return signature;
};

/**
 * @deprecated Use createContentSignature instead. This function includes columns
 * which causes signature mismatches between change tracking and autosave.
 */
export const createUnifiedContentSignature = (data: ContentSignatureData): string => {
  console.warn('createUnifiedContentSignature is deprecated. Use createContentSignature for content-only tracking.');
  return createContentSignature(data);
};

/**
 * Lightweight content-only signature for performance with large rundowns (200+ items)
 */
export const createLightweightContentSignature = (data: ContentSignatureData): string => {
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