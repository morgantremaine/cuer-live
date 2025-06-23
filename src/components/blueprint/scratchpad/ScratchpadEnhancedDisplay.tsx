
import React from 'react';

interface ScratchpadEnhancedDisplayProps {
  content: string;
  onClick: () => void;
  height?: number;
}

const ScratchpadEnhancedDisplay = ({
  content,
  onClick,
  height = 300
}: ScratchpadEnhancedDisplayProps) => {
  
  // Enhanced markdown-like rendering
  const renderContent = (text: string) => {
    if (!text) {
      return (
        <span className="text-gray-400 italic">
          Click to add your show notes, reminders, and scratchpad content...
        </span>
      );
    }

    // Process the text for various formatting
    let processedText = text
      // Headers
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold text-blue-300 mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-blue-200 mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-blue-100 mt-4 mb-2">$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-yellow-200">$1</strong>')
      // Italic
      .replace(/(?<!\*)\*(?!\*)([^*]+?)(?<!\*)\*(?!\*)/g, '<em class="italic text-green-200">$1</em>')
      // Underline
      .replace(/<u>(.*?)<\/u>/g, '<u class="underline text-purple-200">$1</u>')
      // Strikethrough
      .replace(/~~(.*?)~~/g, '<span class="line-through text-red-300">$1</span>')
      // Code blocks
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-800 p-2 rounded border border-gray-600 text-green-400 font-mono text-sm my-2"><code>$1</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1 rounded text-green-400 font-mono text-sm">$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 underline hover:text-blue-300" target="_blank" rel="noopener noreferrer">$1</a>')
      // Checkboxes
      .replace(/- \[ \]/g, '<span class="inline-flex items-center"><input type="checkbox" class="mr-2" disabled /></span>')
      .replace(/- \[x\]/g, '<span class="inline-flex items-center"><input type="checkbox" class="mr-2" checked disabled /></span>')
      // Bullet lists
      .replace(/^• (.*)$/gm, '<div class="flex items-start"><span class="text-yellow-400 mr-2">•</span><span>$1</span></div>')
      // Numbered lists (simple detection)
      .replace(/^(\d+)\. (.*)$/gm, '<div class="flex items-start"><span class="text-blue-400 mr-2 font-mono">$1.</span><span>$2</span></div>')
      // Line breaks
      .replace(/\n/g, '<br />');

    // Handle tables (basic markdown table support)
    processedText = processedText.replace(/\|(.+?)\|/g, (match, content) => {
      if (content.includes('---')) {
        return ''; // Skip separator rows
      }
      const cells = content.split('|').map((cell: string) => cell.trim()).filter((cell: string) => cell);
      const cellsHtml = cells.map((cell: string) => `<td class="border border-gray-600 px-2 py-1">${cell}</td>`).join('');
      return `<tr>${cellsHtml}</tr>`;
    });

    // Wrap table rows in table
    if (processedText.includes('<tr>')) {
      processedText = processedText.replace(/(<tr>.*?<\/tr>)/gs, '<table class="border-collapse border border-gray-600 my-2">$1</table>');
    }

    return <div dangerouslySetInnerHTML={{ __html: processedText }} />;
  };

  return (
    <div 
      data-scratchpad-display
      className="p-3 border rounded-md bg-gray-900 border-gray-600 text-base leading-relaxed cursor-pointer text-white overflow-auto"
      style={{ minHeight: `${height}px` }}
      onClick={onClick}
    >
      {renderContent(content)}
    </div>
  );
};

export default ScratchpadEnhancedDisplay;
