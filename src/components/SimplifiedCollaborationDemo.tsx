import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCleanRundownState } from '@/hooks/useCleanRundownState';
import { FEATURE_FLAGS } from '@/config/features';

/**
 * DEMO COMPONENT for Simplified Collaboration
 * 
 * Shows the difference between old complex system and new simplified one.
 * Remove this component after testing is complete.
 */
export const SimplifiedCollaborationDemo = () => {
  const cleanState = useCleanRundownState();

  if (!FEATURE_FLAGS.ENABLE_SIMPLE_COLLABORATION) {
    return (
      <Card className="m-4">
        <CardHeader>
          <CardTitle>🚧 Simplified Collaboration Demo</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Set ENABLE_SIMPLE_COLLABORATION to true in src/config/features.ts to test the new system.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>✅ Simplified Collaboration Active</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">Connection Status</h4>
            <Badge variant={cleanState.isConnected ? "default" : "destructive"}>
              {cleanState.isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Saving Status</h4>
            <Badge variant={cleanState.isSaving ? "secondary" : "outline"}>
              {cleanState.isSaving ? "Saving..." : "Saved"}
            </Badge>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Active Features</h4>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>✅ Per-cell protection only</li>
            <li>✅ No OCC (Optimistic Concurrency Control)</li>
            <li>✅ No LocalShadow complexity</li>
            <li>✅ No update queues</li>
            <li>✅ Last-writer-wins for same cell</li>
            <li>✅ Immediate remote updates</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Current Rundown</h4>
          <p className="text-sm">
            Title: {cleanState.state.title}<br/>
            Items: {cleanState.state.items?.length || 0}<br/>
            Loading: {cleanState.isLoading ? "Yes" : "No"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};