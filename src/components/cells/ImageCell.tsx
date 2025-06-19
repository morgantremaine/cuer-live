
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log('🖼️ ImageCell handleInputChange:', { 
      itemId, 
      field: cellRefKey,
      newValue, 
      oldValue: internalValue,
      timestamp: new Date().toISOString()
    });
    
    setInternalValue(newValue);
    
    // CRITICAL: Immediately propagate the change
    console.log('🖼️ ImageCell calling onUpdateValue for field:', cellRefKey, 'with value:', newValue);
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
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageError(false);
  };

  const handleCellClick = (e: React.MouseEvent) => {
    // Prevent event bubbling to row click handler
    e.stopPropagation();
    console.log('🖼️ ImageCell clicked, entering edit mode for item:', itemId);
    setIsEditing(true);
    
    // Call the parent onCellClick if provided
    if (onCellClick) {
      onCellClick(e);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    console.log('🖼️ ImageCell blur event, exiting edit mode for item:', itemId);
    e.stopPropagation();
    setIsEditing(false);
    
    // Final update on blur to ensure consistency
    const finalValue = e.target.value;
    console.log('🖼️ ImageCell final blur update:', { 
      itemId, 
      field: cellRefKey,
      finalValue, 
      internalValue,
      changed: finalValue !== internalValue,
      timestamp: new Date().toISOString()
    });
    
    // CRITICAL: Always call onUpdateValue on blur to ensure the final state is saved
    console.log('🖼️ ImageCell final onUpdateValue call for field:', cellRefKey, 'with value:', finalValue);
    onUpdateValue(finalValue);
    
    if (finalValue !== internalValue) {
      setInternalValue(finalValue);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    console.log('🖼️ ImageCell focus event for item:', itemId);
    e.stopPropagation();
    setIsEditing(true);
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
          onBlur={handleBlur}
          onFocus={handleFocus}
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
