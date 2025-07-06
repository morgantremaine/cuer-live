import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCuerModifications } from '@/hooks/useCuerModifications';
import { useFindReplace } from '@/hooks/useFindReplace';
import { useDirectRundownState } from '@/hooks/useDirectRundownState';

const StateTestPanel = () => {
  const [testItemId, setTestItemId] = useState('');
  const [testValue, setTestValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  
  const { applyModifications } = useCuerModifications();
  const { findMatches, replaceAll, lastSearchResults } = useFindReplace();
  const directState = useDirectRundownState();

  const handleDirectUpdate = () => {
    if (!testItemId || !testValue) return;
    
    console.log('🧪 Testing direct state update');
    directState.updateItem(testItemId, 'name', testValue);
  };

  const handleCuerModification = () => {
    if (!testItemId || !testValue) return;
    
    console.log('🧪 Testing Cuer modification');
    const modifications = [{
      type: 'update' as const,
      itemId: testItemId,
      data: { name: testValue },
      description: `Test update: changing name to "${testValue}"`
    }];
    
    applyModifications(modifications);
  };

  const handleFind = () => {
    if (!searchTerm) return;
    
    findMatches({
      searchTerm,
      replaceTerm: '',
      fields: ['name', 'script', 'talent', 'notes'],
      caseSensitive: false,
      wholeWord: false
    });
  };

  const handleReplace = () => {
    if (!searchTerm || !replaceTerm) return;
    
    replaceAll({
      searchTerm,
      replaceTerm,
      fields: ['name', 'script', 'talent', 'notes'],
      caseSensitive: false,
      wholeWord: false
    });
  };

  return (
    <div className="fixed top-4 right-4 w-96 space-y-4 z-50">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">State Test Panel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current State Info */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Current State:</div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline">{directState.items.length} items</Badge>
              <Badge variant={directState.hasUnsavedChanges ? "destructive" : "secondary"}>
                {directState.hasUnsavedChanges ? "Unsaved" : "Saved"}
              </Badge>
              <Badge variant={directState.isSaving ? "default" : "outline"}>
                {directState.isSaving ? "Saving..." : "Ready"}
              </Badge>
            </div>
          </div>

          {/* Direct State Test */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Direct State Test:</div>
            <Input 
              placeholder="Item ID" 
              value={testItemId}
              onChange={(e) => setTestItemId(e.target.value)}
              className="text-xs"
            />
            <Input 
              placeholder="New name" 
              value={testValue}
              onChange={(e) => setTestValue(e.target.value)}
              className="text-xs"
            />
            <Button onClick={handleDirectUpdate} size="sm" className="w-full">
              Test Direct Update
            </Button>
            <Button onClick={handleCuerModification} size="sm" className="w-full" variant="outline">
              Test Cuer Mod
            </Button>
          </div>

          {/* Find/Replace Test */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Find/Replace Test:</div>
            <Input 
              placeholder="Search term" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs"
            />
            <Input 
              placeholder="Replace with" 
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              className="text-xs"
            />
            <div className="flex gap-2">
              <Button onClick={handleFind} size="sm" className="flex-1">
                Find ({lastSearchResults.totalMatches})
              </Button>
              <Button onClick={handleReplace} size="sm" className="flex-1" variant="outline">
                Replace All
              </Button>
            </div>
          </div>

          {/* Quick Item List */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Quick Item Reference:</div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {directState.items.slice(0, 5).map((item) => (
                <div 
                  key={item.id} 
                  className="text-xs p-1 bg-muted rounded cursor-pointer hover:bg-accent"
                  onClick={() => setTestItemId(item.id)}
                >
                  <div className="font-mono text-[10px] text-muted-foreground">{item.id.slice(0, 8)}...</div>
                  <div>{item.name || 'Unnamed'}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StateTestPanel;