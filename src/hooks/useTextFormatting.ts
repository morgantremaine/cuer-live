import { useState, useEffect, useCallback } from 'react';

interface SelectionState {
  show: boolean;
  position: { x: number; y: number };
  selectedText: string;
  element: HTMLTextAreaElement | HTMLInputElement | null;
}

export const useTextFormatting = () => {
  const [selection, setSelection] = useState<SelectionState>({
    show: false,
    position: { x: 0, y: 0 },
    selectedText: '',
    element: null
  });

  const handleSelection = useCallback(() => {
    const selectedText = window.getSelection()?.toString();
    const activeElement = document.activeElement as HTMLTextAreaElement | HTMLInputElement;
    
    // Check if we're in a textarea or input within the rundown
    const isTextArea = activeElement?.tagName === 'TEXTAREA';
    const isInput = activeElement?.tagName === 'INPUT';
    const isInRundown = activeElement?.closest('.rundown-table') !== null;
    
    if ((isTextArea || isInput) && isInRundown && selectedText && selectedText.length > 0) {
      const range = window.getSelection()?.getRangeAt(0);
      if (range) {
        const rect = range.getBoundingClientRect();
        
        setSelection({
          show: true,
          position: {
            x: rect.left + (rect.width / 2),
            y: rect.top + window.scrollY
          },
          selectedText,
          element: activeElement
        });
      }
    } else {
      setSelection(prev => ({ ...prev, show: false }));
    }
  }, []);

  const applyFormatting = useCallback((
    format: 'bold' | 'italic' | 'underline' | 'strikethrough',
    color?: string
  ) => {
    const { element, selectedText } = selection;
    if (!element || !selectedText) return;

    const start = element.selectionStart!;
    const end = element.selectionEnd!;
    const value = element.value;

    let formattedText = '';
    
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'underline':
        formattedText = `__${selectedText}__`;
        break;
      case 'strikethrough':
        formattedText = `~~${selectedText}~~`;
        break;
    }

    const newValue = value.substring(0, start) + formattedText + value.substring(end);
    
    // Update the textarea value
    element.value = newValue;
    
    // Trigger input event to ensure the change is detected
    const event = new Event('input', { bubbles: true });
    element.dispatchEvent(event);
    
    // Hide toolbar
    setSelection(prev => ({ ...prev, show: false }));
  }, [selection]);

  const applyColor = useCallback((color: string) => {
    const { element, selectedText } = selection;
    if (!element || !selectedText) return;

    const start = element.selectionStart!;
    const end = element.selectionEnd!;
    const value = element.value;

    // Use a color tag format: <color:#hex>text</color>
    const formattedText = `<color:${color}>${selectedText}</color>`;
    const newValue = value.substring(0, start) + formattedText + value.substring(end);
    
    // Update the textarea value
    element.value = newValue;
    
    // Trigger input event
    const event = new Event('input', { bubbles: true });
    element.dispatchEvent(event);
    
    // Hide toolbar
    setSelection(prev => ({ ...prev, show: false }));
  }, [selection]);

  useEffect(() => {
    // Listen for text selection
    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleSelection);
    
    // Handle keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement as HTMLTextAreaElement | HTMLInputElement;
      const isInRundown = activeElement?.closest('.rundown-table') !== null;
      const hasSelection = window.getSelection()?.toString().length! > 0;
      
      if (isInRundown && hasSelection && (e.ctrlKey || e.metaKey)) {
        if (e.key === 'b' || e.key === 'B') {
          e.preventDefault();
          applyFormatting('bold');
        } else if (e.key === 'i' || e.key === 'I') {
          e.preventDefault();
          applyFormatting('italic');
        } else if (e.key === 'u' || e.key === 'U') {
          e.preventDefault();
          applyFormatting('underline');
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    // Hide toolbar when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.text-formatting-toolbar') && !target.closest('textarea') && !target.closest('input')) {
        setSelection(prev => ({ ...prev, show: false }));
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('keyup', handleSelection);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleSelection, applyFormatting]);

  return {
    selection,
    applyFormatting,
    applyColor
  };
};
