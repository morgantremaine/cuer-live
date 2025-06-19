
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageError(false);
  };

  const isValidImageUrl = value && value.trim() && !imageError;

  return (
    <div 
      className="relative w-full p-1"
      style={{ 
        backgroundColor,
        minHeight: isValidImageUrl ? '72px' : '32px', // 3 lines worth of height when image present
        height: isValidImageUrl ? '72px' : 'auto'
      }}
      onClick={onCellClick}
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
          onBlur={() => setIsEditing(false)}
          onFocus={() => setIsEditing(true)}
          placeholder="Enter image URL..."
          className="w-full h-full bg-transparent border-none outline-none resize-none text-sm"
          style={{ color: textColor }}
          autoFocus={isEditing}
        />
      ) : (
        <div 
          className="w-full h-full cursor-pointer"
          onClick={() => setIsEditing(true)}
        >
          {isValidImageUrl ? (
            <img
              src={value}
              alt="Rundown image"
              className="w-full h-full object-contain rounded"
              onError={handleImageError}
              onLoad={handleImageLoad}
              style={{ maxHeight: '68px' }} // Slightly less than container to account for padding
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
