
import React, { useState } from 'react';
import { Eye, EyeOff, Users, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTeamCustomColumns } from '@/hooks/useTeamCustomColumns';
import { useTeam } from '@/hooks/useTeam';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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
  const { teamColumns, loading, deleteTeamColumn } = useTeamCustomColumns();
  const { userRole } = useTeam();
  const [deletingColumns, setDeletingColumns] = useState<Set<string>>(new Set());

  // Check if current user is team admin
  const isTeamAdmin = userRole === 'admin';

  const handleDeleteColumn = async (columnId: string, columnName: string) => {
    if (!window.confirm(`Are you sure you want to delete the "${columnName}" column? This will remove it for all team members and may affect existing rundowns.`)) {
      return;
    }

    setDeletingColumns(prev => new Set(prev).add(columnId));
    
    try {
      const result = await deleteTeamColumn(columnId);
      
      if (result.success) {
        toast.success(result.message);
        if (result.warning) {
          toast.warning(result.warning);
        }
      } else {
        toast.error(result.error || 'Failed to delete column');
      }
    } catch (error) {
      toast.error('Failed to delete column');
    } finally {
      setDeletingColumns(prev => {
        const newSet = new Set(prev);
        newSet.delete(columnId);
        return newSet;
      });
    }
  };

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

  if (teamColumns.length === 0) {
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

  // Create a map of current columns by key for quick lookup
  const currentColumnMap = new Map(columns.map(col => [col.key, col]));

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
        {teamColumns.map((teamCol) => {
          // Check if this team column is currently in the layout
          const currentColumn = currentColumnMap.get(teamCol.column_key);
          const isVisible = currentColumn?.isVisible !== false;
          
          return (
            <div
              key={teamCol.id}
              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-md"
            >
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {teamCol.column_name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  (Team column)
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleColumnVisibility(currentColumn?.id || teamCol.column_key)}
                  className="h-8 w-8 p-0"
                >
                  {isVisible ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
                {isTeamAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteColumn(teamCol.id, teamCol.column_name)}
                    disabled={deletingColumns.has(teamCol.id)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TeamCustomColumns;
