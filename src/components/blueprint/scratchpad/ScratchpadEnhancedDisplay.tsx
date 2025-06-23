
import React from 'react';
import ScratchpadInlineTable from './ScratchpadInlineTable';

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
  
  // Enhanced markdown-like rendering with table support
  const renderContent = (text: string) => {
    if (!text) {
      return (
        <span className="text-gray-400 italic">
          Click to add your show notes, reminders, and scratchpad content...
        </span>
      );
    }

    // Split content by table markers
    const parts = text.split(/(\[TABLE:[^\]]+\])/);
    
    return parts.map((part, index) => {
      // Check if this part is a table marker
      const tableMatch = part.match(/\[TABLE:([^\]]+)\]/);
      if (tableMatch) {
        const tableId = tableMatch[1];
        
        // Try to load table data from localStorage
        try {
          const savedTable = localStorage.getItem(`scratchpad-table-${tableId}`);
          if (savedTable) {
            const tableData = JSON.parse(savedTable);
            return (
              <ScratchpadInlineTable
                key={tableId}
                tableId={tableId}
                initialRows={tableData.rows}
                initialCols={tableData.cols}
                initialData={tableData.data}
                onUpdate={() => {}} // Read-only in display mode
                onDelete={() => {}} // Read-only in display mode
                isEditing={false}
              />
            );
          }
        } catch (e) {
          console.error('Error loading table data:', e);
        }
        
        return (
          <div key={index} className="my-4 p-2 border border-gray-600 rounded text-gray-400 italic">
            [Table: {tableId}]
          </div>
        );
      }
      
      // Process regular text content for formatting
      if (part.trim()) {
        let processedText = part
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

        return <div key={index} dangerouslySetInnerHTML={{ __html: processedText }} />;
      }
      
      return null;
    });
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
