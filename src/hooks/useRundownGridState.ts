
import { useParams } from 'react-router-dom';
import { useRundownDataManagement } from './useRundownDataManagement';
import { useRundownGridCore } from './useRundownGridCore';
import { useRundownGridHandlers } from './useRundownGridHandlers';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownGridUI } from './useRundownGridUI';

export const useRundownGridState = () => {
  const { rundownId } = useParams<{ rundownId: string }>();
  
  console.log('useRundownGridState - rundownId from params:', rundownId);
  
  // Get all data management functionality including polling - pass the rundownId explicitly
  const dataManagement = useRundownDataManagement(rundownId);
  
  // Get core grid functionality
  const gridCore = useRundownGridCore();
  
  // Get grid handlers with proper parameters
  const gridHandlers = useRundownGridHandlers({
    updateItem: gridCore.updateItem,
    addRow: gridCore.addRow,
    addHeader: gridCore.addHeader,
    deleteRow: gridCore.deleteRow,
    toggleFloatRow: gridCore.toggleFloatRow,
    deleteMultipleRows: gridCore.deleteMultipleRows,
    addMultipleRows: gridCore.addMultipleRows,
    handleDeleteColumn: gridCore.handleDeleteColumn,
    setItems: gridCore.setItems,
    calculateEndTime: gridCore.calculateEndTime,
    selectColor: (id: string, color: string) => gridCore.updateItem(id, 'color', color),
    markAsChanged: gridCore.markAsChanged,
    selectedRows: new Set(),
    clearSelection: () => {},
    copyItems: () => {},
    clipboardItems: [],
    hasClipboardData: () => false,
    toggleRowSelection: () => {},
    items: gridCore.items,
    setRundownTitle: gridCore.setRundownTitle
  });
  
  // Get grid interactions
  const gridInteractions = useRundownGridInteractions(
    gridCore.items,
    gridCore.setItems,
    gridCore.updateItem,
    gridCore.addRow,
    gridCore.addHeader,
    gridCore.deleteRow,
    gridCore.toggleFloatRow,
    gridCore.deleteMultipleRows,
    gridCore.addMultipleRows,
    gridCore.handleDeleteColumn,
    gridCore.calculateEndTime,
    (id: string, color: string) => gridCore.updateItem(id, 'color', color),
    gridCore.markAsChanged,
    gridCore.setRundownTitle
  );
  
  // Get UI state
  const gridUI = useRundownGridUI(
    gridCore.items,
    gridCore.visibleColumns,
    gridCore.columns,
    gridCore.updateItem,
    gridCore.currentSegmentId || null,
    gridCore.currentTime,
    gridCore.markAsChanged
  );

  return {
    // Data management (includes polling)
    ...dataManagement,
    
    // Core grid functionality
    ...gridCore,
    
    // Grid handlers
    ...gridHandlers,
    
    // Grid interactions
    ...gridInteractions,
    
    // UI state
    ...gridUI,
    
    // Ensure rundownId is available - use the one from data management which handles URL params
    rundownId: dataManagement.rundownId || rundownId
  };
};
