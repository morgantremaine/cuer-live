
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, RefreshCw, FileText, Clock, Calendar } from 'lucide-react';
import AddListDialog from './AddListDialog';

interface BlueprintHeaderProps {
  rundown: {
    id: string;
    title: string;
    startTime?: string;
  };
  showDate: string;
  availableColumns: { key: string; name: string }[];
  onShowDateUpdate: (date: string) => void;
  onAddList: (name: string, sourceColumn: string) => void;
  onRefreshAll: () => void;
}

const BlueprintHeader = ({
  rundown,
  showDate,
  availableColumns,
  onShowDateUpdate,
  onAddList,
  onRefreshAll
}: BlueprintHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <div>
            <h1 className="text-3xl font-bold text-white">Blueprint</h1>
            <p className="text-gray-400">{rundown.title}</p>
          </div>
        </div>
        
        {/* Start Time and Date Section */}
        <div className="flex items-center space-x-6 mb-4">
          {rundown.startTime && (
            <div className="flex items-center space-x-2 text-gray-300">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Start Time: {rundown.startTime}</span>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-300" />
            <label htmlFor="show-date" className="text-sm text-gray-300">Show Date:</label>
            <Input
              id="show-date"
              type="date"
              value={showDate}
              onChange={(e) => onShowDateUpdate(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white w-40 h-8 text-sm"
            />
          </div>
        </div>
        
        <div className="flex gap-2 justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600 hover:border-gray-500"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
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
          <div className="flex gap-2">
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlueprintHeader;
