
export interface ScratchpadNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScratchpadState {
  notes: ScratchpadNote[];
  activeNoteId: string | null;
  isEditing: boolean;
}
