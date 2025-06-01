
import { RundownModification } from './types.ts';

export function parseModifications(aiMessage: string): RundownModification[] {
  let modifications: RundownModification[] = [];
  const modificationMatch = aiMessage.match(/MODIFICATIONS:\s*(\[.*?\])/s);
  
  if (modificationMatch) {
    try {
      const modificationText = modificationMatch[1].trim();
      console.log('Raw modification text:', modificationText);
      
      if (modificationText !== '[]' && modificationText.length > 2) {
        modifications = JSON.parse(modificationText);
        console.log('Successfully parsed modifications:', modifications);
      } else {
        console.log('Empty modification array detected');
      }
    } catch (e) {
      console.error('Failed to parse modifications:', e);
      console.error('Raw modification text:', modificationMatch[1]);
    }
  }
  
  return modifications;
}

export function cleanMessage(aiMessage: string): string {
  return aiMessage.replace(/MODIFICATIONS:\s*\[.*?\]/s, '').trim();
}
