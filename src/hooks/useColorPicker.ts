
import { useState } from 'react';

export const useColorPicker = () => {
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);

  const handleToggleColorPicker = (itemId: string) => {
    setShowColorPicker(showColorPicker === itemId ? null : itemId);
  };

  const handleColorSelect = (id: string, color: string, updateItem: (id: string, field: string, value: string) => void) => {
    updateItem(id, 'color', color);
    setShowColorPicker(null);
  };

  return {
    showColorPicker,
    handleToggleColorPicker,
    handleColorSelect
  };
};
