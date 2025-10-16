import { useWakeFromSleepDetection } from '@/hooks/useWakeFromSleepDetection';

/**
 * Component that detects wake from sleep and shows reconnection status
 * Should be mounted at app root level
 */
const WakeFromSleepDetector = () => {
  useWakeFromSleepDetection();
  return null;
};

export default WakeFromSleepDetector;
