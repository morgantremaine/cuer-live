// This file is deprecated and replaced by pure calculation functions in /utils/rundownCalculations.ts
// Keeping this file to prevent import errors during transition

export const useTimeCalculations = () => {
  // Return no-op functions for backward compatibility
  return {
    calculateEndTime: (startTime: string, duration: string) => '00:00:00',
    getRowStatus: () => 'upcoming' as const,
    isUpdatingTimes: () => false
  };
};
