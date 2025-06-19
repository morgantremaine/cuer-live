
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

  // Helper function to convert Google Drive links to direct image URLs
  const convertGoogleDriveUrl = (url: string): string => {
    console.log('🔍 Converting Google Drive URL:', url);
    
    // Check for different Google Drive link formats
    let fileId = null;
    
    // Format 1: https://drive.google.com/file/d/FILE_ID/view (with or without query params)
    const viewMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/view/);
    if (viewMatch) {
      fileId = viewMatch[1];
      console.log('📁 Found file ID from /view format:', fileId);
    }
    
    // Format 2: https://drive.google.com/file/d/FILE_ID (without /view)
    if (!fileId) {
      const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileMatch) {
        fileId = fileMatch[1];
        console.log('📁 Found file ID from basic format:', fileId);
      }
    }
    
    // If we found a file ID, convert to direct image URL
    if (fileId) {
      const convertedUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
      console.log('✅ Converted to direct URL:', convertedUrl);
      return convertedUrl;
    }
    
    console.log('❌ No file ID found, returning original URL');
    return url;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    
    // CRITICAL: Immediately propagate the change
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
    console.log('❌ Image failed to load for URL:', displayUrl);
    setImageError(true);
  };

  const handleImageLoad = () => {
    console.log('✅ Image loaded successfully for URL:', displayUrl);
    setImageError(false);
  };

  const handleCellClick = (e: React.MouseEvent) => {
    // Prevent event bubbling to row click handler
    e.stopPropagation();
    setIsEditing(true);
    
    // Call the parent onCellClick if provided
    if (onCellClick) {
      onCellClick(e);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setIsEditing(false);
    
    // Final update on blur to ensure consistency
    const finalValue = e.target.value;
    
    // CRITICAL: Always call onUpdateValue on blur to ensure the final state is saved
    onUpdateValue(finalValue);
    
    if (finalValue !== internalValue) {
      setInternalValue(finalValue);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  // Check if it looks like an image URL (ends with common image extensions or contains image domains)
  const isLikelyImageUrl = internalValue && (
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(internalValue) ||
    /\.(jpg|jpeg|png|gif|webp|svg)\?/i.test(internalValue) ||
    internalValue.includes('images') ||
    internalValue.includes('photos') ||
    internalValue.includes('imgur') ||
    internalValue.includes('unsplash') ||
    internalValue.includes('drive.google.com') ||
    internalValue.includes('gstatic.com') ||
    internalValue.includes('amazonaws.com') ||
    internalValue.includes('cloudinary.com')
  );

  // Get the display URL (convert Google Drive links if necessary)
  const displayUrl = isLikelyImageUrl && internalValue ? convertGoogleDriveUrl(internalValue) : internalValue;

  // Check if we have a valid image URL (non-empty and no error)
  const isValidImageUrl = internalValue && internalValue.trim() && !imageError;

  console.log('🖼️ ImageCell render state:', {
    internalValue,
    isLikelyImageUrl,
    displayUrl,
    isValidImageUrl,
    imageError
  });

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
              src={displayUrl}
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
              {imageError ? 'Invalid image URL' : (internalValue || '')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageCell;
