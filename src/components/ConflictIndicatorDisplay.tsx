import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Clock, Users } from 'lucide-react';

interface ConflictIndicator {
  id: string;
  type: 'field' | 'structural' | 'timing';
  severity: 'low' | 'medium' | 'high';
  message: string;
  affectedItems: string[];
  timestamp: string;
  resolved: boolean;
  resolutionStrategy?: string;
}

interface ConflictIndicatorDisplayProps {
  conflicts: ConflictIndicator[];
  onResolveConflict?: (conflictId: string, strategy: string) => void;
  onClearResolved?: () => void;
  className?: string;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'high': return 'destructive';
    case 'medium': return 'default';
    case 'low': return 'secondary';
    default: return 'outline';
  }
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'high': return <AlertTriangle className="h-4 w-4" />;
    case 'medium': return <Clock className="h-4 w-4" />;
    case 'low': return <Users className="h-4 w-4" />;
    default: return <AlertTriangle className="h-4 w-4" />;
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'field': return 'Field Conflict';
    case 'structural': return 'Structure Change';
    case 'timing': return 'Timing Issue';
    default: return 'Conflict';
  }
};

export const ConflictIndicatorDisplay: React.FC<ConflictIndicatorDisplayProps> = ({
  conflicts,
  onResolveConflict,
  onClearResolved,
  className = ''
}) => {
  const activeConflicts = conflicts.filter(c => !c.resolved);
  const resolvedConflicts = conflicts.filter(c => c.resolved);

  if (conflicts.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Active Conflicts */}
      {activeConflicts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-foreground">
              Active Conflicts ({activeConflicts.length})
            </h4>
          </div>
          
          {activeConflicts.map((conflict) => (
            <Alert key={conflict.id} className="border-l-4 border-l-destructive">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2 flex-1">
                  {getSeverityIcon(conflict.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant={getSeverityColor(conflict.severity) as any} className="text-xs">
                        {getTypeLabel(conflict.type)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {conflict.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <AlertDescription className="text-sm">
                      {conflict.message}
                    </AlertDescription>
                    {conflict.affectedItems.length > 0 && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Affects: {conflict.affectedItems.slice(0, 3).join(', ')}
                        {conflict.affectedItems.length > 3 && ` +${conflict.affectedItems.length - 3} more`}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(conflict.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                
                {onResolveConflict && (
                  <div className="flex space-x-1 ml-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onResolveConflict(conflict.id, 'auto-resolve')}
                      className="text-xs h-7"
                    >
                      Auto-Resolve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onResolveConflict(conflict.id, 'manual-resolve')}
                      className="text-xs h-7"
                    >
                      Resolve
                    </Button>
                  </div>
                )}
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Resolved Conflicts Summary */}
      {resolvedConflicts.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Recently Resolved ({resolvedConflicts.length})
            </h4>
            {onClearResolved && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onClearResolved}
                className="text-xs h-6"
              >
                Clear
              </Button>
            )}
          </div>
          
          <div className="space-y-1">
            {resolvedConflicts.slice(-3).map((conflict) => (
              <div key={conflict.id} className="flex items-center space-x-2 p-2 bg-muted/50 rounded text-xs">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span className="flex-1 truncate">{conflict.message}</span>
                <span className="text-muted-foreground">
                  {conflict.resolutionStrategy}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conflict Statistics */}
      {conflicts.length > 0 && (
        <div className="mt-4 p-3 bg-muted/30 rounded text-xs">
          <div className="grid grid-cols-2 gap-2 text-muted-foreground">
            <div>Total Conflicts: {conflicts.length}</div>
            <div>Active: {activeConflicts.length}</div>
            <div>High Priority: {activeConflicts.filter(c => c.severity === 'high').length}</div>
            <div>Resolved: {resolvedConflicts.length}</div>
          </div>
        </div>
      )}
    </div>
  );
};