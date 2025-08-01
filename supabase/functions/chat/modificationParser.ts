interface RundownModification {
  type: 'add' | 'update' | 'delete';
  itemId?: string;
  data?: any;
  description: string;
}

export interface ParsedMessage {
  content: string;
  modifications: RundownModification[];
}

export function parseMessageWithModifications(aiMessage: string): ParsedMessage {
  // Extract modifications from __CUER_MODIFICATIONS__ blocks (with or without double underscores)
  const modificationRegex = /(?:__)?CUER_MODIFICATIONS(?:__)?[\s\n]*([\s\S]*?)(?:(?:__)?CUER_MODIFICATIONS(?:__)?|$)/g;
  let modifications: RundownModification[] = [];
  let content = aiMessage;

  let match;
  while ((match = modificationRegex.exec(aiMessage)) !== null) {
    try {
      const modificationJson = match[1].trim();
      const parsedMods = JSON.parse(modificationJson);
      if (Array.isArray(parsedMods)) {
        modifications.push(...parsedMods);
      }
    } catch (error) {
      console.error('Failed to parse modification JSON:', error);
    }
  }

  // Remove modification blocks from content (both formats)
  content = content.replace(/(?:__)?CUER_MODIFICATIONS(?:__)?[\s\n]*[\s\S]*?(?:(?:__)?CUER_MODIFICATIONS(?:__)?|$)/g, '').trim();

  return {
    content,
    modifications
  };
}

export function cleanMessage(aiMessage: string): string {
  // For backward compatibility, strip any legacy modification formats
  let cleaned = aiMessage.replace(/MODIFICATIONS:\s*\[.*?\]/s, '').trim();
  
  // Also clean the new format for display (both with and without double underscores)
  cleaned = cleaned.replace(/(?:__)?CUER_MODIFICATIONS(?:__)?[\s\n]*[\s\S]*?(?:(?:__)?CUER_MODIFICATIONS(?:__)?|$)/g, '').trim();
  
  return cleaned;
}