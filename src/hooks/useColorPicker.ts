
import { useState } from 'react';

export const useColorPicker = () => {
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);

  const handleToggleColorPicker = (itemId: string) => {
    setShowColorPicker(showColorPicker === itemId ? null : itemId);
  };

  const handleColorSelect = (id: string, color: string) => {
    setShowColorPicker(null);
  };

  return {
    showColorPicker,
    handleToggleColorPicker,
    handleColorSelect
  };
};
