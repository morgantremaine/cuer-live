import { useState, useCallback } from 'react';

export interface TextFormattingState {
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isStrikethrough: boolean;
  textColor: string | null;
}

export const useTextFormatting = (
  selectedText: string,
  onApplyFormat: (formattedText: string) => void
) => {
  const [formattingState, setFormattingState] = useState<TextFormattingState>({
    isBold: false,
    isItalic: false,
    isUnderline: false,
    isStrikethrough: false,
    textColor: null,
  });

  const applyBold = useCallback(() => {
    if (!selectedText) return;
    const formatted = `**${selectedText}**`;
    onApplyFormat(formatted);
  }, [selectedText, onApplyFormat]);

  const applyItalic = useCallback(() => {
    if (!selectedText) return;
    const formatted = `*${selectedText}*`;
    onApplyFormat(formatted);
  }, [selectedText, onApplyFormat]);

  const applyUnderline = useCallback(() => {
    if (!selectedText) return;
    const formatted = `<u>${selectedText}</u>`;
    onApplyFormat(formatted);
  }, [selectedText, onApplyFormat]);

  const applyStrikethrough = useCallback(() => {
    if (!selectedText) return;
    const formatted = `~~${selectedText}~~`;
    onApplyFormat(formatted);
  }, [selectedText, onApplyFormat]);

  const applyColor = useCallback((color: string) => {
    if (!selectedText) return;
    const formatted = `<color:${color}>${selectedText}</color>`;
    onApplyFormat(formatted);
  }, [selectedText, onApplyFormat]);

  return {
    formattingState,
    applyBold,
    applyItalic,
    applyUnderline,
    applyStrikethrough,
    applyColor,
  };
};
