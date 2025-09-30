import { sanitizeRichText } from './sanitize';

/**
 * Renders text with markdown-like formatting and color tags
 * Converts: **bold**, *italic*, <u>underline</u>, ~~strikethrough~~, <color:#hex>text</color>
 */
export const renderFormattedText = (text: string): string => {
  if (!text) return '';
  
  return text
    .split('\n')
    .map((line) => {
      let processedLine = line
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
        // Italic (match single asterisk not followed/preceded by another asterisk)
        .replace(/\*([^*]+?)\*/g, '<em class="italic">$1</em>')
        // Underline
        .replace(/<u>(.*?)<\/u>/g, '<u class="underline">$1</u>')
        // Strikethrough
        .replace(/~~(.*?)~~/g, '<span class="line-through">$1</span>')
        // Color tags: <color:#hex>text</color>
        .replace(/<color:(#[0-9a-fA-F]{6})>(.*?)<\/color>/g, '<span style="color: $1">$2</span>');
      
      return sanitizeRichText(processedLine || '&nbsp;');
    })
    .join('<br/>');
};
