import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSimpleCollaboration } from '@/hooks/useSimpleCollaboration';
import { useRundownState } from '@/hooks/useRundownState';

/**
 * MINIMAL COLLABORATION TEST
 * 
 * Simple component to test the new collaboration system
 * without breaking the existing complex UI.
 */
export const CollaborationTest = () => {
  // Initialize basic rundown state
  const {
    state,
    actions
  } = useRundownState({
    items: [
      {
        id: 'test1',
        type: 'regular',
        name: 'Test Item 1',
        talent: '',
        script: '',
        gfx: '',
        video: '',
        images: '',
        notes: '',
        duration: '00:30',
        color: '',
        isFloating: false,
        customFields: {},
        rowNumber: '1',
        startTime: '09:00:00',
        endTime: '09:00:30',
        elapsedTime: '00:00:00'
      },
      {
        id: 'test2', 
        type: 'regular',
        name: 'Test Item 2',
        talent: '',
        script: '',
        gfx: '',
        video: '',
        images: '',
        notes: '',
        duration: '01:00',
        color: '',
        isFloating: false,
        customFields: {},
        rowNumber: '2',
        startTime: '09:00:30',
        endTime: '09:01:30',
        elapsedTime: '00:00:30'
      }
    ],
    columns: [],
    title: 'Collaboration Test Rundown',
    startTime: '09:00:00',
    timezone: 'America/New_York',
    showDate: null
  }, 'test-rundown');

  // Use simplified collaboration
  const collaboration = useSimpleCollaboration({
    rundownId: 'test-rundown',
    state,
    actions,
    enabled: true
  });

  const [testInput, setTestInput] = useState('');

  const handleInputChange = (value: string) => {
    setTestInput(value);
    // Mark this cell as active for collaboration
    collaboration.markCellActive('test-input');
  };

  const handleUpdateItem = (itemId: string, field: string, value: string) => {
    // Mark the cell as active
    collaboration.markCellActive(`${itemId}-${field}`);
    // Update the item
    actions.updateItem(itemId, { [field]: value });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🧪 Simplified Collaboration Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Connection Status */}
          <div className="flex items-center gap-4">
            <Badge variant={collaboration.isConnected ? "default" : "destructive"}>
              {collaboration.isConnected ? "Connected" : "Disconnected"}
            </Badge>
            <Badge variant={collaboration.isSaving ? "secondary" : "outline"}>
              {collaboration.isSaving ? "Saving..." : "Saved"}
            </Badge>
          </div>

          {/* Active Cells */}
          <div>
            <h4 className="font-semibold mb-2">Active Cells (Protected from Remote Updates)</h4>
            <div className="flex flex-wrap gap-2">
              {collaboration.activeCells.length > 0 ? (
                collaboration.activeCells.map(cellKey => (
                  <Badge key={cellKey} variant="secondary">
                    {cellKey}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">No cells currently active</span>
              )}
            </div>
          </div>

          {/* Test Input */}
          <div>
            <h4 className="font-semibold mb-2">Test Input (Type to see cell protection)</h4>
            <Input
              value={testInput}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Type here to test cell protection..."
            />
          </div>

          {/* Rundown Items */}
          <div>
            <h4 className="font-semibold mb-2">Test Rundown Items</h4>
            <div className="space-y-2">
              {state.items.map((item: any) => (
                <div key={item.id} className="grid grid-cols-3 gap-2">
                  <Input
                    value={item.name}
                    onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                    placeholder="Item name"
                  />
                  <Input
                    value={item.duration}
                    onChange={(e) => handleUpdateItem(item.id, 'duration', e.target.value)}
                    placeholder="Duration"
                  />
                  <Input
                    value={item.script}
                    onChange={(e) => handleUpdateItem(item.id, 'script', e.target.value)}
                    placeholder="Script"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Manual Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={() => actions.addItem({
                id: `item_${Date.now()}`,
                type: 'regular',
                name: 'New Item',
                talent: '',
                script: '',
                gfx: '',
                video: '',
                images: '',
                notes: '',
                duration: '00:30',
                color: '',
                isFloating: false,
                customFields: {},
                rowNumber: String(state.items.length + 1),
                startTime: '09:00:00',
                endTime: '09:00:30',
                elapsedTime: '00:00:00'
              })}
            >
              Add Item
            </Button>
            <Button 
              onClick={collaboration.forceSave}
              variant="outline"
            >
              Force Save
            </Button>
          </div>

          {/* System Information */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">System Information</h4>
            <div className="text-sm space-y-1">
              <p>Items: {state.items.length}</p>
              <p>Title: {state.title}</p>
              <p>Has Changes: {state.hasUnsavedChanges ? 'Yes' : 'No'}</p>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};