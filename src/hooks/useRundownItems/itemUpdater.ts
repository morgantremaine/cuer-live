
import { RundownItem } from '@/types/rundown';

export const updateRundownItem = (item: RundownItem, field: string, value: string): RundownItem => {
  // Handle nested custom field updates
  if (field.startsWith('customFields.')) {
    const customFieldKey = field.replace('customFields.', '');
    
    return {
      ...item,
      customFields: {
        ...item.customFields,
        [customFieldKey]: value
      }
    };
  }
  
  // Handle regular field updates
  return { ...item, [field]: value };
};
