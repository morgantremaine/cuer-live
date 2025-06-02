
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Calendar, Clock, Trash2, Archive, MoreVertical, Copy, FileText, Image, X } from 'lucide-react'
import { format } from 'date-fns'
import { RundownItem } from '@/hooks/useRundownItems'
import { useState, useRef } from 'react'
import { handleFileUpload } from '@/utils/fileUpload'
import { useToast } from '@/hooks/use-toast'

interface SavedRundown {
  id: string
  title: string
  items: RundownItem[]
  created_at: string
  updated_at: string
  archived?: boolean
  icon?: string
}

interface RundownCardProps {
  rundown: SavedRundown
  onOpen: (id: string) => void
  onDelete: (id: string, title: string, e: React.MouseEvent) => void
  onArchive?: (id: string, title: string, e: React.MouseEvent) => void
  onUnarchive?: (id: string, title: string, items: RundownItem[], e: React.MouseEvent) => void
  onDuplicate?: (id: string, title: string, items: RundownItem[], e: React.MouseEvent) => void
  onIconUpdate?: (id: string, iconUrl: string | null) => void
  isArchived?: boolean
}

const RundownCard = ({ 
  rundown, 
  onOpen, 
  onDelete, 
  onArchive, 
  onUnarchive, 
  onDuplicate,
  onIconUpdate,
  isArchived = false 
}: RundownCardProps) => {
  const [isUploadingIcon, setIsUploadingIcon] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleBlueprintClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.location.href = `/blueprint/${rundown.id}`
  }

  const handleOpenClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onOpen(rundown.id)
  }

  const handleIconUpload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onIconUpdate) return

    setIsUploadingIcon(true)
    try {
      const iconUrl = await handleFileUpload(file)
      onIconUpdate(rundown.id, iconUrl)
      toast({
        title: "Success",
        description: "Icon uploaded successfully!",
      })
    } catch (error) {
      console.error('Failed to upload icon:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload icon",
        variant: "destructive",
      })
    } finally {
      setIsUploadingIcon(false)
      // Reset the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveIcon = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onIconUpdate) {
      onIconUpdate(rundown.id, null)
      toast({
        title: "Success",
        description: "Icon removed successfully!",
      })
    }
  }

  return (
    <Card 
      className={`hover:shadow-lg transition-shadow relative bg-gray-800 border-gray-700 ${isArchived ? 'opacity-75' : ''}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center text-white">
              {rundown.icon && (
                <div className="relative mr-2 group">
                  <img 
                    src={rundown.icon} 
                    alt="Rundown icon" 
                    className="w-6 h-6 rounded object-cover"
                  />
                  {onIconUpdate && (
                    <button
                      onClick={handleRemoveIcon}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2 h-2 text-white" />
                    </button>
                  )}
                </div>
              )}
              {isArchived && <Archive className="h-4 w-4 mr-2 text-gray-400" />}
              {rundown.title}
            </CardTitle>
            <CardDescription className="flex flex-col gap-1 text-sm text-gray-400">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Created: {format(new Date(rundown.created_at), 'MMM d, yyyy')}
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Modified: {format(new Date(rundown.updated_at), 'MMM d, yyyy')}
              </div>
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 relative z-20 hover:bg-gray-700 text-gray-400 hover:text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="z-50 bg-gray-800 border-gray-700 shadow-lg rounded-md min-w-[160px]"
            >
              {onIconUpdate && (
                <>
                  <DropdownMenuItem 
                    onClick={handleIconUpload}
                    disabled={isUploadingIcon}
                    className="flex items-center px-3 py-2 text-sm hover:bg-gray-700 cursor-pointer text-gray-300 hover:text-white"
                  >
                    <Image className="h-4 w-4 mr-2" />
                    {isUploadingIcon ? 'Uploading...' : rundown.icon ? 'Change Icon' : 'Add Icon'}
                  </DropdownMenuItem>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </>
              )}
              {onDuplicate && (
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation()
                    onDuplicate(rundown.id, rundown.title, rundown.items, e)
                  }}
                  className="flex items-center px-3 py-2 text-sm hover:bg-gray-700 cursor-pointer text-gray-300 hover:text-white"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
              )}
              {isArchived ? (
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation()
                    onUnarchive?.(rundown.id, rundown.title, rundown.items, e)
                  }}
                  className="flex items-center px-3 py-2 text-sm hover:bg-gray-700 cursor-pointer text-gray-300 hover:text-white"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Unarchive
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation()
                    onArchive?.(rundown.id, rundown.title, e)
                  }}
                  className="flex items-center px-3 py-2 text-sm hover:bg-gray-700 cursor-pointer text-gray-300 hover:text-white"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(rundown.id, rundown.title, e)
                }}
                className="flex items-center px-3 py-2 text-sm text-red-400 hover:bg-red-900/50 focus:text-red-400 cursor-pointer"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isArchived ? 'Delete Permanently' : 'Delete'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-400">
            <Clock className="h-4 w-4 mr-1" />
            {rundown.items?.length || 0} items
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-blue-400 hover:text-blue-300 hover:bg-gray-700"
              onClick={handleBlueprintClick}
            >
              <FileText className="h-4 w-4 mr-1" />
              Blueprint
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-300 hover:text-white hover:bg-gray-700"
              onClick={handleOpenClick}
            >
              Open →
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default RundownCard
