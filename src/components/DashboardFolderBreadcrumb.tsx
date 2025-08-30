
import React from 'react';
import { ChevronRight, FileText, Clock, Archive, Folder } from 'lucide-react';
import { RundownFolder } from '@/hooks/useRundownFolders';

interface DashboardFolderBreadcrumbProps {
  selectedFolder: string | null;
  folderType: 'all' | 'recent' | 'archived' | 'custom';
  customFolders: RundownFolder[];
}

const DashboardFolderBreadcrumb: React.FC<DashboardFolderBreadcrumbProps> = ({
  selectedFolder,
  folderType,
  customFolders
}) => {
  const getFolderInfo = () => {
    switch (folderType) {
      case 'all':
        return { name: 'All Rundowns', icon: FileText };
      case 'recent':
        return { name: 'Recently Active', icon: Clock };
      case 'archived':
        return { name: 'Archived', icon: Archive };
      case 'custom':
        const customFolder = customFolders.find(f => f.id === selectedFolder);
        return { 
          name: customFolder?.name || 'Custom Folder', 
          icon: Folder,
          color: customFolder?.color 
        };
      default:
        return { name: 'All Rundowns', icon: FileText };
    }
  };

  const folderInfo = getFolderInfo();
  const IconComponent = folderInfo.icon;

  return (
    <div className="flex items-center space-x-2 text-gray-400 text-sm mb-4">
      <FileText className="h-4 w-4" />
      <span>Dashboard</span>
      <ChevronRight className="h-3 w-3" />
      <IconComponent 
        className="h-4 w-4" 
        style={folderInfo.color ? { color: folderInfo.color } : {}}
      />
      <span className="text-white">{folderInfo.name}</span>
    </div>
  );
};

export default DashboardFolderBreadcrumb;
