
import { useRundownBasicState } from '@/hooks/useRundownBasicState';
import { useRundownStateLoader } from '@/hooks/useRundownStateLoader';
import { useRundownStateIntegration } from '@/hooks/useRundownStateIntegration';

export const useRundownGridState = () => {
  const {
    currentTime,
    timezone,
    setTimezone,
    rundownTitle,
    setRundownTitle,
    rundownStartTime,
    setRundownStartTime
  } = useRundownBasicState();

  const { rundownId } = useRundownStateLoader({ setRundownTitle });

  const integrationState = useRundownStateIntegration({ 
    rundownTitle, 
    rundownStartTime 
  });

  return {
    // Basic state
    currentTime,
    timezone,
    setTimezone,
    rundownTitle,
    setRundownTitle,
    rundownStartTime,
    setRundownStartTime,
    rundownId,
    
    // All integrated state
    ...integrationState
  };
};
