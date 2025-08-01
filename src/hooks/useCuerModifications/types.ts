
export interface RundownModification {
  type: 'add' | 'update' | 'delete';
  itemId?: string;
  data?: any;
  position?: {
    type: 'after' | 'before' | 'at';
    itemId?: string;
    index?: number;
  };
  description: string;
}
