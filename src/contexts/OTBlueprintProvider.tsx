/**
 * Enhanced Blueprint Provider with OT Integration
 * 
 * Wraps the existing BlueprintProvider with operational transform capabilities
 */

import React, { useEffect } from 'react';
import { BlueprintProvider } from '@/contexts/BlueprintContext';
import { useOTIntegration } from '@/hooks/useOTIntegration';
import { ConflictResolver } from '@/components/collaborative/ConflictResolver';
import { RundownItem } from '@/types/rundown';

interface OTBlueprintProviderProps {
  children: React.ReactNode;
  rundownId: string;
  rundownTitle: string;
  rundownItems?: RundownItem[];
  rundownData?: any;
  otEnabled?: boolean;
}

export const OTBlueprintProvider: React.FC<OTBlueprintProviderProps> = ({
  children,
  rundownId,
  rundownTitle,
  rundownItems = [],
  rundownData,
  otEnabled = true
}) => {
  const otIntegration = useOTIntegration({
    rundownId,
    rundownData: rundownData || { id: rundownId, title: rundownTitle, items: rundownItems },
    enabled: otEnabled
  });

  return (
    <BlueprintProvider
      rundownId={rundownId}
      rundownTitle={rundownTitle}
      rundownItems={rundownItems}
    >
      {children}
      {otIntegration.isOTEnabled && <ConflictResolver />}
    </BlueprintProvider>
  );
};