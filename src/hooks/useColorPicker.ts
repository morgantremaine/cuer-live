
import { useState } from 'react';

export const useColorPicker = () => {
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);

  const handleToggleColorPicker = (itemId: string) => {
    setShowColorPicker(showColorPicker === itemId ? null : itemId);
  };

  const handleColorSelect = (id: string, color: string) => {
    // Always close the color picker after selection
    setShowColorPicker(null);
  };

  const closeColorPicker = () => {
    setShowColorPicker(null);
  };

  return {
    showColorPicker,
    handleToggleColorPicker,
    handleColorSelect,
    closeColorPicker
  };
};
