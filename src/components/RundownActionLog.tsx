import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

import { History, RefreshCw, Search, User, Clock, FileText, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { formatDistanceToNow, format } from 'date-fns';

interface ActionLogEntry {
  id: string;
  timestamp: string;
  type: 'action' | 'restore_point';
  action: string;
  itemNumber?: number;
  textChanged?: string;
  userName: string;
  userEmail: string;
  revision: {
    id: string;
    revision_number: number;
    revision_type: string;
    action_description: string;
  };
}

interface RundownActionLogProps {
  rundownId: string;
  onRestore?: () => void;
}

export const RundownActionLog: React.FC<RundownActionLogProps> = ({
  rundownId,
  onRestore
}) => {
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const { toast } = useToast();

  const loadActionLog = async () => {
    setLoading(true);
    try {
      // Get rundown revisions with user profiles
      const { data: revisionsData, error: revisionsError } = await supabase
        .from('rundown_revisions')
        .select(`
          id,
          revision_number,
          revision_type,
          action_description,
          created_at,
          created_by,
          items
        `)
        .eq('rundown_id', rundownId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (revisionsError) {
        throw revisionsError;
      }

      // Get unique user IDs
      const userIds = [...new Set(revisionsData?.map(r => r.created_by).filter(Boolean) || [])];
      
      // Get profile data for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) {
        console.warn('Could not load user profiles:', profilesError);
      }

      // Create a map of user ID to profile
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Transform revisions into action log entries
      const logEntries: ActionLogEntry[] = [];

      for (let i = 0; i < (revisionsData || []).length; i++) {
        const revision = revisionsData[i];
        const previousRevision = i < revisionsData.length - 1 ? revisionsData[i + 1] : null;
        const profile = profilesMap.get(revision.created_by);
        
        const userName = profile?.full_name || 'Unknown User';
        const userEmail = profile?.email || '';

        // Add restore point entry
        if (revision.revision_type === 'manual' || revision.revision_type === 'initial') {
          logEntries.push({
            id: `restore-${revision.id}`,
            timestamp: revision.created_at,
            type: 'restore_point',
            action: revision.action_description || `${revision.revision_type === 'initial' ? 'Initial' : 'Manual'} restore point`,
            userName,
            userEmail,
            revision: {
              id: revision.id,
              revision_number: revision.revision_number,
              revision_type: revision.revision_type,
              action_description: revision.action_description
            }
          });
        }

        // Analyze changes between revisions
        if (previousRevision && revision.items && previousRevision.items) {
          const changes = analyzeChanges(previousRevision.items, revision.items);
          
          changes.forEach((change, index) => {
            logEntries.push({
              id: `action-${revision.id}-${index}`,
              timestamp: revision.created_at,
              type: 'action',
              action: change.action,
              itemNumber: change.itemNumber,
              textChanged: change.textChanged,
              userName,
              userEmail,
              revision: {
                id: revision.id,
                revision_number: revision.revision_number,
                revision_type: revision.revision_type,
                action_description: revision.action_description
              }
            });
          });
        }
      }

      // Sort by timestamp (newest first)
      logEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setActionLog(logEntries);
    } catch (error) {
      console.error('Error loading action log:', error);
      toast({
        title: "Error loading action log",
        description: "Could not load action history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const analyzeChanges = (oldItems: any[], newItems: any[]) => {
    const changes: Array<{
      action: string;
      itemNumber?: number;
      textChanged?: string;
    }> = [];

    // Check for item count changes
    if (newItems.length > oldItems.length) {
      const addedCount = newItems.length - oldItems.length;
      for (let i = 0; i < addedCount; i++) {
        const newItemIndex = oldItems.length + i;
        const newItem = newItems[newItemIndex];
        changes.push({
          action: `Added new item`,
          itemNumber: newItemIndex + 1,
          textChanged: newItem?.name || 'Untitled'
        });
      }
    } else if (newItems.length < oldItems.length) {
      const deletedCount = oldItems.length - newItems.length;
      changes.push({
        action: `Deleted ${deletedCount} item(s)`,
        itemNumber: newItems.length + 1
      });
    }

    // Check for content changes in existing items
    const maxLength = Math.min(oldItems.length, newItems.length);
    for (let i = 0; i < maxLength; i++) {
      const oldItem = oldItems[i];
      const newItem = newItems[i];
      
      if (!oldItem || !newItem) continue;

      // Check name changes
      if (oldItem.name !== newItem.name) {
        const oldText = oldItem.name || '';
        const newText = newItem.name || '';
        const textChanged = getTextDifference(oldText, newText);
        changes.push({
          action: `Updated item title`,
          itemNumber: i + 1,
          textChanged
        });
      }

      // Check script changes
      if (oldItem.script !== newItem.script) {
        const oldText = oldItem.script || '';
        const newText = newItem.script || '';
        const textChanged = getTextDifference(oldText, newText);
        changes.push({
          action: `Updated script`,
          itemNumber: i + 1,
          textChanged
        });
      }

      // Check notes changes
      if (oldItem.notes !== newItem.notes) {
        const oldText = oldItem.notes || '';
        const newText = newItem.notes || '';
        const textChanged = getTextDifference(oldText, newText);
        changes.push({
          action: `Updated notes`,
          itemNumber: i + 1,
          textChanged
        });
      }

      // Check talent changes
      if (oldItem.talent !== newItem.talent) {
        const textChanged = `"${oldItem.talent || ''}" → "${newItem.talent || ''}"`;
        changes.push({
          action: `Updated talent`,
          itemNumber: i + 1,
          textChanged
        });
      }
    }

    return changes;
  };

  const getTextDifference = (oldText: string, newText: string): string => {
    if (newText.length > oldText.length) {
      const added = newText.substring(oldText.length);
      if (added.length > 50) {
        return `Added: "${added.substring(0, 47)}..."`;
      }
      return `Added: "${added}"`;
    } else if (newText.length < oldText.length) {
      const removed = oldText.substring(newText.length);
      if (removed.length > 50) {
        return `Removed: "${removed.substring(0, 47)}..."`;
      }
      return `Removed: "${removed}"`;
    } else {
      // Text replaced
      if (newText.length > 50) {
        return `Changed to: "${newText.substring(0, 47)}..."`;
      }
      return `Changed to: "${newText}"`;
    }
  };

  const handleRestore = async (revisionId: string) => {
    setRestoring(revisionId);
    try {
      const { data, error } = await supabase.rpc('restore_rundown_from_revision', {
        target_rundown_id: rundownId,
        revision_id: revisionId
      });

      if (error) {
        console.error('Error restoring revision:', error);
        toast({
          title: "Restore failed",
          description: error.message || "Could not restore from this revision",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Revision restored",
          description: "Successfully restored rundown from backup",
        });
        onRestore?.();
      }
    } catch (error) {
      console.error('Error restoring revision:', error);
      toast({
        title: "Restore failed",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setRestoring(null);
    }
  };


  const filteredActionLog = actionLog.filter(entry => {
    if (!searchFilter) return true;
    const searchLower = searchFilter.toLowerCase();
    return (
      entry.action.toLowerCase().includes(searchLower) ||
      entry.userName.toLowerCase().includes(searchLower) ||
      entry.userEmail.toLowerCase().includes(searchLower) ||
      entry.textChanged?.toLowerCase().includes(searchLower)
    );
  });

  useEffect(() => {
    loadActionLog();
  }, [rundownId]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="w-4 h-4 mr-2" />
          Action Log
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Rundown Action Log</DialogTitle>
          <DialogDescription>
            View every action performed on this rundown, including text changes, item additions/deletions. Click "Restore to here" to revert to any point in time.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-between items-center gap-4 mb-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search actions, users, or changes..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="max-w-md"
            />
          </div>
          <Button variant="outline" size="sm" onClick={loadActionLog} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="text-sm text-muted-foreground mb-4">
          Showing {filteredActionLog.length} actions {searchFilter && `(filtered from ${actionLog.length})`}
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-2 pr-4">
            {filteredActionLog.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                {searchFilter ? 'No actions match your search' : 'No actions found for this rundown'}
              </div>
            )}
            
            {filteredActionLog.map((entry, index) => (
              <div key={entry.id} className={`border rounded-lg p-3 ${entry.type === 'restore_point' ? 'bg-accent/10 border-accent' : ''}`}>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {entry.type === 'restore_point' ? (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" />
                          Restore Point
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          Action
                        </Badge>
                      )}
                      {entry.itemNumber && (
                        <Badge variant="outline">
                          Item #{entry.itemNumber}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{entry.action}</p>
                      {entry.textChanged && (
                        <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 font-mono">
                          {entry.textChanged}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span className="font-medium">{entry.userName}</span>
                          {entry.userEmail && <span>({entry.userEmail})</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}</span>
                          <span>•</span>
                          <span>{format(new Date(entry.timestamp), 'MMM d, h:mm a')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(entry.revision.id)}
                    disabled={restoring === entry.revision.id}
                  >
                    {restoring === entry.revision.id ? (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                        Restoring...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Restore to here
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};