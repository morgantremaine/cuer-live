import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Folder,
  FolderPlus,
  Archive,
  Clock,
  FileText,
  MoreVertical,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { useRundownFolders, RundownFolder } from '@/hooks/useRundownFolders';
import { SavedRundown } from '@/hooks/useRundownStorage/types';

interface DashboardSidebarProps {
  selectedFolder: string | null;
  onFolderSelect: (folderId: string | null, folderType: 'all' | 'recent' | 'archived' | 'custom') => void;
  rundowns: SavedRundown[];
  teamId?: string;
  onRundownDrop: (rundownId: string, folderId: string | null) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  folderType: 'all' | 'recent' | 'archived' | 'custom';
}

type SystemFolder = {
  id: string | null;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  type: 'all' | 'recent' | 'archived';
  count: number;
  permanent: boolean;
};

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  selectedFolder,
  onFolderSelect,
  rundowns,
  teamId,
  onRundownDrop,
  isCollapsed,
  onToggleCollapse,
  folderType
}) => {
  const { folders, createFolder, updateFolder, deleteFolder } = useRundownFolders(teamId);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['system']));

  // Calculate counts for system folders
  const allCount = rundowns.length;
  const recentCount = rundowns.filter(r => {
    const daysDiff = (Date.now() - new Date(r.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7 && !r.archived;
  }).length;
  const archivedCount = rundowns.filter(r => r.archived).length;

  const systemFolders: SystemFolder[] = [
    {
      id: null,
      name: 'All Rundowns',
      icon: FileText,
      type: 'all',
      count: allCount,
      permanent: true
    },
    {
      id: 'recent',
      name: 'Recently Active',
      icon: Clock,
      type: 'recent',
      count: recentCount,
      permanent: true
    },
    {
      id: 'archived',
      name: 'Archived',
      icon: Archive,
      type: 'archived',
      count: archivedCount,
      permanent: true
    }
  ];

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    await createFolder(newFolderName.trim());
    setNewFolderName('');
    setShowCreateDialog(false);
  };

  const handleEditFolder = async (folder: RundownFolder) => {
    if (!editName.trim()) return;
    
    await updateFolder(folder.id, { name: editName.trim() });
    setEditingFolder(null);
    setEditName('');
  };

  const handleDeleteFolder = async (folder: RundownFolder) => {
    await deleteFolder(folder.id);
  };

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    setDragOverFolder(folderId);
  };

  const handleDragLeave = () => {
    setDragOverFolder(null);
  };

  const handleDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    const rundownId = e.dataTransfer.getData('text/plain');
    if (rundownId) {
      onRundownDrop(rundownId, folderId);
    }
    setDragOverFolder(null);
  };

  const toggleFolderExpansion = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const getFolderCount = (folderId: string) => {
    return rundowns.filter(r => r.folder_id === folderId && !r.archived).length;
  };

  if (isCollapsed) {
    return (
      <div className="w-12 bg-slate-950 border-r border-gray-700 flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="mt-4 space-y-2">
          {systemFolders.map((folder) => {
            const isSelected = folderType === folder.type;
            return (
              <Button
                key={folder.id || 'all'}
                variant="ghost"
                size="icon"
                onClick={() => onFolderSelect(folder.id, folder.type)}
                className={`text-gray-400 hover:text-white hover:bg-gray-800 ${
                  isSelected ? 'bg-gray-800 text-white' : ''
                }`}
              >
                <folder.icon className="h-4 w-4" />
              </Button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-slate-950 border-r border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-white font-semibold">Rundowns</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* System Folders */}
        <div className="mb-4">
          <div 
            className="flex items-center px-2 py-1 mb-2 cursor-pointer"
            onClick={() => toggleFolderExpansion('system')}
          >
            {expandedFolders.has('system') ? (
              <ChevronDown className="h-3 w-3 text-gray-400 mr-1" />
            ) : (
              <ChevronRight className="h-3 w-3 text-gray-400 mr-1" />
            )}
            <span className="text-xs text-gray-400 uppercase tracking-wide">System</span>
          </div>
          
          {expandedFolders.has('system') && (
            <div className="space-y-1">
              {systemFolders.map((folder) => {
                const isSelected = folderType === folder.type;
                const isDragOver = dragOverFolder === folder.id;
                
                return (
                  <div
                    key={folder.id || 'all'}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                      isDragOver
                        ? 'bg-gray-700 text-white'
                        : isSelected
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                    onClick={() => onFolderSelect(folder.id, folder.type)}
                    onDragOver={(e) => handleDragOver(e, folder.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, folder.id)}
                  >
                    <div className="flex items-center">
                      <folder.icon className="h-4 w-4 mr-2" />
                      <span className="text-sm">{folder.name}</span>
                    </div>
                    <span className="text-xs text-gray-400">{folder.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Custom Folders */}
        <div>
          <div className="flex items-center justify-between px-2 py-1 mb-2">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Custom</span>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <FolderPlus className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-800 border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Create New Folder</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateFolder();
                      }
                    }}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateFolder}
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={!newFolderName.trim()}
                    >
                      Create
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-1">
            {folders.map((folder) => {
              const isSelected = folderType === 'custom' && selectedFolder === folder.id;
              const isDragOver = dragOverFolder === folder.id;
              
              return (
                <div
                  key={folder.id}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                    isDragOver
                      ? 'bg-gray-700 text-white'
                      : isSelected
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                  onClick={() => onFolderSelect(folder.id, 'custom')}
                  onDragOver={(e) => handleDragOver(e, folder.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, folder.id)}
                >
                  <div className="flex items-center flex-1">
                    <Folder className="h-4 w-4 mr-2" style={{ color: folder.color }} />
                    {editingFolder === folder.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white text-sm h-6 px-1"
                        onBlur={() => handleEditFolder(folder)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleEditFolder(folder);
                          } else if (e.key === 'Escape') {
                            setEditingFolder(null);
                            setEditName('');
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm">{folder.name}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-400">{getFolderCount(folder.id)}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-400 hover:text-white hover:bg-gray-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-gray-800 border-gray-700">
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFolder(folder.id);
                            setEditName(folder.name);
                          }}
                          className="text-gray-300 hover:text-white hover:bg-gray-700"
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(folder);
                          }}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSidebar;
