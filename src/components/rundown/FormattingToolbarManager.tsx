import React, { useEffect, useState } from 'react';
import InlineFormattingToolbar from '@/components/cells/InlineFormattingToolbar';
import { FormatStates } from '@/components/cells/RichTextCell';

interface FormattingToolbarManagerProps {
  activeCell: HTMLDivElement | null;
  formatStates: FormatStates;
}

const FormattingToolbarManager: React.FC<FormattingToolbarManagerProps> = ({
  activeCell,
  formatStates
}) => {
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (activeCell) {
      const updatePosition = () => {
        const rect = activeCell.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        // Position toolbar above the cell, centered
        const top = rect.top + scrollTop;
        const left = rect.left + scrollLeft + (rect.width / 2) - 150; // 150 is approx half toolbar width
        
        setToolbarPosition({ top, left });
        setIsVisible(true);
      };

      updatePosition();

      // Update position on scroll or resize
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    } else {
      setIsVisible(false);
    }
  }, [activeCell]);

  const handleFormat = (action: string, value?: string) => {
    if (!activeCell) return;

    // Call the formatting function exposed on the contentEditable div
    const formatFunctions: { [key: string]: string } = {
      bold: 'applyBold',
      italic: 'applyItalic',
      underline: 'applyUnderline',
      strikeThrough: 'applyStrikethrough',
      foreColor: 'applyTextColor'
    };

    const functionName = formatFunctions[action];
    if (functionName && (activeCell as any)[functionName]) {
      (activeCell as any)[functionName](value);
    }
  };

  return (
    <InlineFormattingToolbar
      isVisible={isVisible}
      position={toolbarPosition}
      formatStates={formatStates}
      onFormat={handleFormat}
    />
  );
};

export default FormattingToolbarManager;
