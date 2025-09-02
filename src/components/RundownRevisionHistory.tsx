import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, RefreshCw, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from 'date-fns';

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
  const { toast } = useToast();

  const loadRevisions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rundown_revisions')
        .select('*')
        .eq('rundown_id', rundownId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error loading revisions:', error);
        toast({
          title: "Error loading revisions",
          description: "Could not load revision history",
          variant: "destructive"
        });
      } else {
        setRevisions(data || []);
      }
    } catch (error) {
      console.error('Error loading revisions:', error);
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

  const getRevisionTypeLabel = (type: string) => {
    switch (type) {
      case 'initial': return 'Initial';
      case 'pre_wipe': return 'Pre-Wipe';
      case 'pre_restore': return 'Pre-Restore';
      case 'auto': return 'Auto Save';
      default: return 'Manual';
    }
  };

  const getRevisionTypeVariant = (type: string) => {
    switch (type) {
      case 'initial': return 'default';
      case 'pre_wipe': return 'destructive';
      case 'pre_restore': return 'secondary';
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
          Revision History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Rundown Revision History</DialogTitle>
          <DialogDescription>
            View and restore from automatic snapshots of your rundown. Critical revisions are created before major changes.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-muted-foreground">
            Showing {revisions.length} recent revisions
          </p>
          <Button variant="outline" size="sm" onClick={loadRevisions} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {revisions.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                No revisions found for this rundown
              </div>
            )}
            
            {revisions.map((revision) => (
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
                    <p className="text-sm text-muted-foreground">
                      {revision.items_count} items • Created {formatDistanceToNow(new Date(revision.created_at), { addSuffix: true })}
                    </p>
                    {revision.start_time && (
                      <p className="text-xs text-muted-foreground">
                        Start time: {revision.start_time} ({revision.timezone})
                      </p>
                    )}
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