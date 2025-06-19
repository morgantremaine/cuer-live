
import React, { useState } from 'react';

interface ImageCellProps {
  value: string;
  itemId: string;
  cellRefKey: string;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  textColor?: string;
  backgroundColor?: string;
  onUpdateValue: (value: string) => void;
  onCellClick?: (e: React.MouseEvent) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
}

const ImageCell = ({
  value,
  itemId,
  cellRefKey,
  cellRefs,
  textColor,
  backgroundColor,
  onUpdateValue,
  onCellClick,
  onKeyDown
}: ImageCellProps) => {
  const [imageError, setImageError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const cellKey = `${itemId}-${cellRefKey}`;

  console.log('🖼️ ImageCell rendered with value:', value, 'isEditing:', isEditing);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🖼️ ImageCell input changed:', e.target.value);
    onUpdateValue(e.target.value);
    setImageError(false); // Reset error when URL changes
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      (e.target as HTMLInputElement).blur();
    }
    onKeyDown(e, itemId, cellRefKey);
  };

  const handleImageError = () => {
    console.log('🖼️ Image error for URL:', value);
    setImageError(true);
  };

  const handleImageLoad = () => {
    console.log('🖼️ Image loaded successfully for URL:', value);
    setImageError(false);
  };

  const handleCellClick = () => {
    console.log('🖼️ ImageCell clicked, setting editing to true');
    setIsEditing(true);
  };

  const isValidImageUrl = value && value.trim() && !imageError;

  return (
    <div 
      className="relative w-full p-1 cursor-pointer"
      style={{ 
        backgroundColor,
        minHeight: isValidImageUrl ? '72px' : '32px',
        height: isValidImageUrl ? '72px' : 'auto'
      }}
      onClick={onCellClick || handleCellClick}
    >
      {isEditing || !value ? (
        <input
          ref={(el) => {
            if (el) {
              cellRefs.current[cellKey] = el;
            }
          }}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            console.log('🖼️ ImageCell input blurred');
            setIsEditing(false);
          }}
          onFocus={() => {
            console.log('🖼️ ImageCell input focused');
            setIsEditing(true);
          }}
          placeholder="Enter image URL..."
          className="w-full h-full bg-transparent border-none outline-none resize-none text-sm"
          style={{ color: textColor }}
          autoFocus={isEditing}
        />
      ) : (
        <div 
          className="w-full h-full cursor-pointer"
          onClick={handleCellClick}
        >
          {isValidImageUrl ? (
            <img
              src={value}
              alt="Rundown image"
              className="w-full h-full object-contain rounded"
              onError={handleImageError}
              onLoad={handleImageLoad}
              style={{ maxHeight: '68px' }}
            />
          ) : (
            <div 
              className="w-full h-8 flex items-center text-sm opacity-60"
              style={{ color: textColor }}
            >
              {imageError ? 'Invalid image URL' : (value || 'Enter image URL...')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageCell;
