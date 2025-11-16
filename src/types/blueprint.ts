
export interface BlueprintList {
  id: string;
  name: string;
  sourceColumn: string;
  items: string[];
  checkedItems?: Record<string, boolean>;
  showUniqueOnly?: boolean;
  showItemNumber?: boolean;
  showStartTime?: boolean;
}

export interface Blueprint {
  id: string;
  rundownId: string;
  rundownTitle: string;
  lists: BlueprintList[];
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_BLUEPRINT_LISTS = [
  { name: 'Rundown Overview', sourceColumn: 'headers' },
  { name: 'GFX Assets', sourceColumn: 'gfx' },
  { name: 'Video Assets', sourceColumn: 'video' },
  { name: 'Talent List', sourceColumn: 'talent' }
];
