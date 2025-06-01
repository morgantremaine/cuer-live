
import { RundownModification } from './types.ts';

export function parseModifications(aiMessage: string): RundownModification[] {
  // AI is now analysis-only, never return modifications
  return [];
}

export function cleanMessage(aiMessage: string): string {
  // Remove any leftover modification syntax if present
  return aiMessage.replace(/MODIFICATIONS:\s*\[.*?\]/s, '').trim();
}
