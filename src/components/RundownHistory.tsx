import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import TextDiffDisplay from './TextDiffDisplay';

// Color value to name mapping
const COLOR_NAMES: Record<string, string> = {
  '': 'Default',
  '#fca5a5': 'Red',
  '#fdba74': 'Orange', 
  '#fde047': 'Yellow',
  '#86efac': 'Green',
  '#93c5fd': 'Blue',
  '#c4b5fd': 'Purple',
  '#f9a8d4': 'Pink',
  '#d1d5db': 'Gray'
};

// Rundown-level field identifiers
const RUNDOWN_LEVEL_FIELDS = [
  'title', 'startTime', 'endTime', 'timezone', 'showDate', 
  'externalNotes', 'numberingLocked', 'lockedRowNumbers'
];

// Rundown-level field display names
const RUNDOWN_FIELD_DISPLAY_NAMES: Record<string, string> = {
  title: 'Rundown Title',
  startTime: 'Start Time',
  endTime: 'End Time',
  timezone: 'Time Zone',
  showDate: 'Show Date',
  externalNotes: 'External Notes',
  numberingLocked: 'Row Numbering Lock',
  lockedRowNumbers: 'Locked Row Numbers'
};

// Built-in field name mappings for row-level fields
const FIELD_DISPLAY_NAMES: Record<string, string> = {
  name: 'Segment Name',
  startTime: 'Start Time',
  duration: 'Duration',
  endTime: 'End Time',
  elapsedTime: 'Elapsed Time',
  talent: 'Talent',
  script: 'Script',
  gfx: 'GFX',
  video: 'Video',
  images: 'Images',
  notes: 'Notes',
  color: 'Color',
  rowNumber: 'Row Number',
  type: 'Type'
};

interface HistoryEntry {
  batch_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  operation_types: string[];
  summary: string;
  first_operation: string;
  last_operation: string;
  operation_count: number;
  details: Array<{
    id: string;
    operation_type: string;
    operation_data: any;
    created_at: string;
  }>;
}

interface RundownHistoryProps {
  rundownId: string;
}

