
import React from 'react';
import ExpandableScriptCell from '../ExpandableScriptCell';

interface ScriptNotesCellProps {
  value: string;
  itemId: string;
  cellRefKey: string;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  textColor?: string;
  currentHighlight?: {
    startIndex: number;
    endIndex: number;
  } | null;
  onUpdateValue: (value: string) => void;
  onCellClick: (e: React.MouseEvent) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  width?: string;
}

const ScriptNotesCell = ({
  value,
  itemId,
  cellRefKey,
  cellRefs,
  textColor,
  currentHighlight,
  onUpdateValue,
  onCellClick,
  onKeyDown,
  width
}: ScriptNotesCellProps) => {
  return (
    <td className="px-1 py-1 align-middle" onClick={onCellClick} style={{ width }}>
      <ExpandableScriptCell
        value={value}
        itemId={itemId}
        cellRefKey={cellRefKey}
        cellRefs={cellRefs}
        textColor={textColor}
        currentHighlight={currentHighlight}
        onUpdateValue={onUpdateValue}
        onKeyDown={onKeyDown}
      />
    </td>
  );
};

export default ScriptNotesCell;
