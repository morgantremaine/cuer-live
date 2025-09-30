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
 * Creates a unified content signature for change detection and autosave.
 * This ensures both useChangeTracking and useSimpleAutoSave use identical logic.
 */
export const createUnifiedContentSignature = (data: ContentSignatureData): string => {
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

  // Create signature with all relevant fields
  const signature = JSON.stringify({
    items: cleanItems,
    title: data.title || '',
    columns: data.columns || [],
    timezone: data.timezone || '',
    startTime: data.startTime || '',
    showDate: data.showDate ? 
      `${data.showDate.getFullYear()}-${String(data.showDate.getMonth() + 1).padStart(2, '0')}-${String(data.showDate.getDate()).padStart(2, '0')}` 
      : null,
    externalNotes: data.externalNotes || ''
  });
  
  return signature;
};

/**
 * Lightweight signature for performance with large rundowns (200+ items)
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
    startTime: data.startTime || '',
    timezone: data.timezone || '',
    showDate: data.showDate ? 
      `${data.showDate.getFullYear()}-${String(data.showDate.getMonth() + 1).padStart(2, '0')}-${String(data.showDate.getDate()).padStart(2, '0')}` 
      : null,
    externalNotes: data.externalNotes || '',
    columnCount: data.columns?.length || 0,
    checksum: contentHash.length > 1000 ? 
      // For very long content, use a simple hash
      contentHash.split('').reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0) 
      : contentHash
  });
};