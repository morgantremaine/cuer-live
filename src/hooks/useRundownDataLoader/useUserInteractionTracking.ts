
import { useEffect } from 'react';

interface UseUserInteractionTrackingProps {
  userHasInteractedRef: React.MutableRefObject<boolean>;
}

export const useUserInteractionTracking = ({
  userHasInteractedRef
}: UseUserInteractionTrackingProps) => {
  // Track user interactions to prevent overwriting their changes
  useEffect(() => {
    const handleUserInteraction = () => {
      console.log('User interaction detected, marking as interacted');
      userHasInteractedRef.current = true;
    };

    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('keydown', handleUserInteraction, { once: true });
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [userHasInteractedRef]);
};
