export function cleanMessage(aiMessage: string): string {
  // Extract modification requests if present
  const modificationMatch = aiMessage.match(/MODIFICATION_REQUEST:\s*```json\s*([\s\S]*?)\s*```/);
  
  if (modificationMatch) {
    try {
      const modificationData = JSON.parse(modificationMatch[1]);
      // Return the message with the modification data attached as a special marker
      const cleanedMessage = aiMessage.replace(/MODIFICATION_REQUEST:\s*```json\s*[\s\S]*?\s*```/, '').trim();
      return `${cleanedMessage}\n\n__CUER_MODIFICATIONS__:${JSON.stringify(modificationData)}`;
    } catch (error) {
      console.error('Failed to parse modification JSON:', error);
      // Return original message without the malformed JSON
      return aiMessage.replace(/MODIFICATION_REQUEST:\s*```json\s*[\s\S]*?\s*```/, '').trim();
    }
  }
  
  // For non-modification messages, just clean up any accidental structured output
  return aiMessage.replace(/MODIFICATIONS:\s*\[.*?\]/s, '').trim();
}