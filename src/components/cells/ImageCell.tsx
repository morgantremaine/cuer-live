
import React, { useState, useCallback } from 'react';
import { Image, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HighlightedText from './HighlightedText';
import { SearchMatch } from '@/hooks/useRundownSearch';

interface ImageCellProps {
  value: string;
  itemId: string;
  cellRefKey: string;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  textColor?: string;
  backgroundColor?: string;
  searchMatches?: SearchMatch[];
  currentSearchMatch?: SearchMatch | null;
  onUpdateValue: (value: string) => void;
  onCellClick: (e: React.MouseEvent) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
}

const ImageCell = ({
  value,
  itemId,
  cellRefKey,
  cellRefs,
  textColor,
  backgroundColor,
  searchMatches = [],
  currentSearchMatch,
  onUpdateValue,
  onCellClick,
  onKeyDown
}: ImageCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Convert SearchMatch to HighlightMatch format
  const highlightMatches = searchMatches.map(match => ({
    startIndex: match.startIndex,
    endIndex: match.endIndex
  }));
  
  const currentHighlightMatch = currentSearchMatch ? {
    startIndex: currentSearchMatch.startIndex,
    endIndex: currentSearchMatch.endIndex
  } : undefined;

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onUpdateValue(result);
    };
    reader.readAsDataURL(file);
  }, [onUpdateValue]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleFileUpload(imageFile);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const cellKey = `${itemId}-${cellRefKey}`;

  if (isEditing) {
    return (
      <div 
        className="relative w-full h-full p-1" 
        style={{ backgroundColor }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className={`border-2 border-dashed rounded-lg p-2 text-center transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}>
          <input
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
            id={`file-${cellKey}`}
          />
          <label htmlFor={`file-${cellKey}`} className="cursor-pointer">
            <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600">Drop image or click to upload</p>
          </label>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-1 right-1"
          onClick={() => setIsEditing(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-full p-1 cursor-pointer group"
      style={{ backgroundColor }}
      onClick={(e) => {
        onCellClick(e);
        setIsEditing(true);
      }}
    >
      {value ? (
        <div className="relative h-full">
          <img 
            src={value} 
            alt="Cell content" 
            className="h-full w-full object-cover rounded"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded flex items-center justify-center">
            <Image className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center border border-dashed border-gray-300 rounded">
          <div className="text-center">
            <Image className="h-6 w-6 mx-auto mb-1 text-gray-400" />
            <p className="text-xs text-gray-500">
              <HighlightedText
                text="Add image"
                matches={highlightMatches}
                currentMatch={currentHighlightMatch}
              />
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageCell;
