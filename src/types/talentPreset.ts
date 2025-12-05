export interface TalentPreset {
  slot: number; // 0-9
  name: string;
  color?: string; // Optional color - if set, formats as [NAME {color}], if not set, plain text
}
