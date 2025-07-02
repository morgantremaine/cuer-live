
import { RundownItem } from '@/types/rundown';

export interface RundownModification {
  type: 'add' | 'update' | 'delete';
  itemId?: string;
  data?: Partial<RundownItem>;
  description: string;
  targetIndex?: number;
  fieldName?: keyof RundownItem;
  newValue?: string;
}

export interface ModificationRequest {
  modifications: RundownModification[];
  reason: string;
  affectedItemIds: string[];
}

export interface ModificationResult {
  success: boolean;
  appliedCount: number;
  errors: string[];
  modifiedItems: RundownItem[];
}
