
import { useState, useRef, useMemo } from 'react';
import { BlueprintList } from '@/types/blueprint';
import { RundownItem } from '@/types/rundown';
import { getAvailableColumns } from '@/utils/blueprintUtils';
import { format } from 'date-fns';

export const useBlueprintCore = (items: RundownItem[]) => {
  const [lists, setLists] = useState<BlueprintList[]>([]);
  const [showDate, setShowDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savedBlueprint, setSavedBlueprint] = useState<any>(null);
  
  const stateRef = useRef({
    currentRundownId: '',
    isInitializing: false
  });

  const availableColumns = useMemo(() => getAvailableColumns(items), [items]);

  const generateListId = (sourceColumn: string) => {
    return `${sourceColumn}_${Date.now()}_${Math.random()}`;
  };

  return {
    lists,
    setLists,
    showDate,
    setShowDate,
    initialized,
    setInitialized,
    loading,
    setLoading,
    savedBlueprint,
    setSavedBlueprint,
    availableColumns,
    stateRef,
    generateListId
  };
};
