
import React from 'react';
import { Eye, EyeOff, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTeamCustomColumns } from '@/hooks/useTeamCustomColumns';

interface Column {
  id: string;
  name: string;
  key: string;
  width: string;
  isCustom: boolean;
  isEditable: boolean;
  isVisible?: boolean;
  isTeamColumn?: boolean;
  createdBy?: string;
}

interface TeamCustomColumnsProps {
  columns: Column[];
  onToggleColumnVisibility: (columnId: string) => void;
}

const TeamCustomColumns = ({ columns, onToggleColumnVisibility }: TeamCustomColumnsProps) => {
  const { teamColumns, loading } = useTeamCustomColumns();

  if (loading) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="h-4 w-4" />
          Team Custom Columns
        </h3>
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  // Filter team columns that exist in the current column layout
  const availableTeamColumns = columns.filter(col => 
    col.isCustom && (col as any).isTeamColumn
  );

  if (availableTeamColumns.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="h-4 w-4" />
          Team Custom Columns
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          No team custom columns available. When a teammate creates a custom column, it will appear here.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
        <Users className="h-4 w-4" />
        Team Custom Columns
      </h3>
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        Custom columns created by your teammates. Click to show/hide in your rundown.
      </div>
      <div className="space-y-1">
        {availableTeamColumns.map((column) => (
          <div
            key={column.id}
            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-md"
          >
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {column.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                (Team column)
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleColumnVisibility(column.id)}
              className="h-8 w-8 p-0"
            >
              {column.isVisible ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamCustomColumns;
