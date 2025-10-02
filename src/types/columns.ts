
// Unified column type definitions
export interface BaseColumn {
  id: string;
  key: string;
  name: string;
  isVisible: boolean;
  width: string; // Made required for compatibility
  minWidth?: string;
  maxWidth?: string;
  resizable?: boolean;
  sortable?: boolean;
  type?: 'text' | 'textarea' | 'time' | 'custom';
  isEditable: boolean; // Made required for compatibility with existing system
  isCollapsible?: boolean; // Flag to indicate if column can expand/collapse
}

export interface StandardColumn extends BaseColumn {
  isCustom: false;
  isRequired?: boolean;
}

export interface CustomColumn extends BaseColumn {
  isCustom: true;
  teamId?: string;
  createdBy?: string;
  createdAt?: string;
}

export type Column = StandardColumn | CustomColumn;

// Type guards for better type safety
export const isCustomColumn = (column: Column): column is CustomColumn => {
  return column.isCustom === true;
};

export const isStandardColumn = (column: Column): column is StandardColumn => {
  return column.isCustom === false;
};

// Column validation utilities
export const validateColumn = (column: Partial<Column>): column is Column => {
  return !!(
    column.id &&
    column.key &&
    column.name &&
    typeof column.isVisible === 'boolean' &&
    typeof column.isCustom === 'boolean'
  );
};

// Default column properties
export const DEFAULT_COLUMN_PROPS: Partial<BaseColumn> = {
  isVisible: true,
  width: '120px',
  minWidth: '80px',
  resizable: true,
  sortable: false,
  type: 'text'
};
