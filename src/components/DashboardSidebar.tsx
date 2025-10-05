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
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X
} from 'lucide-react';
import { useRundownFolders, RundownFolder } from '@/hooks/useRundownFolders';
import { SavedRundown } from '@/hooks/useRundownStorage/types';
import { useIsMobile } from '@/hooks/use-mobile';

interface DashboardSidebarProps {
  selectedFolder: string | null;
  onFolderSelect: (folderId: string | null, folderType: 'all' | 'recent' | 'archived' | 'custom') => void;
  rundowns: SavedRundown[];
  teamId?: string;
  onRundownDrop: (rundownId: string, folderId: string | null) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  folderType: 'all' | 'recent' | 'archived' | 'custom';
  searchQuery: string;
  onSearchChange: (query: string) => void;
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
  folderType,
  searchQuery,
  onSearchChange
}) => {
  const isMobile = useIsMobile();
  const { folders, createFolder, updateFolder, deleteFolder, reorderFolders } = useRundownFolders(teamId);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  // Folder drag and drop state
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);

  // Calculate counts for system folders - "All Rundowns" excludes archived
  const allCount = rundowns.filter(r => !r.archived).length;
  const recentCount = rundowns.filter(r => {
    const daysDiff = (Date.now() - new Date(r.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7 && !r.archived;
  }).length;
  const archivedCount = rundowns.filter(r => r.archived).length;

  const systemFolders: SystemFolder[] = [
    {
      id: 'recent',
      name: 'Recent',
      icon: Clock,
      type: 'recent',
      count: recentCount,
      permanent: true
    },
    {
      id: null,
      name: 'All Rundowns',
      icon: FileText,
      type: 'all',
      count: allCount,
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

  // Rundown drag handlers
  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    // Only handle rundown drops, not folder reordering
    if (e.dataTransfer.types.includes('text/rundown-id')) {
      const dragId = folderId === null ? 'all-rundowns' : folderId;
      setDragOverFolder(dragId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drag state if we're actually leaving the element
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverFolder(null);
    }
  };

  const handleDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    
    // Handle rundown drops
    if (e.dataTransfer.types.includes('text/rundown-id')) {
      const rundownId = e.dataTransfer.getData('text/rundown-id');
      if (rundownId) {
        onRundownDrop(rundownId, folderId);
      }
      setDragOverFolder(null);
    }
  };

  // Folder drag handlers
  const handleFolderDragStart = (e: React.DragEvent, folderId: string) => {
    setDraggedFolderId(folderId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/folder-id', folderId);
  };

  const handleFolderDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    
    // Only handle folder reordering
    if (e.dataTransfer.types.includes('text/folder-id')) {
      e.dataTransfer.dropEffect = 'move';
      setDropIndicatorIndex(index);
    }
  };

  const handleFolderDragEnd = () => {
    setDraggedFolderId(null);
    setDropIndicatorIndex(null);
  };

  const handleFolderDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (e.dataTransfer.types.includes('text/folder-id')) {
      const draggedId = e.dataTransfer.getData('text/folder-id');
      
      if (draggedId && draggedFolderId) {
        const currentIndex = folders.findIndex(folder => folder.id === draggedId);
        
        if (currentIndex !== -1 && currentIndex !== dropIndex) {
          // Create new order array
          const newFolders = [...folders];
          const [draggedFolder] = newFolders.splice(currentIndex, 1);
          
          // Adjust drop index if moving from before to after
          const adjustedIndex = dropIndex > currentIndex ? dropIndex - 1 : dropIndex;
          newFolders.splice(adjustedIndex, 0, draggedFolder);
          
          // Update positions and save
          const updatedFolders = newFolders.map((folder, index) => ({
            ...folder,
            position: index
          }));
          
          await reorderFolders(updatedFolders);
        }
      }
    }
    
    setDropIndicatorIndex(null);
    setDraggedFolderId(null);
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

  const clearSearch = () => {
    onSearchChange('');
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
          <PanelLeftOpen className="h-4 w-4" />
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
                  isSelected ? 'bg-blue-600 text-white' : ''
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
    <div className={`${isMobile ? 'fixed top-16 left-0 bottom-0 z-40 w-4/5' : 'w-64'} bg-slate-950 border-r border-gray-700 flex flex-col`}>
      {/* Header with Search */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex-1 mr-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search rundowns"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 pl-9 pr-3 h-8 text-sm"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearSearch}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400 hover:text-white hover:bg-gray-700"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      {/* Content - Only show folders when not searching */}
      {!searchQuery && (
        <div className="flex-1 overflow-y-auto p-2">
          {/* System Folders - Always visible */}
          <div className="mb-4">
            <div className="space-y-1">
              {systemFolders.map((folder) => {
                const isSelected = folderType === folder.type;
                // For "All Rundowns" (id: null), check against 'all-rundowns'
                const dragId = folder.id === null ? 'all-rundowns' : folder.id;
                const isDragOver = dragOverFolder === dragId;
                
                // Priority: drag-over > selected > default hover
                let containerClasses = "flex items-center justify-between p-2 rounded cursor-pointer transition-colors ";
                
                if (isDragOver) {
                  containerClasses += "bg-gray-700 text-white";
                } else if (isSelected) {
                  containerClasses += "bg-blue-600 text-white";
                } else {
                  containerClasses += "text-gray-300 hover:bg-gray-800 hover:text-white";
                }
                
                return (
                  <div
                    key={folder.id || 'all'}
                    className={containerClasses}
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
          </div>

          {/* Custom Folders - Changed header from "Custom" to "Folders" */}
          <div>
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <span className="text-xs text-gray-400 uppercase tracking-wide">Folders</span>
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

            <div className="space-y-1 relative">
              {folders.map((folder, index) => {
                const isSelected = folderType === 'custom' && selectedFolder === folder.id;
                const isDragOver = dragOverFolder === folder.id;
                const isDragging = draggedFolderId === folder.id;
                
                // Priority: drag-over > selected > default hover
                let containerClasses = "flex items-center justify-between p-2 rounded cursor-pointer transition-colors relative ";
                
                if (isDragging) {
                  containerClasses += "opacity-50";
                } else if (isDragOver) {
                  containerClasses += "bg-gray-700 text-white";
                } else if (isSelected) {
                  containerClasses += "bg-blue-600 text-white";
                } else {
                  containerClasses += "text-gray-300 hover:bg-gray-800 hover:text-white";
                }
                
                return (
                  <div key={folder.id}>
                    {/* Drop indicator line */}
                    {dropIndicatorIndex === index && (
                      <div className="h-0.5 bg-gray-400 mx-2 mb-1 rounded"></div>
                    )}
                    
                    <div
                      className={containerClasses}
                      draggable
                      onClick={() => onFolderSelect(folder.id, 'custom')}
                      onDragStart={(e) => handleFolderDragStart(e, folder.id)}
                      onDragOver={(e) => handleFolderDragOver(e, index)}
                      onDragEnd={handleFolderDragEnd}
                      onDrop={(e) => handleFolderDrop(e, index)}
                      onDragOverCapture={(e) => handleDragOver(e, folder.id)}
                      onDragLeave={handleDragLeave}
                      onDropCapture={(e) => handleDrop(e, folder.id)}
                    >
                      <div className="flex items-center flex-1">
                        <Folder className="h-4 w-4 mr-2 text-white" />
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
                    
                    {/* Drop indicator line at the end */}
                    {dropIndicatorIndex === folders.length && index === folders.length - 1 && (
                      <div className="h-0.5 bg-gray-400 mx-2 mt-1 rounded"></div>
                    )}
                  </div>
                );
              })}
              
              {/* Drop zone at the end of the list */}
              {folders.length > 0 && (
                <div
                  className="h-4"
                  onDragOver={(e) => handleFolderDragOver(e, folders.length)}
                  onDrop={(e) => handleFolderDrop(e, folders.length)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search Results Message */}
      {searchQuery && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-gray-400">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              Searching for "{searchQuery}"
            </p>
            <p className="text-xs mt-1">
              Results shown in main area
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <div className="text-center text-xs text-gray-500">
          <div>© {new Date().getFullYear()} Cuer Live</div>
          <div className="mt-1">Version 1.2.2</div>
          <div className="mt-2">
            <a 
              href="/changelog" 
              className="text-blue-400 hover:text-blue-300 underline"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/changelog';
              }}
            >
              View Changelog
            </a>
            <div className="mt-2">
              <a 
                href="https://forms.gle/vhAmtxCULAipQ2kr7" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Report a Problem
              </a>
            </div>
          </div>
          <div className="mt-3 text-gray-400">
            By using this site, you agree to our{' '}
            <a 
              href="/terms" 
              className="text-blue-400 hover:text-blue-300 underline"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/terms';
              }}
            >
              Terms
            </a>{' '}
            and{' '}
            <a 
              href="/privacy" 
              className="text-blue-400 hover:text-blue-300 underline"
              onClick={(e) => {
                e.preventDefault();
                window.location.href = '/privacy';
              }}
            >
              Privacy Policy
            </a>
            .
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSidebar;
