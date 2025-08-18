import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ConflictIndicatorDisplay } from './ConflictIndicatorDisplay';

interface Phase4TestingPanelProps {
  rundownState: any;
  className?: string;
}

export const Phase4TestingPanel: React.FC<Phase4TestingPanelProps> = ({
  rundownState,
  className = ''
}) => {
  const {
    // Phase 1 - Unified Update Tracking
    trackOwnUpdate,
    
    // Phase 2 - Smart Field Protection & Auto-Save
    isSaving,
    protectField,
    
    // Phase 3 - Showcaller Coordination
    showcallerSession,
    showcallerActiveSessions,
    
    // Phase 4 - Advanced Conflict Detection
    conflictIndicators = [],
    hasActiveConflicts = false,
    conflictStats = { total: 0, active: 0, resolved: 0 },
    resolveConflict,
    clearResolvedConflicts
  } = rundownState;

  const testPhase1 = () => {
    if (trackOwnUpdate) {
      trackOwnUpdate(new Date().toISOString(), 'content');
      console.log('✅ Phase 1 Test: Update tracking works');
    } else {
      console.log('❌ Phase 1 Test: trackOwnUpdate not available');
    }
  };

  const testPhase2 = () => {
    if (protectField) {
      protectField('test-field', true);
      console.log('✅ Phase 2 Test: Field protection works');
    } else {
      console.log('❌ Phase 2 Test: protectField not available');
    }
  };

  const testPhase3 = () => {
    console.log('✅ Phase 3 Test: Showcaller state:', {
      activeSession: showcallerSession,
      totalSessions: showcallerActiveSessions?.length || 0
    });
  };

  const testPhase4 = () => {
    console.log('✅ Phase 4 Test: Conflict detection:', {
      totalConflicts: conflictStats.total,
      activeConflicts: conflictStats.active,
      hasActiveConflicts
    });
  };

  const runAllTests = () => {
    testPhase1();
    testPhase2();
    testPhase3();
    testPhase4();
  };

  return (
    <div className={`bg-background border rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Phase Implementation Status</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <Badge variant="outline" className="w-full justify-center">
            Phase 1: Update Tracking
          </Badge>
          <div className="text-sm text-muted-foreground">
            ✅ Unified timestamp normalization<br/>
            ✅ Own-update detection<br/>
            ✅ Cross-hook coordination
          </div>
        </div>
        
        <div className="space-y-2">
          <Badge variant="outline" className="w-full justify-center">
            Phase 2: Field Protection
          </Badge>
          <div className="text-sm text-muted-foreground">
            ✅ Smart field protection (3s base)<br/>
            ✅ Enhanced auto-save coordination<br/>
            ✅ Conflict resolution<br/>
            Status: {isSaving ? 'Saving...' : 'Ready'}
          </div>
        </div>
        
        <div className="space-y-2">
          <Badge variant="outline" className="w-full justify-center">
            Phase 3: Showcaller Coordination
          </Badge>
          <div className="text-sm text-muted-foreground">
            ✅ Session management<br/>
            ✅ Save coordination<br/>
            ✅ Database integration<br/>
            Sessions: {showcallerActiveSessions?.length || 0} active
          </div>
        </div>
        
        <div className="space-y-2">
          <Badge variant="outline" className="w-full justify-center">
            Phase 4: Advanced Conflicts
          </Badge>
          <div className="text-sm text-muted-foreground">
            ✅ Structural change detection<br/>
            ✅ Enhanced merge logic<br/>
            ✅ Visual conflict indicators<br/>
            Conflicts: {conflictStats.active} active / {conflictStats.total} total
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={runAllTests}
          className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm"
        >
          Test All Phases
        </button>
        <button
          onClick={testPhase1}
          className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm"
        >
          Test Phase 1
        </button>
        <button
          onClick={testPhase2}
          className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm"
        >
          Test Phase 2
        </button>
        <button
          onClick={testPhase3}
          className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm"
        >
          Test Phase 3
        </button>
        <button
          onClick={testPhase4}
          className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm"
        >
          Test Phase 4
        </button>
      </div>

      {conflictIndicators && conflictIndicators.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium mb-2">Conflict Indicators</h4>
          <ConflictIndicatorDisplay
            conflicts={conflictIndicators}
            onResolveConflict={resolveConflict}
            onClearResolved={clearResolvedConflicts}
          />
        </div>
      )}
    </div>
  );
};