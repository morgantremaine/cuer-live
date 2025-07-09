import React from 'react';
import { CameraElement } from '@/hooks/cameraPlot/core/useCameraPlotData';
import { FURNITURE_LIBRARY } from './FurnitureLibrary';

interface EnhancedFurnitureRendererProps {
  element: CameraElement;
}

const EnhancedFurnitureRenderer: React.FC<EnhancedFurnitureRendererProps> = ({ element }) => {
  const scale = element.scale || 1;
  const color = element.color || '#8B4513';
  const furnitureData = FURNITURE_LIBRARY.find(f => f.id === element.subtype);
  
  const baseStyle = {
    width: '100%',
    height: '100%',
    transform: `scale(${scale})`,
    transformOrigin: 'center',
    position: 'relative' as const
  };

  // Helper function to render furniture with proper top-down appearance
  const renderFurniture = () => {
    if (!furnitureData) {
      return (
        <div 
          className="border-2 border-black"
          style={{
            ...baseStyle,
            backgroundColor: color
          }}
        />
      );
    }

    switch (furnitureData.id) {
      // Seating
      case 'chair-office':
        return (
          <div style={baseStyle}>
            <div 
              className="absolute inset-0 rounded-full border-2 border-black"
              style={{ backgroundColor: color }}
            />
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-black"
              style={{ backgroundColor: color }}
            />
          </div>
        );

      case 'chair-dining':
        return (
          <div style={baseStyle}>
            <div 
              className="absolute inset-0 rounded border-2 border-black"
              style={{ backgroundColor: color }}
            />
            <div 
              className="absolute top-1 left-1 right-1 bottom-1 border border-black rounded"
              style={{ backgroundColor: color }}
            />
          </div>
        );

      case 'sofa-2seat':
      case 'sofa-3seat':
        return (
          <div style={baseStyle}>
            <div 
              className="absolute inset-0 rounded-lg border-2 border-black"
              style={{ backgroundColor: color }}
            />
            <div 
              className="absolute top-2 left-2 right-2 bottom-2 border border-black rounded"
              style={{ backgroundColor: color }}
            />
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-2 rounded"
              style={{ backgroundColor: color, filter: 'brightness(0.8)' }}
            />
          </div>
        );

      case 'armchair':
        return (
          <div style={baseStyle}>
            <div 
              className="absolute inset-0 rounded-lg border-2 border-black"
              style={{ backgroundColor: color }}
            />
            <div 
              className="absolute top-2 left-2 right-2 bottom-2 border border-black rounded"
              style={{ backgroundColor: color }}
            />
            <div 
              className="absolute top-1 left-1 w-2 h-2 rounded"
              style={{ backgroundColor: color, filter: 'brightness(0.8)' }}
            />
            <div 
              className="absolute top-1 right-1 w-2 h-2 rounded"
              style={{ backgroundColor: color, filter: 'brightness(0.8)' }}
            />
          </div>
        );

      case 'bench':
        return (
          <div style={baseStyle}>
            <div 
              className="absolute inset-0 rounded border-2 border-black"
              style={{ backgroundColor: color }}
            />
            <div 
              className="absolute top-1/2 left-1 right-1 h-1 rounded"
              style={{ backgroundColor: color, filter: 'brightness(0.8)' }}
            />
          </div>
        );

      // Tables
      case 'table-round':
        return (
          <div style={baseStyle}>
            <div 
              className="absolute inset-0 rounded-full border-2 border-black"
              style={{ backgroundColor: color }}
            />
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-black"
              style={{ backgroundColor: color, filter: 'brightness(0.8)' }}
            />
          </div>
        );

      case 'table-square':
        return (
          <div style={baseStyle}>
            <div 
              className="absolute inset-0 border-2 border-black"
              style={{ backgroundColor: color }}
            />
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 border border-black"
              style={{ backgroundColor: color, filter: 'brightness(0.8)' }}
            />
          </div>
        );

      case 'table-rectangular':
      case 'coffee-table':
      case 'desk':
        return (
          <div style={baseStyle}>
            <div 
              className="absolute inset-0 rounded border-2 border-black"
              style={{ backgroundColor: color }}
            />
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-1 rounded"
              style={{ backgroundColor: color, filter: 'brightness(0.8)' }}
            />
          </div>
        );

      case 'side-table':
        return (
          <div style={baseStyle}>
            <div 
              className="absolute inset-0 rounded border-2 border-black"
              style={{ backgroundColor: color }}
            />
          </div>
        );

      // Storage
      case 'bookshelf':
        return (
          <div style={baseStyle}>
            <div 
              className="absolute inset-0 border-2 border-black"
              style={{ backgroundColor: color }}
            />
            <div 
              className="absolute top-1 left-1 right-1 h-1 border-b border-black"
              style={{ backgroundColor: color, filter: 'brightness(0.8)' }}
            />
            <div 
              className="absolute top-1/2 left-1 right-1 h-1 border-b border-black"
              style={{ backgroundColor: color, filter: 'brightness(0.8)' }}
            />
            <div 
              className="absolute bottom-1 left-1 right-1 h-1"
              style={{ backgroundColor: color, filter: 'brightness(0.8)' }}
            />
          </div>
        );

      case 'cabinet':
      case 'dresser':
        return (
          <div style={baseStyle}>
            <div 
              className="absolute inset-0 rounded border-2 border-black"
              style={{ backgroundColor: color }}
            />
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-2 rounded"
              style={{ backgroundColor: color, filter: 'brightness(0.6)' }}
            />
          </div>
        );

      case 'wardrobe':
        return (
          <div style={baseStyle}>
            <div 
              className="absolute inset-0 rounded border-2 border-black"
              style={{ backgroundColor: color }}
            />
            <div 
              className="absolute top-1/2 left-1/3 transform -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 rounded"
              style={{ backgroundColor: color, filter: 'brightness(0.6)' }}
            />
            <div 
              className="absolute top-1/2 left-2/3 transform -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 rounded"
              style={{ backgroundColor: color, filter: 'brightness(0.6)' }}
            />
          </div>
        );

      // Beds
      case 'bed-single':
      case 'bed-double':
      case 'bed-king':
        return (
          <div style={baseStyle}>
            <div 
              className="absolute inset-0 rounded border-2 border-black"
              style={{ backgroundColor: color }}
            />
            <div 
              className="absolute top-1 left-1 right-1 h-2 rounded"
              style={{ backgroundColor: color, filter: 'brightness(0.8)' }}
            />
            <div 
              className="absolute top-4 left-2 right-2 bottom-2 border border-black rounded"
              style={{ backgroundColor: color, filter: 'brightness(0.9)' }}
            />
          </div>
        );

      // Electronics
      case 'tv':
        return (
          <div style={baseStyle}>
            <div 
              className="absolute inset-0 rounded border-2 border-black"
              style={{ backgroundColor: color }}
            />
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-1 rounded"
              style={{ backgroundColor: '#444444' }}
            />
          </div>
        );

      // Appliances
      case 'refrigerator':
        return (
          <div style={baseStyle}>
            <div 
              className="absolute inset-0 rounded border-2 border-black"
              style={{ backgroundColor: color }}
            />
            <div 
              className="absolute top-1/2 left-1 w-1 h-3 rounded"
              style={{ backgroundColor: color, filter: 'brightness(0.8)' }}
            />
          </div>
        );

      case 'stove':
        return (
          <div style={baseStyle}>
            <div 
              className="absolute inset-0 rounded border-2 border-black"
              style={{ backgroundColor: color }}
            />
            <div 
              className="absolute top-1 left-1 w-2 h-2 rounded-full border border-black"
              style={{ backgroundColor: '#444444' }}
            />
            <div 
              className="absolute top-1 right-1 w-2 h-2 rounded-full border border-black"
              style={{ backgroundColor: '#444444' }}
            />
            <div 
              className="absolute bottom-1 left-1 w-2 h-2 rounded-full border border-black"
              style={{ backgroundColor: '#444444' }}
            />
            <div 
              className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-black"
              style={{ backgroundColor: '#444444' }}
            />
          </div>
        );

      case 'washing-machine':
        return (
          <div style={baseStyle}>
            <div 
              className="absolute inset-0 rounded border-2 border-black"
              style={{ backgroundColor: color }}
            />
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-black"
              style={{ backgroundColor: '#CCCCCC' }}
            />
          </div>
        );

      // Decor
      case 'plant':
        return (
          <div style={baseStyle}>
            <div 
              className="absolute inset-0 rounded-full border-2 border-black"
              style={{ backgroundColor: '#8B4513' }}
            />
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
          </div>
        );

      case 'rug-round':
        return (
          <div style={baseStyle}>
            <div 
              className="absolute inset-0 rounded-full border-2 border-dashed border-black opacity-70"
              style={{ backgroundColor: color }}
            />
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-black opacity-50"
              style={{ backgroundColor: color, filter: 'brightness(0.9)' }}
            />
          </div>
        );

      case 'rug-rectangular':
        return (
          <div style={baseStyle}>
            <div 
              className="absolute inset-0 rounded border-2 border-dashed border-black opacity-70"
              style={{ backgroundColor: color }}
            />
            <div 
              className="absolute top-2 left-2 right-2 bottom-2 border border-black opacity-50 rounded"
              style={{ backgroundColor: color, filter: 'brightness(0.9)' }}
            />
          </div>
        );

      default:
        return (
          <div 
            className="absolute inset-0 border-2 border-black"
            style={{ backgroundColor: color }}
          />
        );
    }
  };

  return (
    <div style={baseStyle}>
      {renderFurniture()}
    </div>
  );
};

export default EnhancedFurnitureRenderer;