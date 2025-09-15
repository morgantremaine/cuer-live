import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Trash2, 
  Archive, 
  Users, 
  MoreVertical, 
  Copy, 
  RotateCcw, 
  Play, 
  FileText, 
  Calendar, 
  Clock 
} from 'lucide-react';
import { SavedRundown } from '@/hooks/useRundownStorage/types';
import { RundownItem } from '@/hooks/useRundownItems';
import { useLiveActivityStatus } from '@/hooks/useLiveActivityStatus';
import { calculateTotalRuntime } from '@/utils/rundownCalculations';

interface TeamMember {
  id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profiles?: {
    email: string;
    full_name: string | null;
  };
}

interface LiveRundownCardProps {
  rundown: SavedRundown;
  onOpen: (rundownId: string) => void;
  onDelete?: (rundownId: string, title: string, e: React.MouseEvent) => void;
  onArchive?: (rundownId: string, title: string, e: React.MouseEvent) => void;
  onUnarchive?: (rundownId: string, title: string, items: RundownItem[], e: React.MouseEvent) => void;
  onDuplicate?: (rundownId: string, title: string, items: RundownItem[], e: React.MouseEvent) => void;
  isArchived?: boolean;
  currentUserId?: string;
  teamMembers?: TeamMember[];
  onDragStart?: (e: React.DragEvent, rundownId: string) => void;
}

const LiveRundownCard: React.FC<LiveRundownCardProps> = ({
  rundown,
  onOpen,
  onDelete,
  onArchive,
  onUnarchive,
  onDuplicate,
  isArchived = false,
  currentUserId,
  teamMembers = [],
  onDragStart
}) => {
  const navigate = useNavigate();
  
  // Use live activity status that updates every minute
  const activityStatus = useLiveActivityStatus(rundown, currentUserId, teamMembers);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return !isNaN(date.getTime()) ? date.toLocaleDateString() : null;
  };

  const isOwnRundown = (rundown: SavedRundown) => {
    return rundown.user_id === currentUserId;
  };

  const getOwnerInfo = (rundown: SavedRundown) => {
    if (isOwnRundown(rundown)) {
      return 'You';
    }
    
    const teamMember = teamMembers.find(member => member.user_id === rundown.user_id);
    if (teamMember?.profiles?.full_name) {
      return teamMember.profiles.full_name;
    }
    if (teamMember?.profiles?.email) {
      return teamMember.profiles.email;
    }
    
    if (rundown.creator_profile?.full_name) {
      return rundown.creator_profile.full_name;
    }
    
    if (rundown.creator_profile?.email) {
      return rundown.creator_profile.email;
    }
    
    return 'Unknown User';
  };

  const getRundownPreview = (items: RundownItem[]) => {
    const contentItems = items.filter(item => item.type !== 'header');
    const headers = items.filter(item => item.type === 'header');
    
    return {
      segmentCount: headers.length,
      itemCount: contentItems.length,
      totalDuration: calculateTotalRuntime(items),
    };
  };

  const preview = getRundownPreview(rundown.items || []);

  // Handle drag start for rundown cards
  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      onDragStart(e, rundown.id);
    }
  };

  // Compact card for archived rundowns
  if (isArchived) {
    return (
      <Card 
        className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-all duration-300 hover:scale-[1.02] group relative overflow-hidden cursor-move"
        draggable
        onDragStart={handleDragStart}
      >
        <div className={`absolute top-0 left-0 w-full h-1 ${activityStatus.color} opacity-50`} />
        
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-2">
              <CardTitle 
                className="text-white text-base cursor-pointer hover:text-blue-300 transition-colors leading-tight break-words"
                onClick={() => onOpen(rundown.id)}
              >
                {rundown.title}
              </CardTitle>
              <CardDescription className="text-gray-400 flex items-center gap-2 text-xs mt-1">
                <span>{getOwnerInfo(rundown)}</span>
                <span>•</span>
                <span>{rundown.show_date && formatDate(rundown.show_date) ? formatDate(rundown.show_date) : formatDate(rundown.updated_at)}</span>
              </CardDescription>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white hover:bg-gray-700 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700 z-50">
                {onUnarchive && (
                  <DropdownMenuItem 
                    onClick={(e) => onUnarchive(rundown.id, rundown.title, rundown.items, e)}
                    className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Unarchive
                  </DropdownMenuItem>
                )}
                
                {onDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem 
                        onSelect={(e) => e.preventDefault()}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/50 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-gray-800 border-gray-700">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Delete Rundown</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                          Are you sure you want to delete "{rundown.title}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={(e) => onDelete(rundown.id, rundown.title, e)}
                          className="bg-red-600 hover:bg-red-700 text-white border-0"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 space-y-3">
          <div className="flex justify-between text-xs text-gray-400">
            <span>{preview.segmentCount} headers</span>
            <span>{preview.itemCount} segments</span>
            <span>{preview.totalDuration}</span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => onOpen(rundown.id)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs"
            >
              <Play className="h-3 w-3 mr-1" />
              Open
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full card for active rundowns
  return (
    <Card 
      className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10 group relative overflow-hidden cursor-move"
      draggable
      onDragStart={handleDragStart}
    >
      <div className={`absolute top-0 left-0 w-full h-1 ${activityStatus.color}`} />
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-start gap-2 mb-1">
              <CardTitle 
                className="text-white text-lg cursor-pointer hover:text-blue-300 transition-colors leading-tight break-words flex-1"
                onClick={() => onOpen(rundown.id)}
              >
                {rundown.title}
              </CardTitle>
            </div>
            
            <CardDescription className="text-gray-400 flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>by {getOwnerInfo(rundown)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{rundown.show_date && formatDate(rundown.show_date) ? formatDate(rundown.show_date) : formatDate(rundown.updated_at)}</span>
              </div>
            </CardDescription>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white hover:bg-gray-700 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700 z-50">
              {onDuplicate && (
                <DropdownMenuItem 
                  onClick={(e) => onDuplicate(rundown.id, rundown.title, rundown.items, e)}
                  className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
              )}
              
              {onArchive && (
                <DropdownMenuItem 
                  onClick={(e) => onArchive(rundown.id, rundown.title, e)}
                  className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              )}
              
              {onDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem 
                      onSelect={(e) => e.preventDefault()}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/50 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-gray-800 border-gray-700">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">Delete Rundown</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-400">
                        Are you sure you want to delete "{rundown.title}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={(e) => onDelete(rundown.id, rundown.title, e)}
                        className="bg-red-600 hover:bg-red-700 text-white border-0"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        {/* Live Activity Status */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Clock className="h-3 w-3" />
          <span>{activityStatus.label}</span>
        </div>
        
        {/* Rundown Statistics */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-lg font-bold text-white">{preview.segmentCount}</div>
            <div className="text-xs text-gray-400">Headers</div>
          </div>
          <div className="space-y-1">
            <div className="text-lg font-bold text-white">{preview.itemCount}</div>
            <div className="text-xs text-gray-400">Segments</div>
          </div>
          <div className="space-y-1">
            <div className="text-lg font-bold text-white">{preview.totalDuration}</div>
            <div className="text-xs text-gray-400">Duration</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/rundown/${rundown.id}/blueprint`)}
            className="flex-1 border-gray-600 text-blue-400 hover:text-blue-300 hover:bg-gray-700"
          >
            <FileText className="h-4 w-4 mr-1" />
            Blueprint
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => onOpen(rundown.id)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-0"
          >
            <Play className="h-4 w-4 mr-1" />
            Open
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveRundownCard;