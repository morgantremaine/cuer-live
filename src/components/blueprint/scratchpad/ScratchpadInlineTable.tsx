
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Trash2 } from 'lucide-react';

interface TableCell {
  content: string;
}

interface ScratchpadInlineTableProps {
  tableId: string;
  initialRows?: number;
  initialCols?: number;
  initialData?: TableCell[][];
  onUpdate: (tableId: string, data: TableCell[][]) => void;
  onDelete: (tableId: string) => void;
  isEditing: boolean;
}

const ScratchpadInlineTable = ({
  tableId,
  initialRows = 3,
  initialCols = 3,
  initialData,
  onUpdate,
  onDelete,
  isEditing
}: ScratchpadInlineTableProps) => {
  const [tableData, setTableData] = useState<TableCell[][]>(() => {
    if (initialData) return initialData;
    
    return Array(initialRows).fill(null).map(() =>
      Array(initialCols).fill(null).map(() => ({ content: '' }))
    );
  });
  
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  const [showControls, setShowControls] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    onUpdate(tableId, tableData);
  }, [tableData, tableId, onUpdate]);

  const updateCell = (row: number, col: number, content: string) => {
    const newData = [...tableData];
    newData[row][col] = { content };
    setTableData(newData);
  };

  const addRow = () => {
    const newRow = Array(tableData[0].length).fill(null).map(() => ({ content: '' }));
    setTableData([...tableData, newRow]);
  };

  const addColumn = () => {
    const newData = tableData.map(row => [...row, { content: '' }]);
    setTableData(newData);
  };

  const removeRow = (rowIndex: number) => {
    if (tableData.length <= 1) return;
    const newData = tableData.filter((_, index) => index !== rowIndex);
    setTableData(newData);
  };

  const removeColumn = (colIndex: number) => {
    if (tableData[0].length <= 1) return;
    const newData = tableData.map(row => row.filter((_, index) => index !== colIndex));
    setTableData(newData);
  };

  if (!isEditing) {
    return (
      <div className="my-4">
        <table className="border-collapse border border-gray-600 w-full">
          <tbody>
            {tableData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="border border-gray-600 px-2 py-1 text-white bg-gray-800">
                    {cell.content || '\u00A0'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div 
      className="my-4 relative"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {showControls && (
        <div className="absolute -top-8 left-0 flex gap-1 bg-gray-700 p-1 rounded shadow-lg z-10">
          <Button size="sm" variant="ghost" onClick={addRow} className="h-6 w-6 p-0">
            <Plus className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" onClick={addColumn} className="h-6 w-6 p-0">
            <Plus className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(tableId)} className="h-6 w-6 p-0 text-red-400">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
      
      <table ref={tableRef} className="border-collapse border border-gray-600 w-full">
        <tbody>
          {tableData.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, colIndex) => (
                <td 
                  key={colIndex} 
                  className={`border border-gray-600 px-1 py-1 text-white bg-gray-800 relative ${
                    selectedCell?.row === rowIndex && selectedCell?.col === colIndex ? 'ring-2 ring-blue-400' : ''
                  }`}
                >
                  <input
                    type="text"
                    value={cell.content}
                    onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                    onFocus={() => setSelectedCell({row: rowIndex, col: colIndex})}
                    onBlur={() => setSelectedCell(null)}
                    className="w-full bg-transparent outline-none text-white min-h-[20px]"
                    placeholder=""
                  />
                  {selectedCell?.row === rowIndex && selectedCell?.col === colIndex && showControls && (
                    <div className="absolute -right-8 top-0 flex flex-col gap-1">
                      {rowIndex === 0 && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => removeColumn(colIndex)}
                          className="h-4 w-4 p-0 text-red-400"
                        >
                          <Minus className="h-2 w-2" />
                        </Button>
                      )}
                    </div>
                  )}
                  {selectedCell?.row === rowIndex && selectedCell?.col === colIndex && showControls && colIndex === 0 && (
                    <div className="absolute -bottom-6 left-0 flex gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => removeRow(rowIndex)}
                        className="h-4 w-4 p-0 text-red-400"
                      >
                        <Minus className="h-2 w-2" />
                      </Button>
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ScratchpadInlineTable;
