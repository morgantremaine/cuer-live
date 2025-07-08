
import { useState } from 'react';
import { useUnifiedNotes } from '@/hooks/useUnifiedNotes';

export const useScratchpadNotes = (rundownId: string) => {
  // Delegate to unified notes system
  const unifiedNotes = useUnifiedNotes(rundownId);
  
  // Add search functionality specific to scratchpad
  const [searchQuery, setSearchQuery] = useState('');

  return {
    ...unifiedNotes,
    searchQuery,
    setSearchQuery
  };
};
