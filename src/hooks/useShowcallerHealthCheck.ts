
import { useEffect, useRef, useCallback } from 'react';
import { RundownItem } from '@/types/rundown';

interface ShowcallerHealthCheckProps {
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  items: RundownItem[];
  onHealthIssue?: (issue: string) => void;
}

export const useShowcallerHealthCheck = ({
  isPlaying,
  currentSegmentId,
  timeRemaining,
  items,
  onHealthIssue
}: ShowcallerHealthCheckProps) => {
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastHealthCheckRef = useRef<number>(Date.now());
  const consecutiveIssuesRef = useRef<number>(0);

  const performHealthCheck = useCallback(() => {
    const now = Date.now();
    const timeSinceLastCheck = now - lastHealthCheckRef.current;
    lastHealthCheckRef.current = now;

    let issues: string[] = [];

    // Check 1: If playing, ensure we have a valid current segment
    if (isPlaying && !currentSegmentId) {
      issues.push('Playing without current segment');
    }

    // Check 2: If we have a current segment, ensure it exists in items
    if (currentSegmentId) {
      const currentSegment = items.find(item => item.id === currentSegmentId);
      if (!currentSegment) {
        issues.push('Current segment not found in items');
      }
    }

    // Check 3: Check for negative time remaining
    if (timeRemaining < 0) {
      issues.push('Negative time remaining detected');
    }

    // Check 4: Check for time drift (if playing and time hasn't changed)
    if (isPlaying && timeSinceLastCheck > 2000 && timeRemaining > 0) {
      // Time should have decreased if we're playing
      console.log('📺 Health check: Time may be stuck');
    }

    // Check 5: Check for excessive time remaining
    if (currentSegmentId && timeRemaining > 0) {
      const currentSegment = items.find(item => item.id === currentSegmentId);
      if (currentSegment && currentSegment.duration) {
        const maxDuration = parseInt(currentSegment.duration.split(':')[0]) * 3600 + 
                           parseInt(currentSegment.duration.split(':')[1]) * 60;
        if (timeRemaining > maxDuration + 30) { // Allow 30 second buffer
          issues.push('Time remaining exceeds segment duration');
        }
      }
    }

    if (issues.length > 0) {
      consecutiveIssuesRef.current++;
      console.warn('📺 Showcaller health issues detected:', issues);
      
      // Only report after multiple consecutive issues to avoid false positives
      if (consecutiveIssuesRef.current >= 3 && onHealthIssue) {
        onHealthIssue(issues.join(', '));
      }
    } else {
      consecutiveIssuesRef.current = 0;
    }

  }, [isPlaying, currentSegmentId, timeRemaining, items, onHealthIssue]);

  // Start health check monitoring
  useEffect(() => {
    // Only monitor when actively playing
    if (isPlaying) {
      healthCheckIntervalRef.current = setInterval(performHealthCheck, 5000); // Check every 5 seconds
    } else {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }
    }

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, [isPlaying, performHealthCheck]);

  return {
    performHealthCheck
  };
};
