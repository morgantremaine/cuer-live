
export interface CrewMember {
  id: string;
  role: string;
  name: string;
  phone: string;
  email: string;
}

export interface CrewListProps {
  rundownId: string;
  rundownTitle: string;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent, listId: string) => void;
  onDragEnterContainer?: (e: React.DragEvent, index: number) => void;
  onDragEnd?: () => void;
}
