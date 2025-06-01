
export function cleanMessage(message: string): string {
  // Remove any remaining modification-related phrases
  const forbiddenPhrases = [
    /Would you like me to make (?:these |specific )?(?:changes|modifications)\?/gi,
    /I can (?:apply|implement|make) these (?:changes|modifications|suggestions)/gi,
    /Shall I (?:implement|apply) these suggestions\?/gi,
    /Do you want me to (?:apply|make) (?:these )?(?:changes|modifications)\?/gi,
    /Let me know if you(?:'d| would) like me to (?:apply|implement) (?:these )?(?:changes|modifications)/gi,
  ];

  let cleanedMessage = message;
  
  forbiddenPhrases.forEach(phrase => {
    cleanedMessage = cleanedMessage.replace(phrase, '');
  });

  // Clean up any double spaces or trailing punctuation left by removals
  cleanedMessage = cleanedMessage
    .replace(/\s{2,}/g, ' ')
    .replace(/\.\s*$/, '.')
    .trim();

  // If the message ends abruptly after cleaning, add a proper ending
  if (cleanedMessage && !cleanedMessage.match(/[.!?]$/)) {
    cleanedMessage += '. These are suggestions for you to consider implementing manually in your rundown.';
  }

  return cleanedMessage;
}
