import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface HistoryEntry {
  batch_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  profile_picture_url: string | null;
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

  useEffect(() => {
    fetchHistory();
    
    // Fetch rundown items for row number lookup
    const fetchRundownItems = async () => {
      const { data, error } = await supabase
        .from('rundowns')
        .select('items')
        .eq('id', rundownId)
        .single();
      
      if (!error && data?.items) {
        setRundownItems(data.items);
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
    return item?.rowNumber || item?.calculatedRowNumber || '?';
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

  const generateDetailedSummary = (entry: HistoryEntry): string => {
    if (!entry.details || entry.details.length === 0) {
      return entry.summary;
    }

    // Collect all edits, grouping by field and itemId
    const editsByItem = new Map<string, Map<string, { first: any, last: any }>>();
    let rowsAdded = 0;
    let rowsDeleted = 0;

    entry.details.forEach((op: any) => {
      if (op.operation_type === 'cell_edit' && op.operation_data?.fieldUpdates) {
        // fieldUpdates is an ARRAY, not an object
        const updates = Array.isArray(op.operation_data.fieldUpdates) 
          ? op.operation_data.fieldUpdates 
          : [];
        
        updates.forEach((update: any) => {
          const { itemId, field, oldValue, newValue } = update;
          
          if (!editsByItem.has(itemId)) {
            editsByItem.set(itemId, new Map());
          }
          
          const itemEdits = editsByItem.get(itemId)!;
          
          if (!itemEdits.has(field)) {
            // First time seeing this field for this item
            itemEdits.set(field, { first: oldValue, last: newValue });
          } else {
            // Update only the last value (keep first unchanged)
            const existing = itemEdits.get(field)!;
            itemEdits.set(field, { first: existing.first, last: newValue });
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
    
    if (editsByItem.size > 0) {
      // Get unique field names across all items
      const allFields = new Set<string>();
      editsByItem.forEach(fields => {
        fields.forEach((_, field) => allFields.add(field));
      });
      
      const fieldList = Array.from(allFields).slice(0, 3).map(f => `'${f}'`).join(', ');
      
      if (editsByItem.size === 1) {
        const [itemId] = Array.from(editsByItem.keys());
        const rowNum = getRowNumber(itemId);
        parts.push(`Row ${rowNum}: Edited ${fieldList}`);
      } else {
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

    // Group all edits by itemId and field, collapsing intermediate values
    const editsByItem = new Map<string, Map<string, { first: any, last: any }>>();
    const addedRows: any[] = [];
    const deletedRows: any[] = [];

    details.forEach((op: any) => {
      if (op.operation_type === 'cell_edit' && op.operation_data?.fieldUpdates) {
        const updates = Array.isArray(op.operation_data.fieldUpdates) 
          ? op.operation_data.fieldUpdates 
          : [];
        
        updates.forEach((update: any) => {
          const { itemId, field, oldValue, newValue } = update;
          
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
        });
      } else if (op.operation_type === 'add_row') {
        addedRows.push(op);
      } else if (op.operation_type === 'delete_row') {
        deletedRows.push(op);
      }
    });

    return (
      <div className="mt-3 space-y-3 text-sm">
        {/* Show collapsed edits by row */}
        {Array.from(editsByItem.entries()).map(([itemId, fields]) => {
          const rowNum = getRowNumber(itemId);
          return (
            <div key={itemId} className="pl-4 border-l-2 border-blue-500">
              <div className="font-medium text-muted-foreground mb-1">
                Row {rowNum} - Field Changes:
              </div>
              {Array.from(fields.entries()).map(([field, values]) => (
                <div key={field} className="ml-2 text-xs">
                  <span className="font-mono text-primary">{field}:</span>
                  {' '}
                  <span className="text-muted-foreground">
                    {values.first || '(empty)'}
                  </span>
                  {' → '}
                  <span className="text-foreground">
                    {values.last || '(empty)'}
                  </span>
                </div>
              ))}
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
