import React from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { useRundownOperationMode } from '@/hooks/useRundownOperationMode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Zap, Users, Clock, Database } from 'lucide-react';

interface OperationModeToggleProps {
  rundownId: string;
}

export const OperationModeToggle: React.FC<OperationModeToggleProps> = ({
  rundownId
}) => {
  const {
    isOperationMode,
    isLoading,
    canToggle,
    toggleOperationMode
  } = useRundownOperationMode({
    rundownId
  });

  if (isLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">Checking operation mode...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Operation Mode</CardTitle>
          </div>
          <Badge variant={isOperationMode ? "default" : "secondary"}>
            {isOperationMode ? "Enabled" : "Disabled"}
          </Badge>
        </div>
        <CardDescription>
          {isOperationMode 
            ? "Google Sheets-style real-time collaboration is active"
            : "Traditional save coordination is active"
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Mode Features */}
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {isOperationMode ? "Instant multi-user sync" : "Manual save coordination"}
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {isOperationMode ? "Zero data loss" : "Save-based persistence"}
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {isOperationMode ? "Operation streaming" : "Document versioning"}
            </span>
          </div>
        </div>

        {/* Toggle Control */}
        {canToggle && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <label htmlFor="operation-mode" className="text-sm font-medium">
                Enable Operation Mode
              </label>
              <Switch
                id="operation-mode"
                checked={isOperationMode}
                onCheckedChange={toggleOperationMode}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {isOperationMode 
                ? "Switch to traditional save coordination"
                : "Enable Google Sheets-style real-time collaboration"
              }
            </p>
          </div>
        )}

        {!canToggle && (
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Only team admins and rundown owners can toggle operation mode.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};