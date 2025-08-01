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
  // Extract modifications from __CUER_MODIFICATIONS__ blocks
  const modificationRegex = /__CUER_MODIFICATIONS__\s*([\s\S]*?)__CUER_MODIFICATIONS__/g;
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

  // Remove modification blocks from content
  content = content.replace(modificationRegex, '').trim();

  return {
    content,
    modifications
  };
}

export function cleanMessage(aiMessage: string): string {
  // For backward compatibility, strip any legacy modification formats
  let cleaned = aiMessage.replace(/MODIFICATIONS:\s*\[.*?\]/s, '').trim();
  
  // Also clean the new format for display
  cleaned = cleaned.replace(/__CUER_MODIFICATIONS__\s*[\s\S]*?__CUER_MODIFICATIONS__/g, '').trim();
  
  return cleaned;
}