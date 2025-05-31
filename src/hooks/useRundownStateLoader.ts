
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownStorage } from '@/hooks/useRundownStorage';

interface UseRundownStateLoaderProps {
  setRundownTitle: (title: string) => void;
}

export const useRundownStateLoader = ({ setRundownTitle }: UseRundownStateLoaderProps) => {
  const { id: rundownId } = useParams<{ id: string }>();
  const { savedRundowns, loading } = useRundownStorage();

  // Load the title from existing rundown
  useEffect(() => {
    if (loading) return;
    
    if (rundownId && savedRundowns.length > 0) {
      const existingRundown = savedRundowns.find(r => r.id === rundownId);
      if (existingRundown) {
        setRundownTitle(existingRundown.title);
      }
    } else if (!rundownId) {
      setRundownTitle('Live Broadcast Rundown');
    }
  }, [rundownId, savedRundowns, loading, setRundownTitle]);

  return {
    rundownId
  };
};
