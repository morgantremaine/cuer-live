import { useBulletproofNotesState } from './useBulletproofNotesState';

export const useExternalNotes = (rundownId: string) => {
  return useBulletproofNotesState(rundownId);
};