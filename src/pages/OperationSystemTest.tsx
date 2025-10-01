import { useOperationBasedRundown } from '@/hooks/useOperationBasedRundown';
import { useAuth } from '@/hooks/useAuth';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/**
 * MINIMAL TEST PAGE - Direct operation system test
 * No coordination, no complex state, just pure operation system
 */
export const OperationSystemTest = () => {
  const { id: rundownId } = useParams();
  const { user } = useAuth();
  
  const operationSystem = useOperationBasedRundown({
    rundownId: rundownId || '',
    userId: user?.id || '',
    enabled: !!rundownId && !!user?.id
  });

  console.log('🧪 TEST PAGE RENDER:', {
    itemCount: operationSystem.items.length,
    isOperationMode: operationSystem.isOperationMode,
    isLoading: operationSystem.isLoading
  });

  const handleAddRow = () => {
    const newItem = {
      id: `test_${Date.now()}`,
      type: 'regular',
      rowNumber: '',
      name: `TEST ROW ${Date.now()}`,
      startTime: '',
      duration: '',
      endTime: '',
      elapsedTime: '',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      images: '',
      notes: '',
      color: '',
      isFloating: false,
      customFields: {}
    };

    console.log('🧪 TEST: Adding row', { newItem });
    operationSystem.handleRowInsert(operationSystem.items.length, newItem);
  };

  const handleDeleteFirst = () => {
    if (operationSystem.items.length > 0) {
      const firstItem = operationSystem.items[0];
      console.log('🧪 TEST: Deleting first row', { itemId: firstItem.id });
      operationSystem.handleRowDelete(firstItem.id);
    }
  };

  if (operationSystem.isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Operation System Test Page</h1>
      
      <div className="bg-gray-100 p-4 rounded">
        <p><strong>Operation Mode:</strong> {operationSystem.isOperationMode ? 'YES ✅' : 'NO ❌'}</p>
        <p><strong>Items Count:</strong> {operationSystem.items.length}</p>
        <p><strong>Queue Length:</strong> {operationSystem.queueLength}</p>
        <p><strong>Is Processing:</strong> {operationSystem.isProcessingOperations ? 'YES' : 'NO'}</p>
        <p><strong>Is Saving:</strong> {operationSystem.isSaving ? 'YES' : 'NO'}</p>
      </div>

      <div className="space-x-2">
        <Button onClick={handleAddRow}>Add Row</Button>
        <Button onClick={handleDeleteFirst} variant="destructive">Delete First Row</Button>
      </div>

      <div className="border rounded p-4">
        <h2 className="font-bold mb-2">Items ({operationSystem.items.length}):</h2>
        {operationSystem.items.length === 0 ? (
          <p className="text-gray-500">No items</p>
        ) : (
          <div className="space-y-2">
            {operationSystem.items.map((item: any, index: number) => (
              <div key={item.id} className="border-l-4 border-blue-500 pl-2">
                <strong>{index + 1}.</strong> {item.name || 'Unnamed'} ({item.id})
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
