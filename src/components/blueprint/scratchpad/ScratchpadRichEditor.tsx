
import React, { useEffect, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import ScratchpadInlineTable from './ScratchpadInlineTable';

interface TableData {
  id: string;
  rows: number;
  cols: number;
  data: { content: string }[][];
}

interface ScratchpadRichEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  height?: number;
}

const ScratchpadRichEditor = ({
  content,
  onChange,
  placeholder = "Add your show notes, reminders, and scratchpad content here...",
  height = 300
}: ScratchpadRichEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [tables, setTables] = useState<TableData[]>([]);
  const [isEditing, setIsEditing] = useState(true);

  // Parse content to extract tables and text
  useEffect(() => {
    const tableMatches = content.match(/\[TABLE:([^\]]+)\]/g);
    if (tableMatches) {
      const parsedTables = tableMatches.map(match => {
        const tableId = match.match(/\[TABLE:([^\]]+)\]/)?.[1] || '';
        try {
          const savedTable = localStorage.getItem(`scratchpad-table-${tableId}`);
          if (savedTable) {
            return JSON.parse(savedTable);
          }
        } catch (e) {
          console.error('Error parsing table data:', e);
        }
        return {
          id: tableId,
          rows: 3,
          cols: 3,
          data: Array(3).fill(null).map(() => Array(3).fill(null).map(() => ({ content: '' })))
        };
      });
      setTables(parsedTables);
    }
  }, [content]);

  const insertTable = () => {
    if (!textareaRef.current) return;
    
    const tableId = `table-${Date.now()}`;
    const tableMarker = `[TABLE:${tableId}]`;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const newText = textarea.value.substring(0, start) + '\n' + tableMarker + '\n' + textarea.value.substring(start);
    
    onChange(newText);
    
    // Add new table to state
    const newTable: TableData = {
      id: tableId,
      rows: 3,
      cols: 3,
      data: Array(3).fill(null).map(() => Array(3).fill(null).map(() => ({ content: '' })))
    };
    setTables(prev => [...prev, newTable]);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tableMarker.length + 2, start + tableMarker.length + 2);
    }, 0);
  };

  const updateTable = (tableId: string, data: { content: string }[][]) => {
    const updatedTable = { id: tableId, rows: data.length, cols: data[0]?.length || 0, data };
    
    // Save to localStorage
    localStorage.setItem(`scratchpad-table-${tableId}`, JSON.stringify(updatedTable));
    
    // Update state
    setTables(prev => prev.map(table => 
      table.id === tableId ? updatedTable : table
    ));
  };

  const deleteTable = (tableId: string) => {
    // Remove from localStorage
    localStorage.removeItem(`scratchpad-table-${tableId}`);
    
    // Remove from content
    const tableMarker = `[TABLE:${tableId}]`;
    const newContent = content.replace(new RegExp(`\n?\\[TABLE:${tableId}\\]\n?`, 'g'), '');
    onChange(newContent);
    
    // Remove from state
    setTables(prev => prev.filter(table => table.id !== tableId));
  };

  // Apply formatting to selected text
  const applyFormatting = (startTag: string, endTag: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const newText = textarea.value.substring(0, start) + startTag + selectedText + endTag + textarea.value.substring(end);
    
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + startTag.length, end + startTag.length);
    }, 0);
  };

  const insertAtCursor = (text: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const newText = textarea.value.substring(0, start) + text + textarea.value.substring(start);
    
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  // Expose formatting functions to parent
  useEffect(() => {
    const element = textareaRef.current;
    if (element) {
      (element as any).applyBold = () => applyFormatting('**', '**');
      (element as any).applyItalic = () => applyFormatting('*', '*');
      (element as any).applyUnderline = () => applyFormatting('<u>', '</u>');
      (element as any).applyStrikethrough = () => applyFormatting('~~', '~~');
      (element as any).applyHeader = (level: number) => {
        const hashes = '#'.repeat(level);
        insertAtCursor(`${hashes} `);
      };
      (element as any).insertBulletList = () => insertAtCursor('• ');
      (element as any).insertNumberedList = () => insertAtCursor('1. ');
      (element as any).insertCheckbox = () => insertAtCursor('- [ ] ');
      (element as any).insertLink = () => applyFormatting('[', '](url)');
      (element as any).insertCodeBlock = () => applyFormatting('```\n', '\n```');
      (element as any).insertTable = insertTable;
    }
  }, []);

  // Render content with embedded tables
  const renderContentWithTables = () => {
    if (!content) return null;
    
    const parts = content.split(/(\[TABLE:[^\]]+\])/);
    
    return parts.map((part, index) => {
      const tableMatch = part.match(/\[TABLE:([^\]]+)\]/);
      if (tableMatch) {
        const tableId = tableMatch[1];
        const table = tables.find(t => t.id === tableId);
        
        if (table) {
          return (
            <ScratchpadInlineTable
              key={tableId}
              tableId={tableId}
              initialRows={table.rows}
              initialCols={table.cols}
              initialData={table.data}
              onUpdate={updateTable}
              onDelete={deleteTable}
              isEditing={true}
            />
          );
        }
        return <div key={index} className="text-gray-400 italic my-2">[Table not found]</div>;
      }
      
      if (part.trim()) {
        return (
          <div key={index} className="whitespace-pre-wrap">
            {part}
          </div>
        );
      }
      
      return null;
    });
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="resize-y text-base leading-relaxed bg-gray-900 border-gray-600 text-white placeholder-gray-400 font-mono"
        style={{ height: `${height}px`, minHeight: '300px' }}
        autoFocus
      />
      
      {/* Render tables inline */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="p-3 pointer-events-auto">
          {renderContentWithTables()}
        </div>
      </div>
    </div>
  );
};

export default ScratchpadRichEditor;
