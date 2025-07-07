export function cleanMessage(aiMessage: string): string {
  console.log('🔧 PARSER: Processing AI message:', aiMessage);
  
  // Extract modification requests if present - handle both formats
  let modificationMatch = aiMessage.match(/(?:\*\*)?MODIFICATION_REQUEST:(?:\*\*)?\s*\n?\s*```json\s*([\s\S]*?)\s*```/);
  let matchedPattern = 'codeblock';
  
  if (!modificationMatch) {
    // More robust pattern that captures the complete JSON object
    modificationMatch = aiMessage.match(/(?:\*\*)?MODIFICATION_REQUEST:(?:\*\*)?\s*\n?\s*(\{[\s\S]*?\})/);
    matchedPattern = 'direct';
  }
  
  console.log('🔧 PARSER: Modification match found:', !!modificationMatch, 'Pattern:', matchedPattern);
  
  if (modificationMatch) {
    console.log('🔧 PARSER: Raw JSON:', modificationMatch[1]);
    try {
      const modificationData = JSON.parse(modificationMatch[1]);
      console.log('🔧 PARSER: Parsed data:', modificationData);
      
      // Clean the message based on the matched pattern
      let cleanedMessage = aiMessage;
      if (matchedPattern === 'codeblock') {
        cleanedMessage = aiMessage.replace(/(?:\*\*)?MODIFICATION_REQUEST:(?:\*\*)?\s*\n?\s*```json\s*[\s\S]*?\s*```/, '').trim();
      } else if (matchedPattern === 'direct') {
        cleanedMessage = aiMessage.replace(/(?:\*\*)?MODIFICATION_REQUEST:(?:\*\*)?\s*\n?\s*\{[\s\S]*?\}/, '').trim();
      }
      
      const result = `${cleanedMessage}\n\n__CUER_MODIFICATIONS__:${JSON.stringify(modificationData)}`;
      console.log('🔧 PARSER: Final result:', result);
      return result;
    } catch (error) {
      console.error('🔧 PARSER: Failed to parse modification JSON:', error);
      // Return original message without the malformed JSON
      if (matchedPattern === 'codeblock') {
        return aiMessage.replace(/(?:\*\*)?MODIFICATION_REQUEST:(?:\*\*)?\s*\n?\s*```json\s*[\s\S]*?\s*```/, '').trim();
      } else {
        return aiMessage.replace(/(?:\*\*)?MODIFICATION_REQUEST:(?:\*\*)?\s*\n?\s*\{[\s\S]*?\}/, '').trim();
      }
    }
  }
  
  console.log('🔧 PARSER: No modifications found');
  // For non-modification messages, just clean up any accidental structured output
  return aiMessage.replace(/MODIFICATIONS:\s*\[.*?\]/s, '').trim();
}