const RundownHistory = ({ rundownId }: RundownHistoryProps) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [rundownItems, setRundownItems] = useState<any[]>([]);
  const [customColumnNames, setCustomColumnNames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchHistory();
    
    // Fetch rundown items and columns for row number lookup and custom column names
    const fetchRundownItems = async () => {
      const { data, error } = await supabase
        .from('rundowns')
        .select('items, columns, team_id')
        .eq('id', rundownId)
        .single();
      
      if (!error && data) {
        if (data.items) {
          setRundownItems(data.items);
        }
        
        // Build custom column name mapping from rundown columns
        if (data.columns) {
          const columnMapping: Record<string, string> = {};
          data.columns.forEach((col: any) => {
            if (col.isCustom && col.key) {
              columnMapping[col.key] = col.name;
            }
          });
          setCustomColumnNames(columnMapping);
        }
        
        // Also fetch team custom columns as fallback
        if (data.team_id) {
          const { data: teamColumns } = await supabase.rpc('get_team_custom_columns', {
            team_uuid: data.team_id
          });
          
          if (teamColumns) {
            teamColumns.forEach((col: any) => {
              if (!customColumnNames[col.column_key]) {
                customColumnNames[col.column_key] = col.column_name;
              }
            });
            setCustomColumnNames(prev => ({ ...prev, ...customColumnNames }));
          }
        }
      }
    };
    fetchRundownItems();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('rundown-operations-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rundown_operations',
          filter: `rundown_id=eq.${rundownId}`
        },
        () => {
          // Refresh history when new operations are added
          fetchHistory(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rundownId]);

  const fetchHistory = async (reset = false) => {
    try {
      setLoading(true);
      const currentOffset = reset ? 0 : offset;

      const { data, error } = await supabase.rpc('get_batched_rundown_history', {
        target_rundown_id: rundownId,
        batch_window_seconds: 30,
        limit_batches: 50,
        offset_batches: currentOffset
      });

      if (error) throw error;

      if (reset) {
        setHistory(data || []);
        setOffset(0);
      } else {
        setHistory(prev => [...prev, ...(data || [])]);
      }

      setHasMore((data || []).length === 50);
    } catch (error) {
      console.error('Error fetching rundown history:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    setOffset(prev => prev + 50);
    fetchHistory();
  };

  const getRowNumber = (itemId: string): string => {
    const item = rundownItems.find((i: any) => i.id === itemId);
    if (!item) return 'Unknown';
    
    // Try locked/manual row number first
    if (item.rowNumber) return item.rowNumber;
    
    // Try calculated row number
    if (item.calculatedRowNumber) return item.calculatedRowNumber;
    
    // Fall back to array index (1-based, skip headers)
    const index = rundownItems.findIndex((i: any) => i.id === itemId);
    if (index >= 0) {
      // Count only non-header items before this one
      const nonHeadersBefore = rundownItems
        .slice(0, index)
        .filter((i: any) => i.type !== 'header').length;
      return `${nonHeadersBefore + 1}`;
    }
    
    return 'New Row';
  };

  const toggleBatch = (batchId: string) => {
    setExpandedBatches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(batchId)) {
        newSet.delete(batchId);
      } else {
        newSet.add(batchId);
      }
      return newSet;
    });
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return timestamp;
    }
  };

  // Helper to check if a field is rundown-level
  const isRundownLevelField = (field: string): boolean => {
    return RUNDOWN_LEVEL_FIELDS.includes(field);
  };

  // Helper to check if an operation is rundown-level
  const isRundownLevelChange = (itemId: string | null | undefined, field: string): boolean => {
    return !itemId || isRundownLevelField(field);
  };

  // Helper to convert field key to display name
  const getFieldDisplayName = (field: string, isRundownLevel: boolean = false): string | null => {
    // Skip the parent customFields object entirely
    if (field === 'customFields') return null;
    
    // Handle customFields.custom_xxx
    if (field.startsWith('customFields.')) {
      const customKey = field.replace('customFields.', '');
      return customColumnNames[customKey] || customKey;
    }
    
    // Handle rundown-level fields
    if (isRundownLevel || isRundownLevelField(field)) {
      return RUNDOWN_FIELD_DISPLAY_NAMES[field] || field;
    }
    
    // Handle built-in fields
    return FIELD_DISPLAY_NAMES[field] || field;
  };

  // Helper to safely render any value as a string
  const renderValue = (value: any, fieldName?: string): string => {
    // Handle color field specially
    if (fieldName === 'color' && typeof value === 'string') {
      return COLOR_NAMES[value.toLowerCase()] || value || 'Default';
    }
    
    // Handle date fields - format nicely without time
    if (fieldName === 'showDate' && value) {
      try {
        // Handle both ISO strings and date-only strings
        const dateStr = typeof value === 'string' ? value : String(value);
        // Extract just the date portion if it's an ISO string
        const dateOnly = dateStr.split('T')[0];
        const date = parseISO(dateOnly);
        return format(date, 'MMM d, yyyy'); // e.g., "Dec 2, 2025"
      } catch {
        return value || '(empty)';
      }
    }
    
    if (value === null || value === undefined) return '(empty)';
    if (typeof value === 'string') return value || '(empty)';
    if (typeof value === 'object') {
      // For custom column objects like { custom_xxx: "value" }, extract the value
      const keys = Object.keys(value);
      if (keys.length === 1) {
        return String(value[keys[0]] || '(empty)');
      }
      // For complex objects, stringify them
      return JSON.stringify(value);
    }
    return String(value);
  };

  // Helper to determine if text is "long" (needs diff display)
  const isLongText = (value: any): boolean => {
    if (typeof value !== 'string') return false;
    return value.length > 60;
  };

  // Helper to truncate text for summaries
  const truncateText = (text: string, maxLength: number = 50): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const generateDetailedSummary = (entry: HistoryEntry): string => {
    if (!entry.details || entry.details.length === 0) {
      return entry.summary;
    }

    // Collect edits, separating rundown-level and row-level
    const editsByItem = new Map<string, Map<string, { first: any, last: any }>>();
    const rundownLevelEdits = new Map<string, { first: any, last: any }>();
    let rowsAdded = 0;
    let rowsDeleted = 0;

    entry.details.forEach((op: any) => {
      if (op.operation_type === 'cell_edit' && op.operation_data?.fieldUpdates) {
        const updates = Array.isArray(op.operation_data.fieldUpdates) 
          ? op.operation_data.fieldUpdates 
          : [];
        
        updates.forEach((update: any) => {
          const { itemId, field, oldValue, newValue } = update;
          
          // Check if this is a rundown-level change
          if (isRundownLevelChange(itemId, field)) {
            if (!rundownLevelEdits.has(field)) {
              rundownLevelEdits.set(field, { first: oldValue, last: newValue });
            } else {
              const existing = rundownLevelEdits.get(field)!;
              rundownLevelEdits.set(field, { first: existing.first, last: newValue });
            }
          } else {
            // Row-level change
            if (!editsByItem.has(itemId)) {
              editsByItem.set(itemId, new Map());
            }
            
            const itemEdits = editsByItem.get(itemId)!;
            
            if (!itemEdits.has(field)) {
              itemEdits.set(field, { first: oldValue, last: newValue });
            } else {
              const existing = itemEdits.get(field)!;
              itemEdits.set(field, { first: existing.first, last: newValue });
            }
          }
        });
      } else if (op.operation_type === 'add_row') {
        rowsAdded++;
      } else if (op.operation_type === 'delete_row') {
        rowsDeleted++;
      }
    });

    // Build summary parts
    const parts: string[] = [];
    
    // Handle rundown-level edits
    if (rundownLevelEdits.size > 0) {
      const rundownFields = Array.from(rundownLevelEdits.keys())
        .map(field => getFieldDisplayName(field, true))
        .filter(Boolean);
      
      if (rundownFields.length === 1) {
        const field = Array.from(rundownLevelEdits.keys())[0];
        const values = rundownLevelEdits.get(field)!;
        const displayName = getFieldDisplayName(field, true) || field;
        const fromValue = renderValue(values.first, field);
        const toValue = renderValue(values.last, field);
        
        if (isLongText(fromValue) || isLongText(toValue)) {
          parts.push(`Changed '${displayName}'`);
        } else {
          parts.push(`Changed '${displayName}' from '${fromValue}' to '${toValue}'`);
        }
      } else {
        const fieldList = rundownFields.slice(0, 3).map(f => `'${f}'`).join(', ');
        parts.push(`Changed ${fieldList}`);
      }
    }
    
    // Handle row-level edits
    if (editsByItem.size > 0) {
      const allFields = new Set<string>();
      editsByItem.forEach(fields => {
        fields.forEach((_, field) => {
          const displayName = getFieldDisplayName(field);
          if (displayName) allFields.add(displayName);
        });
      });
      
      const fieldList = Array.from(allFields).slice(0, 3).map(f => `'${f}'`).join(', ');
      
      if (editsByItem.size === 1) {
        const [itemId] = Array.from(editsByItem.keys());
        const rowNum = getRowNumber(itemId);
        const itemFields = editsByItem.get(itemId)!;
        
        const validFields = Array.from(itemFields.entries()).filter(([field]) => 
          getFieldDisplayName(field) !== null
        );
        
        if (validFields.length === 1) {
          const [field, values] = validFields[0];
          const displayName = getFieldDisplayName(field) || field;
          const fromValue = renderValue(values.first, field);
          const toValue = renderValue(values.last, field);
          
          if (isLongText(fromValue) || isLongText(toValue)) {
            parts.push(`Row ${rowNum}: ${displayName} changed`);
          } else {
            parts.push(`Row ${rowNum}: '${displayName}' changed from '${fromValue}' to '${toValue}'`);
          }
        } else if (validFields.length > 1) {
          parts.push(`Row ${rowNum}: Edited ${fieldList}`);
        }
      } else if (allFields.size > 0) {
        parts.push(`Edited ${fieldList} in ${editsByItem.size} rows`);
      }
    }
    
    if (rowsAdded > 0) {
      parts.push(`Added ${rowsAdded} row${rowsAdded > 1 ? 's' : ''}`);
    }
    
    if (rowsDeleted > 0) {
      parts.push(`Deleted ${rowsDeleted} row${rowsDeleted > 1 ? 's' : ''}`);
    }

    return parts.length > 0 ? parts.join(' • ') : entry.summary;
  };

  const renderOperationDetails = (details: HistoryEntry['details']) => {
    if (!details || details.length === 0) return null;

    // Separate rundown-level and row-level edits
    const editsByItem = new Map<string, Map<string, { first: any, last: any }>>();
    const rundownLevelEdits = new Map<string, { first: any, last: any }>();
    const addedRows: any[] = [];
    const deletedRows: any[] = [];

    details.forEach((op: any) => {
      if (op.operation_type === 'cell_edit' && op.operation_data?.fieldUpdates) {
        const updates = Array.isArray(op.operation_data.fieldUpdates) 
          ? op.operation_data.fieldUpdates 
          : [];
        
        updates.forEach((update: any) => {
          const { itemId, field, oldValue, newValue } = update;
          
          if (isRundownLevelChange(itemId, field)) {
            // Rundown-level change
            if (!rundownLevelEdits.has(field)) {
              rundownLevelEdits.set(field, { first: oldValue, last: newValue });
            } else {
              const existing = rundownLevelEdits.get(field)!;
              rundownLevelEdits.set(field, { first: existing.first, last: newValue });
            }
          } else {
            // Row-level change
            if (!editsByItem.has(itemId)) {
              editsByItem.set(itemId, new Map());
            }
            
            const itemEdits = editsByItem.get(itemId)!;
            
            if (!itemEdits.has(field)) {
              itemEdits.set(field, { first: oldValue, last: newValue });
            } else {
              const existing = itemEdits.get(field)!;
              itemEdits.set(field, { first: existing.first, last: newValue });
            }
          }
        });
      } else if (op.operation_type === 'add_row') {
        addedRows.push(op);
      } else if (op.operation_type === 'delete_row') {
        deletedRows.push(op);
      }
    });

    return (
      <div className="mt-3 space-y-3 text-sm">
        {/* Show rundown-level edits */}
        {rundownLevelEdits.size > 0 && (
          <div className="pl-4 border-l-2 border-purple-500">
            <div className="font-medium text-muted-foreground mb-1">
              Rundown Settings
            </div>
            {Array.from(rundownLevelEdits.entries()).map(([field, values]) => {
              const displayName = getFieldDisplayName(field, true);
              if (!displayName) return null;
              
              const oldValueStr = renderValue(values.first, field);
              const newValueStr = renderValue(values.last, field);
              
              // Use TextDiffDisplay for long text
              if (isLongText(oldValueStr) || isLongText(newValueStr)) {
                return (
                  <TextDiffDisplay
                    key={field}
                    fieldName={displayName}
                    oldValue={oldValueStr}
                    newValue={newValueStr}
                    defaultCollapsed={true}
                  />
                );
              }
              
              // Regular inline display for short text
              return (
                <div key={field} className="ml-2 text-xs">
                  <span className="font-mono text-primary">{displayName}:</span>
                  {' '}
                  <span className="text-muted-foreground">
                    {oldValueStr}
                  </span>
                  {' → '}
                  <span className="text-foreground">
                    {newValueStr}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Show collapsed edits by row */}
        {Array.from(editsByItem.entries()).map(([itemId, fields]) => {
          const rowNum = getRowNumber(itemId);
          return (
            <div key={itemId} className="pl-4 border-l-2 border-blue-500">
              <div className="font-medium text-muted-foreground mb-1">
                Row {rowNum}
              </div>
              {Array.from(fields.entries()).map(([field, values]) => {
                const displayName = getFieldDisplayName(field);
                // Skip customFields parent object
                if (!displayName) return null;
                
                const oldValueStr = renderValue(values.first, field);
                const newValueStr = renderValue(values.last, field);
                
                // Use TextDiffDisplay for long text
                if (isLongText(oldValueStr) || isLongText(newValueStr)) {
                  return (
                    <TextDiffDisplay
                      key={field}
                      fieldName={displayName}
                      oldValue={oldValueStr}
                      newValue={newValueStr}
                      defaultCollapsed={true}
                    />
                  );
                }
                
                // Regular inline display for short text
                return (
                  <div key={field} className="ml-2 text-xs">
                    <span className="font-mono text-primary">{displayName}:</span>
                    {' '}
                    <span className="text-muted-foreground">
                      {oldValueStr}
                    </span>
                    {' → '}
                    <span className="text-foreground">
                      {newValueStr}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
        
        {/* Show added rows */}
        {addedRows.map((op, idx) => (
          <div key={`add-${idx}`} className="pl-4 border-l-2 border-green-500">
            <div className="font-medium text-green-600">Added Row</div>
            {op.operation_data?.newItems && (
              <div className="ml-2 text-xs text-muted-foreground">
                {op.operation_data.newItems.length} item(s)
              </div>
            )}
          </div>
        ))}
        
        {/* Show deleted rows */}
        {deletedRows.map((op, idx) => (
          <div key={`del-${idx}`} className="pl-4 border-l-2 border-red-500">
            <div className="font-medium text-red-600">Deleted Row</div>
            {op.operation_data?.deletedItems && (
              <div className="ml-2 text-xs text-muted-foreground">
                {op.operation_data.deletedItems.length} item(s)
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading && history.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <p className="text-muted-foreground">No history yet</p>
        <p className="text-sm text-muted-foreground mt-2">
          Changes to this rundown will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">History</h2>
        <p className="text-sm text-muted-foreground">
          Recent changes to this rundown
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {history.map((entry) => {
            const isExpanded = expandedBatches.has(entry.batch_id);

            return (
              <div
                key={entry.batch_id}
                className="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm truncate">
                      {entry.user_name}
                    </p>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimestamp(entry.first_operation)}
                    </p>
                  </div>

                  <p className="text-sm text-muted-foreground mt-1">
                    {generateDetailedSummary(entry)}
                  </p>

                  {entry.operation_count > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 mt-2 text-xs hover:bg-transparent"
                      onClick={() => toggleBatch(entry.batch_id)}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-3 w-3 mr-1" />
                          Hide details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 mr-1" />
                          Show details ({entry.operation_count} operations)
                        </>
                      )}
                    </Button>
                  )}

                  {isExpanded && renderOperationDetails(entry.details)}
                </div>
              </div>
            );
          })}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load more'
                )}
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default RundownHistory;
