
import React, { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

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
    // Check for different Google Drive link formats
    let fileId = null;
    
    // Format 1: https://drive.google.com/file/d/FILE_ID/view (with or without query params)
    const viewMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/view/);
    if (viewMatch) {
      fileId = viewMatch[1];
    }
    
    // Format 2: https://drive.google.com/file/d/FILE_ID (without /view)
    if (!fileId) {
      const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileMatch) {
        fileId = fileMatch[1];
      }
    }
    
    // If we found a file ID, convert to direct image URL using thumbnail API
    if (fileId) {
      // Try the thumbnail API first (works better for images)
      const convertedUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400-h300`;
      return convertedUrl;
    }
    
    return url;
  };

  // Helper function to convert Dropbox links to direct image URLs
  const convertDropboxUrl = (url: string): string => {
    // Check if it's a Dropbox sharing link
    if (url.includes('dropbox.com') && url.includes('dl=0')) {
      // Convert from sharing link to direct download by changing dl=0 to dl=1
      return url.replace('dl=0', 'dl=1');
    }
    
    // Check for Dropbox scl format and convert to direct link
    if (url.includes('dropbox.com/scl/')) {
      return url.replace('dl=0', 'dl=1');
    }
    
    return url;
  };

  // Helper function to extract Figma project name from URL
  const getFigmaProjectName = (url: string): string => {
    try {
      // Figma URL pattern: https://www.figma.com/design/{file-id}/{file-name}?query-params
      const urlPath = new URL(url).pathname;
      const pathParts = urlPath.split('/');
      
      // Find the file name part (usually after /design/{file-id}/)
      if (pathParts.length >= 4 && pathParts[1] === 'design') {
        const fileName = pathParts[3];
        // Decode URL encoding and replace dashes/underscores with spaces
        return decodeURIComponent(fileName)
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word
      }
    } catch (error) {
      // If URL parsing fails, return default
    }
    
    return 'Figma Design';
  };

  // Helper function to extract Google Drive folder/file name from URL
  const getGoogleDriveName = (url: string): string => {
    try {
      const urlObj = new URL(url);
      
      // Check if it's a folder
      if (url.includes('/folders/')) {
        return 'Google Drive Folder';
      }
      
      // Check if it's a file
      if (url.includes('/file/d/')) {
        return 'Google Drive File';
      }
      
      // Try to extract name from search params or path
      const searchParams = urlObj.searchParams;
      if (searchParams.has('usp')) {
        return 'Google Drive Item';
      }
      
    } catch (error) {
      // If URL parsing fails, return default
    }
    
    return 'Google Drive';
  };

  // Helper function to extract Google Docs document name from URL
  const getGoogleDocsName = (url: string): string => {
    try {
      // Google Docs URL pattern: https://docs.google.com/document/d/{doc-id}/edit?...
      if (url.includes('docs.google.com/document/')) {
        return 'Google Doc';
      }
      
      // Google Sheets URL pattern: https://docs.google.com/spreadsheets/d/{sheet-id}/edit?...
      if (url.includes('docs.google.com/spreadsheets/')) {
        return 'Google Sheet';
      }
      
      // Google Slides URL pattern: https://docs.google.com/presentation/d/{presentation-id}/edit?...
      if (url.includes('docs.google.com/presentation/')) {
        return 'Google Slides';
      }
      
      // Generic Google Docs
      if (url.includes('docs.google.com/')) {
        return 'Google Docs';
      }
      
    } catch (error) {
      // If URL parsing fails, return default
    }
    
    return 'Google Docs';
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
    setImageError(true);
  };

  const handleImageLoad = () => {
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

  // Check if it's a Google Drive file/folder (but not an image) first
  const isGoogleDriveFile = internalValue && 
    internalValue.includes('drive.google.com') && 
    (internalValue.includes('/folders/') || internalValue.includes('/file/d/'));

  // Check if it's a Google Docs file
  const isGoogleDocsFile = internalValue && internalValue.includes('docs.google.com/');

  // Check if it's a Figma design file
  const isFigmaFile = internalValue && internalValue.includes('figma.com');

  // Check if it looks like an image URL (but exclude Google Drive folders/files and Google Docs)
  const isLikelyImageUrl = internalValue && !isGoogleDriveFile && !isGoogleDocsFile && (
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(internalValue) ||
    /\.(jpg|jpeg|png|gif|webp|svg)\?/i.test(internalValue) ||
    internalValue.includes('images') ||
    internalValue.includes('photos') ||
    internalValue.includes('imgur') ||
    internalValue.includes('unsplash') ||
    (internalValue.includes('drive.google.com') && /\.(jpg|jpeg|png|gif|webp|svg)/i.test(internalValue)) ||
    internalValue.includes('dropbox.com') ||
    internalValue.includes('gstatic.com') ||
    internalValue.includes('amazonaws.com') ||
    internalValue.includes('cloudinary.com')
  );

  // Get the display URL (convert Google Drive or Dropbox links if necessary)
  const getDisplayUrl = (url: string): string => {
    if (url.includes('drive.google.com')) {
      return convertGoogleDriveUrl(url);
    } else if (url.includes('dropbox.com')) {
      return convertDropboxUrl(url);
    }
    return url;
  };

  const displayUrl = isLikelyImageUrl && internalValue ? getDisplayUrl(internalValue) : internalValue;

  // Check if we have a valid image URL (non-empty and no error)
  const isValidImageUrl = internalValue && internalValue.trim() && !imageError;

  return (
    <div 
      className="relative w-full p-1 cursor-pointer flex items-center"
      style={{ 
        backgroundColor,
        minHeight: '32px',
        height: 'auto'
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
          className="w-full h-full cursor-pointer flex items-center"
          onClick={handleCellClick}
        >
          {isValidImageUrl && isLikelyImageUrl ? (
            <img
              src={displayUrl}
              alt="Rundown image"
              className="max-w-full h-auto object-contain rounded"
              onError={handleImageError}
              onLoad={handleImageLoad}
              onClick={(e) => {
                // Prevent event bubbling when clicking on image
                e.stopPropagation();
                handleCellClick(e);
              }}
              style={{ 
                maxHeight: '100%', // Scale with row height
                width: 'auto', // Maintain aspect ratio
                maxWidth: '100%' // Respect column width
              }}
            />
          ) : isFigmaFile ? (
            <div className="w-full h-16 flex items-center justify-between bg-gray-100 rounded border border-gray-300 p-2">
              <div className="flex items-center space-x-2 text-gray-700">
                <div className="w-6 h-6 bg-purple-500 rounded flex items-center justify-center text-white font-bold text-xs">
                  F
                </div>
                <span className="text-sm font-medium">{getFigmaProjectName(internalValue)}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(internalValue, '_blank');
                }}
                className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-300 transition-colors"
                title="Open in Figma"
              >
                <ExternalLink className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          ) : isGoogleDriveFile ? (
            <div className="w-full h-16 flex items-center justify-between bg-blue-50 rounded border border-blue-200 p-2">
              <div className="flex items-center space-x-2 text-blue-700">
                <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-xs">
                  G
                </div>
                <span className="text-sm font-medium">{getGoogleDriveName(internalValue)}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(internalValue, '_blank');
                }}
                className="flex items-center justify-center w-8 h-8 rounded hover:bg-blue-200 transition-colors"
                title="Open in Google Drive"
              >
                <ExternalLink className="h-4 w-4 text-blue-600" />
              </button>
            </div>
          ) : isGoogleDocsFile ? (
            <div className="w-full h-16 flex items-center justify-between bg-green-50 rounded border border-green-200 p-2">
              <div className="flex items-center space-x-2 text-green-700">
                <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center text-white font-bold text-xs">
                  D
                </div>
                <span className="text-sm font-medium">{getGoogleDocsName(internalValue)}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(internalValue, '_blank');
                }}
                className="flex items-center justify-center w-8 h-8 rounded hover:bg-green-200 transition-colors"
                title="Open in Google Docs"
              >
                <ExternalLink className="h-4 w-4 text-green-600" />
              </button>
            </div>
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
