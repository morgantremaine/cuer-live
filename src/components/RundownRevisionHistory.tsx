import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { History, RefreshCw, AlertTriangle, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatDistanceToNow, format } from 'date-fns';

interface RundownRevision {
  id: string;
  rundown_id: string;
  revision_number: number;
  items: any[];
  title: string;
  start_time: string;
  timezone: string;
  created_at: string;
  created_by: string;
  revision_type: string;
  items_count: number;
  action_description: string;
  creator_name: string;
  creator_email: string;
}

interface RundownRevisionHistoryProps {
  rundownId: string;
  onRestore?: () => void;
}

export const RundownRevisionHistory: React.FC<RundownRevisionHistoryProps> = ({
  rundownId,
  onRestore
}) => {
  const [revisions, setRevisions] = useState<RundownRevision[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [manualRestorePointName, setManualRestorePointName] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [expandedRevisions, setExpandedRevisions] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const loadRevisions = async () => {
    setLoading(true);
    try {
      // First get the revisions
      const { data: revisionsData, error: revisionsError } = await supabase
        .from('rundown_revisions')
        .select('*')
        .eq('rundown_id', rundownId)
        .order('created_at', { ascending: false })
        .limit(30);

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

      // Combine the data
      const transformedData = (revisionsData || []).map(revision => ({
        ...revision,
        creator_name: profilesMap.get(revision.created_by)?.full_name || 'Unknown User',
        creator_email: profilesMap.get(revision.created_by)?.email || ''
      }));

      setRevisions(transformedData);
    } catch (error) {
      console.error('Error loading revisions:', error);
      toast({
        title: "Error loading revisions",
        description: "Could not load revision history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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

  const handleCreateManualRevision = async () => {
    if (!manualRestorePointName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for the restore point",
        variant: "destructive"
      });
      return;
    }

    setCreating(true);
    try {
      // Get current rundown data
      const { data: rundownData, error: rundownError } = await supabase
        .from('rundowns')
        .select('items, title, start_time, timezone')
        .eq('id', rundownId)
        .single();

      if (rundownError) {
        throw rundownError;
      }

      // Create manual revision
      const { error: revisionError } = await supabase
        .from('rundown_revisions')
        .insert({
          rundown_id: rundownId,
          revision_number: Date.now(), // Use timestamp to ensure uniqueness
          items: rundownData.items,
          title: rundownData.title,
          start_time: rundownData.start_time,
          timezone: rundownData.timezone,
          revision_type: 'manual',
          action_description: `Manual restore point: ${manualRestorePointName.trim()}`
        });

      if (revisionError) {
        throw revisionError;
      }

      toast({
        title: "Restore point created",
        description: `Manual restore point "${manualRestorePointName.trim()}" has been created`,
      });

      setManualRestorePointName('');
      setShowCreateDialog(false);
      loadRevisions(); // Refresh the list
    } catch (error) {
      console.error('Error creating manual revision:', error);
      toast({
        title: "Creation failed",
        description: "Could not create manual restore point",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const toggleRevisionExpansion = (revisionId: string) => {
    const newExpanded = new Set(expandedRevisions);
    if (newExpanded.has(revisionId)) {
      newExpanded.delete(revisionId);
    } else {
      newExpanded.add(revisionId);
    }
    setExpandedRevisions(newExpanded);
  };

  const getDetailedChanges = (currentRevision: RundownRevision, index: number) => {
    const previousRevision = revisions[index + 1];
    const changes: string[] = [];

    if (!previousRevision) {
      return ['Initial revision - no previous version to compare'];
    }

    // Compare title
    if (currentRevision.title !== previousRevision.title) {
      changes.push(`Title changed: "${previousRevision.title}" → "${currentRevision.title}"`);
    }

    // Compare start time
    if (currentRevision.start_time !== previousRevision.start_time) {
      changes.push(`Start time changed: "${previousRevision.start_time || 'Not set'}" → "${currentRevision.start_time || 'Not set'}"`);
    }

    // Compare timezone
    if (currentRevision.timezone !== previousRevision.timezone) {
      changes.push(`Timezone changed: "${previousRevision.timezone || 'Not set'}" → "${currentRevision.timezone || 'Not set'}"`);
    }

    // Compare item count
    const currentItemCount = currentRevision.items?.length || 0;
    const previousItemCount = previousRevision.items?.length || 0;
    
    if (currentItemCount !== previousItemCount) {
      const difference = currentItemCount - previousItemCount;
      if (difference > 0) {
        changes.push(`Added ${difference} item(s) (${previousItemCount} → ${currentItemCount})`);
      } else {
        changes.push(`Removed ${Math.abs(difference)} item(s) (${previousItemCount} → ${currentItemCount})`);
      }
    }

    // Compare individual items for more detailed analysis
    if (currentRevision.items && previousRevision.items) {
      // Check for items that were modified (same position, different content)
      const maxLength = Math.max(currentRevision.items.length, previousRevision.items.length);
      let modifiedCount = 0;
      
      for (let i = 0; i < Math.min(currentRevision.items.length, previousRevision.items.length); i++) {
        const currentItem = currentRevision.items[i];
        const previousItem = previousRevision.items[i];
        
        if (JSON.stringify(currentItem) !== JSON.stringify(previousItem)) {
          modifiedCount++;
        }
      }
      
      if (modifiedCount > 0) {
        changes.push(`Modified ${modifiedCount} existing item(s)`);
      }
    }

    return changes.length > 0 ? changes : ['No significant changes detected'];
  };

  const getRevisionTypeLabel = (type: string) => {
    switch (type) {
      case 'initial': return 'Initial';
      case 'pre_wipe': return 'Pre-Wipe';
      case 'pre_restore': return 'Pre-Restore';
      case 'periodic': return 'Periodic';
      case 'user_change': return 'User Change';
      case 'auto': return 'Auto Save';
      default: return 'Manual';
    }
  };

  const getRevisionTypeVariant = (type: string) => {
    switch (type) {
      case 'initial': return 'default';
      case 'pre_wipe': return 'destructive';
      case 'pre_restore': return 'secondary';
      case 'periodic': return 'secondary';
      case 'user_change': return 'default';
      case 'auto': return 'outline';
      default: return 'default';
    }
  };

  useEffect(() => {
    loadRevisions();
  }, [rundownId]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="w-4 h-4 mr-2" />
          History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Rundown Revision History</DialogTitle>
          <DialogDescription>
            View and restore from automatic snapshots of your rundown. Revisions are now created every 5 minutes and track who made what changes.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-muted-foreground">
            Showing {revisions.length} recent revisions
          </p>
          <div className="flex gap-2">
            <AlertDialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Restore Point
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Create Manual Restore Point</AlertDialogTitle>
                  <AlertDialogDescription>
                    Create a manual restore point with a custom name to easily identify this state later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                  <Label htmlFor="restore-point-name">Restore Point Name</Label>
                  <Input
                    id="restore-point-name"
                    value={manualRestorePointName}
                    onChange={(e) => setManualRestorePointName(e.target.value)}
                    placeholder="e.g., Before major script changes"
                    className="mt-2"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleCreateManualRevision();
                      }
                    }}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCreateManualRevision}
                    disabled={creating || !manualRestorePointName.trim()}
                  >
                    {creating ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Restore Point'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <Button variant="outline" size="sm" onClick={loadRevisions} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {revisions.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                No revisions found for this rundown
              </div>
            )}
            
            {revisions.map((revision, index) => (
              <div key={revision.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={getRevisionTypeVariant(revision.revision_type)}>
                        {getRevisionTypeLabel(revision.revision_type)}
                      </Badge>
                      <span className="text-sm font-medium">Rev #{revision.revision_number}</span>
                      {revision.revision_type === 'pre_wipe' && (
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                    <h4 className="font-medium">{revision.title}</h4>
                     <div className="space-y-1">
                       {revision.action_description && (
                         <p className="text-sm font-medium text-primary">
                           {revision.action_description}
                         </p>
                       )}
                       <div className="flex items-center gap-4 text-sm text-muted-foreground">
                         <span>{revision.items_count} items</span>
                         <span>•</span>
                         <span>{formatDistanceToNow(new Date(revision.created_at), { addSuffix: true })}</span>
                         <span>•</span>
                         <span className="text-xs">{format(new Date(revision.created_at), 'MMM d, h:mm a')}</span>
                       </div>
                       <p className="text-xs text-muted-foreground">
                         By: {revision.creator_name} {revision.creator_email && `(${revision.creator_email})`}
                       </p>
                       {revision.revision_type === 'manual' && (
                         <div className="mt-2 p-2 bg-accent/20 rounded text-xs text-accent-foreground">
                           📌 Manual restore point
                         </div>
                       )}
                     </div>
                    {revision.start_time && (
                      <p className="text-xs text-muted-foreground">
                        Start time: {revision.start_time} ({revision.timezone})
                      </p>
                    )}
                    
                    {/* Detailed changes dropdown */}
                    <Collapsible
                      open={expandedRevisions.has(revision.id)}
                      onOpenChange={() => toggleRevisionExpansion(revision.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {expandedRevisions.has(revision.id) ? (
                            <ChevronDown className="w-3 h-3 mr-1" />
                          ) : (
                            <ChevronRight className="w-3 h-3 mr-1" />
                          )}
                          View detailed changes
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="bg-secondary/50 rounded-md p-3 text-xs space-y-1">
                          <div className="font-medium text-secondary-foreground mb-2">Changes from previous revision:</div>
                          {getDetailedChanges(revision, index).map((change, changeIndex) => (
                            <div key={changeIndex} className="text-secondary-foreground flex items-start gap-2">
                              <span className="text-primary">•</span>
                              <span>{change}</span>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={restoring === revision.id}
                      >
                        {restoring === revision.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          'Restore'
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Restore from Revision?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will restore your rundown to revision #{revision.revision_number} from{' '}
                          {formatDistanceToNow(new Date(revision.created_at), { addSuffix: true })}.
                          A backup will be created before restoring.
                          <br /><br />
                          <strong>Title:</strong> {revision.title}<br />
                          <strong>Items:</strong> {revision.items_count}<br />
                          <strong>Type:</strong> {getRevisionTypeLabel(revision.revision_type)}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRestore(revision.id)}
                          className="bg-primary text-primary-foreground"
                        >
                          Restore Revision
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};