
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RefreshCw, FileText, Clock } from 'lucide-react';
import AddListDialog from './AddListDialog';

interface BlueprintHeaderProps {
  rundown: {
    id: string;
    title: string;
    startTime?: string;
  };
  availableColumns: { name: string; value: string }[];
  onAddList: (name: string, sourceColumn: string) => void;
  onRefreshAll: () => void;
}

const BlueprintHeader = ({
  rundown,
  availableColumns,
  onAddList,
  onRefreshAll
}: BlueprintHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col space-y-6 mb-8">
      <div>
        <div className="mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-white break-words">{rundown.title}</h1>
          <p className="text-gray-400">Blueprint</p>
        </div>
        
        {/* Start Time Section */}
        {rundown.startTime && (
          <div className="flex items-center space-x-2 text-gray-300 mb-4">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Start Time: {rundown.startTime}</span>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-2">
          <AddListDialog
            availableColumns={availableColumns}
            onAddList={onAddList}
          />
          <Button
            variant="outline"
            onClick={onRefreshAll}
            className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600 hover:border-gray-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/rundown/${rundown.id}`)}
            className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600 hover:border-gray-500"
          >
            <FileText className="h-4 w-4 mr-2" />
            Rundown
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BlueprintHeader;
