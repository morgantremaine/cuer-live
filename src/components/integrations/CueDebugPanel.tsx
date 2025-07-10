import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, AlertCircle, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CueLog {
  id: string;
  segment_id: string;
  event_type: string;
  payload: any;
  endpoint_url?: string;
  response_status?: number;
  error_message?: string;
  sent_at: string;
  response_time_ms?: number;
  integration_id?: string;
}

interface CueDebugPanelProps {
  teamId: string;
  rundownId?: string;
  className?: string;
}

export const CueDebugPanel: React.FC<CueDebugPanelProps> = ({ 
  teamId, 
  rundownId, 
  className = '' 
}) => {
  const [logs, setLogs] = useState<CueLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();

  const fetchLogs = async () => {
    try {
      let query = supabase
        .from('cue_logs')
        .select('*')
        .eq('team_id', teamId)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (rundownId) {
        query = query.eq('rundown_id', rundownId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching cue logs:', error);
      toast({
        title: "Error",
        description: "Failed to load cue logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    try {
      let query = supabase
        .from('cue_logs')
        .delete()
        .eq('team_id', teamId);

      if (rundownId) {
        query = query.eq('rundown_id', rundownId);
      } else {
        // If no specific rundown, only clear logs older than 1 hour to be safe
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        query = query.lt('sent_at', oneHourAgo);
      }

      const { error } = await query;

      if (error) throw error;

      toast({
        title: "Success",
        description: "Logs cleared successfully",
      });

      setLogs([]);
    } catch (error) {
      console.error('Error clearing logs:', error);
      toast({
        title: "Error", 
        description: "Failed to clear logs",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [teamId, rundownId]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchLogs, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, teamId, rundownId]);

  const getStatusIcon = (log: CueLog) => {
    if (log.error_message) {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
    if (log.response_status && log.response_status >= 200 && log.response_status < 300) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (log.response_status && log.response_status >= 400) {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusBadge = (log: CueLog) => {
    if (log.error_message) {
      return <Badge variant="destructive">Error</Badge>;
    }
    if (log.response_status && log.response_status >= 200 && log.response_status < 300) {
      return <Badge variant="default">Success</Badge>;
    }
    if (log.response_status && log.response_status >= 400) {
      return <Badge variant="destructive">{log.response_status}</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'cue_advance':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'playback_start':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'playback_stop':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'playback_reset':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'cue_jump':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Cue Activity Log</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Pause' : 'Resume'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearLogs}
              disabled={loading}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              No cue activity yet
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(log)}
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${getEventTypeColor(log.event_type)}`}>
                        {log.event_type.replace('_', ' ')}
                      </span>
                      {getStatusBadge(log)}
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(log.sent_at)}
                      </span>
                      {log.response_time_ms && (
                        <span className="text-xs text-muted-foreground">
                          {log.response_time_ms}ms
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm">
                      <span className="font-medium">
                        {log.payload?.current_segment?.name || 'Unknown Segment'}
                      </span>
                      {log.endpoint_url && (
                        <span className="text-muted-foreground ml-2">
                          → {log.endpoint_url}
                        </span>
                      )}
                    </div>
                    
                    {log.error_message && (
                      <div className="text-xs text-destructive bg-destructive/10 p-2 rounded border">
                        {log.error_message}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};