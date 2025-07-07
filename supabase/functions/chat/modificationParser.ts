export function cleanMessage(aiMessage: string): string {
  console.log('🔧 PARSER: Processing AI message:', aiMessage);
  
  // Look for the simple APPLY_CHANGE format
  const changeMatch = aiMessage.match(/APPLY_CHANGE:\s*itemId=([^|]+)\|field=([^|]+)\|value=(.+?)(?=\n|$)/);
  
  if (changeMatch) {
    const [, itemId, field, value] = changeMatch;
    console.log('🔧 PARSER: Found change:', { itemId, field, value });
    
    // Create modification data
    const modificationData = {
      modifications: [{
        type: "update",
        itemId: itemId.trim(),
        data: {
          [field.trim()]: value.trim()
        },
        description: `Updated ${field}`
      }]
    };
    
    // Remove the APPLY_CHANGE line from the message
    const cleanedMessage = aiMessage.replace(/APPLY_CHANGE:\s*itemId=[^|]+\|field=[^|]+\|value=.+?(?=\n|$)/, '').trim();
    
    const result = `${cleanedMessage}\n\n__CUER_MODIFICATIONS__:${JSON.stringify(modificationData)}`;
    console.log('🔧 PARSER: Final result:', result);
    return result;
  }
  
  console.log('🔧 PARSER: No changes found');
  return aiMessage.trim();
}