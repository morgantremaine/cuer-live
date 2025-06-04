
import React from 'react';
import RundownCard from './RundownCard';
import { RundownItem } from '@/hooks/useRundownItems';

interface SavedRundown {
  id: string;
  title: string;
  items: RundownItem[];
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DashboardRundownGridProps {
  title: string;
  rundowns: SavedRundown[];
  loading: boolean;
  onCreateNew?: () => void;
  onOpen: (rundownId: string) => void;
  onDelete: (rundownId: string, title: string, e: React.MouseEvent) => void;
  onArchive?: (rundownId: string, title: string, e: React.MouseEvent) => void;
  onUnarchive?: (rundownId: string, title: string, items: RundownItem[], e: React.MouseEvent) => void;
  onDuplicate: (rundownId: string, title: string, items: RundownItem[], e: React.MouseEvent) => void;
  isArchived?: boolean;
  showEmptyState: boolean;
}

const DashboardRundownGrid = ({
  title,
  rundowns,
  loading,
  onCreateNew,
  onOpen,
  onDelete,
  onArchive,
  onUnarchive,
  onDuplicate,
  isArchived = false,
  showEmptyState
}: DashboardRundownGridProps) => {
  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg p-6 animate-pulse">
              <div className="h-6 bg-gray-700 rounded mb-4"></div>
              <div className="h-4 bg-gray-700 rounded mb-2"></div>
              <div className="h-4 bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (rundowns.length === 0 && !showEmptyState) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-white mb-4">{title}</h2>
      
      {rundowns.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No rundowns yet</h3>
          <p className="text-gray-400 mb-6">Get started by creating your first rundown</p>
          {onCreateNew && (
            <button
              onClick={onCreateNew}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Create New Rundown
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rundowns.map((rundown) => (
            <RundownCard
              key={rundown.id}
              rundown={rundown}
              onOpen={onOpen}
              onDelete={onDelete}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
              onDuplicate={onDuplicate}
              isArchived={isArchived}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardRundownGrid;
