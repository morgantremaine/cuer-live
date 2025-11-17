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
  details: {
    operations: any[];
    operation_types: string[];
  };
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

  useEffect(() => {
    fetchHistory();

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
    if (!entry.details?.operations || entry.details.operations.length === 0) {
      return entry.summary;
    }

    const fieldChanges: Record<string, number> = {};
    let rowsAdded = 0;
    let rowsDeleted = 0;

    entry.details.operations.forEach((op: any) => {
      if (op.type === 'add_row') {
        rowsAdded++;
      } else if (op.type === 'delete_row') {
        rowsDeleted++;
      } else if (op.fieldUpdates) {
        op.fieldUpdates.forEach((update: any) => {
          fieldChanges[update.field] = (fieldChanges[update.field] || 0) + 1;
        });
      }
    });

    const parts: string[] = [];

    if (rowsAdded > 0) {
      parts.push(`Added ${rowsAdded} row${rowsAdded > 1 ? 's' : ''}`);
    }
    if (rowsDeleted > 0) {
      parts.push(`Deleted ${rowsDeleted} row${rowsDeleted > 1 ? 's' : ''}`);
    }

    const fieldNames = Object.keys(fieldChanges);
    if (fieldNames.length > 0) {
      if (fieldNames.length === 1) {
        const field = fieldNames[0];
        const count = fieldChanges[field];
        parts.push(`Edited '${field}' ${count} time${count > 1 ? 's' : ''}`);
      } else if (fieldNames.length <= 3) {
        parts.push(`Edited fields: ${fieldNames.map(f => `'${f}'`).join(', ')}`);
      } else {
        parts.push(`Edited ${fieldNames.length} fields`);
      }
    }

    return parts.length > 0 ? parts.join(' and ') : entry.summary;
  };

  const renderOperationDetails = (details: any) => {
    if (!details?.operations || details.operations.length === 0) return null;

    return (
      <div className="mt-2 space-y-1">
        {details.operations.map((op: any, idx: number) => {
          if (op.type === 'add_row') {
            return (
              <div key={idx} className="text-xs text-muted-foreground">
                • Added row {op.rowNumber || ''}
              </div>
            );
          }
          if (op.type === 'delete_row') {
            return (
              <div key={idx} className="text-xs text-muted-foreground">
                • Deleted row {op.rowNumber || ''}
              </div>
            );
          }
          if (op.fieldUpdates) {
            return op.fieldUpdates.map((update: any, updateIdx: number) => (
              <div key={`${idx}-${updateIdx}`} className="text-xs text-muted-foreground">
                • Changed {update.field}
                {update.oldValue !== null && update.newValue !== null && (
                  <span className="ml-1">
                    from "{String(update.oldValue).slice(0, 30)}{String(update.oldValue).length > 30 ? '...' : ''}" 
                    to "{String(update.newValue).slice(0, 30)}{String(update.newValue).length > 30 ? '...' : ''}"
                  </span>
                )}
              </div>
            ));
          }
          return null;
        })}
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
