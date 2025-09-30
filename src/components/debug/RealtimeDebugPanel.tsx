import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, EyeOff, Trash2 } from 'lucide-react';

interface RealtimeEvent {
  id: string;
  timestamp: number;
  type: 'realtime_update' | 'local_edit' | 'shadow_set' | 'shadow_clear' | 'protection_active' | 'save_start' | 'save_complete';
  data: any;
}

interface DebugState {
  activeShadows: Array<{ itemId: string; field: string; age: number }>;
  protectedFields: string[];
  lastUserAction: number | null;
  recentEvents: RealtimeEvent[];
  lastSaveTimestamp: number | null;
  deletionInProgress: string | null;
}

// Global debug state (singleton)
const debugState: DebugState = {
  activeShadows: [],
  protectedFields: [],
  lastUserAction: null,
  recentEvents: [],
  lastSaveTimestamp: null,
  deletionInProgress: null
};

// Global debug logger that components can call
export const realtimeDebugLogger = {
  logRealtimeUpdate: (data: any) => {
    debugState.recentEvents.unshift({
      id: `rt-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      type: 'realtime_update',
      data
    });
    if (debugState.recentEvents.length > 50) debugState.recentEvents.pop();
  },
  
  logLocalEdit: (itemId: string, field: string, value: any) => {
    debugState.lastUserAction = Date.now();
    debugState.recentEvents.unshift({
      id: `edit-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      type: 'local_edit',
      data: { itemId, field, valueLength: String(value).length }
    });
    if (debugState.recentEvents.length > 50) debugState.recentEvents.pop();
  },
  
  logShadowSet: (itemId: string, field: string) => {
    debugState.recentEvents.unshift({
      id: `shadow-set-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      type: 'shadow_set',
      data: { itemId, field }
    });
    if (debugState.recentEvents.length > 50) debugState.recentEvents.pop();
  },
  
  logShadowClear: (itemId?: string) => {
    debugState.recentEvents.unshift({
      id: `shadow-clear-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      type: 'shadow_clear',
      data: { itemId: itemId || 'all' }
    });
    if (debugState.recentEvents.length > 50) debugState.recentEvents.pop();
  },
  
  logProtectionActive: (fields: string[]) => {
    debugState.protectedFields = fields;
    if (fields.length > 0) {
      debugState.recentEvents.unshift({
        id: `protect-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        type: 'protection_active',
        data: { fields }
      });
      if (debugState.recentEvents.length > 50) debugState.recentEvents.pop();
    }
  },
  
  logSaveStart: () => {
    debugState.recentEvents.unshift({
      id: `save-start-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      type: 'save_start',
      data: {}
    });
    if (debugState.recentEvents.length > 50) debugState.recentEvents.pop();
  },
  
  logSaveComplete: () => {
    debugState.lastSaveTimestamp = Date.now();
    debugState.recentEvents.unshift({
      id: `save-complete-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      type: 'save_complete',
      data: {}
    });
    if (debugState.recentEvents.length > 50) debugState.recentEvents.pop();
  },
  
  setActiveShadows: (shadows: Array<{ itemId: string; field: string; age: number }>) => {
    debugState.activeShadows = shadows;
  },
  
  setDeletionInProgress: (fieldKey: string | null) => {
    debugState.deletionInProgress = fieldKey;
  },
  
  getState: () => debugState
};

export const RealtimeDebugPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [state, setState] = useState<DebugState>(debugState);

  useEffect(() => {
    if (!isVisible) return;
    
    const interval = setInterval(() => {
      setState({ ...debugState });
    }, 500);
    
    return () => clearInterval(interval);
  }, [isVisible]);

  const clearEvents = () => {
    debugState.recentEvents = [];
    setState({ ...debugState });
  };

  const getEventIcon = (type: RealtimeEvent['type']) => {
    switch (type) {
      case 'realtime_update': return '📡';
      case 'local_edit': return '✏️';
      case 'shadow_set': return '🔒';
      case 'shadow_clear': return '🔓';
      case 'protection_active': return '🛡️';
      case 'save_start': return '💾';
      case 'save_complete': return '✅';
      default: return '•';
    }
  };

  const getEventColor = (type: RealtimeEvent['type']) => {
    switch (type) {
      case 'realtime_update': return 'bg-blue-500';
      case 'local_edit': return 'bg-green-500';
      case 'shadow_set': return 'bg-yellow-500';
      case 'shadow_clear': return 'bg-gray-500';
      case 'protection_active': return 'bg-purple-500';
      case 'save_start': return 'bg-orange-500';
      case 'save_complete': return 'bg-teal-500';
      default: return 'bg-gray-400';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 1000) return `${diff}ms ago`;
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    return `${Math.floor(diff / 60000)}m ago`;
  };

  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50"
      >
        <Eye className="h-4 w-4 mr-2" />
        Debug Panel
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-h-[600px] z-50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Realtime Debug</CardTitle>
          <div className="flex gap-2">
            <Button onClick={clearEvents} variant="ghost" size="sm">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button onClick={() => setIsVisible(false)} variant="ghost" size="sm">
              <EyeOff className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status Section */}
        <div className="space-y-2">
          <div className="text-xs font-semibold">Status</div>
          <div className="space-y-1 text-xs">
            <div>
              Last User Action: {state.lastUserAction ? formatTimestamp(state.lastUserAction) : 'None'}
            </div>
            <div>
              Last Save: {state.lastSaveTimestamp ? formatTimestamp(state.lastSaveTimestamp) : 'None'}
            </div>
            {state.deletionInProgress && (
              <div className="text-red-600">
                🗑️ Deletion in progress: {state.deletionInProgress}
              </div>
            )}
          </div>
        </div>

        {/* Active Shadows */}
        {state.activeShadows.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold">Active Shadows ({state.activeShadows.length})</div>
            <ScrollArea className="h-20">
              <div className="space-y-1">
                {state.activeShadows.map((shadow, i) => (
                  <div key={i} className="text-xs">
                    {shadow.itemId}-{shadow.field} ({shadow.age}ms)
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Protected Fields */}
        {state.protectedFields.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold">Protected Fields ({state.protectedFields.length})</div>
            <div className="flex flex-wrap gap-1">
              {state.protectedFields.map((field, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {field}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recent Events */}
        <div className="space-y-2">
          <div className="text-xs font-semibold">Recent Events</div>
          <ScrollArea className="h-48">
            <div className="space-y-1">
              {state.recentEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-2 text-xs">
                  <span className={`flex-shrink-0 w-2 h-2 rounded-full mt-1 ${getEventColor(event.type)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span>{getEventIcon(event.type)}</span>
                      <span className="font-medium">{event.type}</span>
                      <span className="text-muted-foreground">{formatTimestamp(event.timestamp)}</span>
                    </div>
                    {event.data && (
                      <pre className="text-xs text-muted-foreground overflow-x-auto">
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};
