
import React, { useState, useEffect } from 'react';

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
  const [internalValue, setInternalValue] = useState(value || '');
  const cellKey = `${itemId}-${cellRefKey}`;

  // Sync internal value when external value changes
  useEffect(() => {
    setInternalValue(value || '');
  }, [value]);

  console.log('🖼️ ImageCell rendered with value:', value, 'internalValue:', internalValue, 'isEditing:', isEditing);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log('🖼️ ImageCell input changed:', newValue);
    setInternalValue(newValue);
    onUpdateValue(newValue);
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
    console.log('🖼️ Image error for URL:', internalValue);
    setImageError(true);
  };

  const handleImageLoad = () => {
    console.log('🖼️ Image loaded successfully for URL:', internalValue);
    setImageError(false);
  };

  const handleCellClick = (e: React.MouseEvent) => {
    console.log('🖼️ ImageCell clicked, setting editing to true');
    // Prevent event bubbling to row click handler
    e.stopPropagation();
    setIsEditing(true);
    
    // Call the parent onCellClick if provided
    if (onCellClick) {
      onCellClick(e);
    }
  };

  // Check if we have a valid image URL (non-empty and no error)
  const isValidImageUrl = internalValue && internalValue.trim() && !imageError;
  // Check if it looks like an image URL (ends with common image extensions or contains image domains)
  const isLikelyImageUrl = internalValue && (
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(internalValue) ||
    /\.(jpg|jpeg|png|gif|webp|svg)\?/i.test(internalValue) ||
    internalValue.includes('images') ||
    internalValue.includes('photos') ||
    internalValue.includes('imgur') ||
    internalValue.includes('unsplash')
  );

  return (
    <div 
      className="relative w-full p-1 cursor-pointer"
      style={{ 
        backgroundColor,
        minHeight: isValidImageUrl ? '72px' : '32px',
        height: isValidImageUrl ? '72px' : 'auto'
      }}
      onClick={handleCellClick}
    >
      {isEditing ? (
        <input
          ref={(el) => {
            if (el) {
              cellRefs.current[cellKey] = el;
            }
          }}
          type="text"
          value={internalValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={(e) => {
            console.log('🖼️ ImageCell input blurred');
            // Prevent event bubbling
            e.stopPropagation();
            setIsEditing(false);
          }}
          onFocus={(e) => {
            console.log('🖼️ ImageCell input focused');
            // Prevent event bubbling
            e.stopPropagation();
            setIsEditing(true);
          }}
          onClick={(e) => {
            // Prevent event bubbling when clicking on input
            e.stopPropagation();
          }}
          placeholder="Enter image URL..."
          className="w-full h-full bg-transparent border-none outline-none resize-none text-sm"
          style={{ color: textColor }}
          autoFocus={true}
        />
      ) : (
        <div 
          className="w-full h-full cursor-pointer"
          onClick={handleCellClick}
        >
          {isValidImageUrl && isLikelyImageUrl ? (
            <img
              src={internalValue}
              alt="Rundown image"
              className="w-full h-full object-contain rounded"
              onError={handleImageError}
              onLoad={handleImageLoad}
              onClick={(e) => {
                // Prevent event bubbling when clicking on image
                e.stopPropagation();
                handleCellClick(e);
              }}
              style={{ maxHeight: '68px' }}
            />
          ) : (
            <div 
              className="w-full h-8 flex items-center text-sm"
              style={{ color: textColor || '#666' }}
            >
              {imageError ? 'Invalid image URL' : (internalValue || 'Enter image URL...')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageCell;
