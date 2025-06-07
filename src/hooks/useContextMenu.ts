
import { useCallback } from 'react';

interface ContextMenuItem {
  label: string;
  action: (() => void) | undefined;
  disabled?: boolean;
}

interface ContextMenuConfig {
  items: ContextMenuItem[];
}

export const useContextMenu = () => {
  const showContextMenu = useCallback((event: React.MouseEvent, config: ContextMenuConfig) => {
    // Prevent the default browser context menu
    event.preventDefault();
    event.stopPropagation();
    
    // For now, we'll implement a simple alert-based context menu
    // This can be enhanced later with a proper dropdown component
    const availableItems = config.items.filter(item => !item.disabled && item.action);
    
    if (availableItems.length === 0) return;
    
    // Create a simple prompt to select an action
    const itemLabels = availableItems.map((item, index) => `${index + 1}. ${item.label}`).join('\n');
    const selection = prompt(`Select an action:\n${itemLabels}\n\nEnter the number of your choice:`);
    
    if (selection) {
      const index = parseInt(selection) - 1;
      if (index >= 0 && index < availableItems.length) {
        availableItems[index].action?.();
      }
    }
  }, []);

  return { showContextMenu };
};
