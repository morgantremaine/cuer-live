export function cleanMessage(aiMessage: string): string {
  // Strip any accidental "MODIFICATIONS: [...]" block if it sneaks into the output
  return aiMessage.replace(/MODIFICATIONS:\s*\[.*?\]/s, '').trim();
}