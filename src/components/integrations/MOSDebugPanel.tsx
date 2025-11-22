import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MOSMessage {
  id: string;
  event_type: string;
  status: string;
  message_payload: any;
  error_message: string | null;
  created_at: string;
  rundown_id: string | null;
}

interface MOSDebugPanelProps {
  teamId: string;
}

export const MOSDebugPanel: React.FC<MOSDebugPanelProps> = ({ teamId }) => {
  const [messages, setMessages] = useState<MOSMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('mos-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mos_message_log',
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          setMessages((prev) => [payload.new as MOSMessage, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mos_message_log')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching MOS messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              MOS Message Log
            </CardTitle>
            <CardDescription>
              Recent MOS messages sent to Xpression (last 50)
            </CardDescription>
          </div>
          <Button onClick={fetchMessages} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No MOS messages yet. Messages will appear here when you use the showcaller.
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(message.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{message.event_type}</span>
                        <Badge variant={message.status === 'sent' ? 'default' : 'destructive'}>
                          {message.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      {message.error_message && (
                        <div className="text-xs text-destructive mb-2">{message.error_message}</div>
                      )}
                      
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          View payload
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-[10px] overflow-x-auto">
                          {JSON.stringify(message.message_payload, null, 2)}
                        </pre>
                      </details>
                    </div>
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
