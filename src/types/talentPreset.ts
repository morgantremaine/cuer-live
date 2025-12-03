export interface TalentPreset {
  slot: number; // 1-9
  name: string;
  color?: string; // Optional color for visual identification
  type?: 'talent' | 'text'; // 'talent' formats as [NAME {color}], 'text' inserts plain text
}
