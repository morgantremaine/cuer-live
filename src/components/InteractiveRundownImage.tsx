import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Hotspot {
  id: string;
  title: string;
  description: string;
  x: number; // percentage from left
  y: number; // percentage from top
  width: number; // percentage width
  height: number; // percentage height
}

const hotspots: Hotspot[] = [
  {
    id: 'showcaller-indicator', // #1 - Show segment area (bottom left)
    title: 'Showcaller Visual Indicator',
    description: 'Real-time visual feedback shows exactly where you are in your show with precision timing',
    x: 5,
    y: 75,
    width: 8,
    height: 8
  },
  {
    id: 'showcaller-controls', // #2 - Top right control area
    title: 'Showcaller Controls',
    description: 'Professional playback controls for seamless show execution - play, pause, skip ahead or back',
    x: 92,
    y: 14,
    width: 6,
    height: 6
  },
  {
    id: 'zoom-controls', // #3 - Top right controls
    title: 'Zoom Controls',
    description: 'Adjust your view from overview to detail - perfect for different screen sizes and preferences',
    x: 87,
    y: 14,
    width: 4,
    height: 6
  },
  {
    id: 'theme-toggle', // #4 - Top right controls  
    title: 'Light & Dark Mode',
    description: 'Switch between light and dark themes to match your studio lighting and personal preference',
    x: 82,
    y: 14,
    width: 4,
    height: 6
  },
  {
    id: 'saved-layouts', // #5 - Top right controls
    title: 'Saved Layouts',
    description: 'Create and save custom column layouts for different show types - news, sports, variety, and more',
    x: 77,
    y: 14,
    width: 4,
    height: 6
  },
  {
    id: 'share-links', // #6 - Left side controls
    title: 'Read-Only Share Links',
    description: 'Share view-only rundowns with talent, directors, and stakeholders - no login required',
    x: 26,
    y: 14,
    width: 6,
    height: 6
  },
  {
    id: 'resize-columns', // #7 - Column headers area
    title: 'Resizable Columns',
    description: 'Drag column borders to customize your workspace - see more of what matters most',
    x: 50,
    y: 18,
    width: 8,
    height: 4
  },
  {
    id: 'script-areas', // #8 - Script content area
    title: 'Collapsible Script Areas',
    description: 'Expand scripts that sync perfectly with the teleprompter - seamless talent experience',
    x: 28,
    y: 50,
    width: 12,
    height: 8
  },
  {
    id: 'cuer-ai', // #9 - AI button (bottom right)
    title: 'Cuer AI',
    description: 'AI-powered suggestions for timing, content optimization, and show flow improvements',
    x: 88,
    y: 80,
    width: 6,
    height: 6
  },
  {
    id: 'custom-colors', // #10 - Segment rows with colors
    title: 'Custom Row Colors',
    description: 'Color-code segments by type, talent, or any system that works for your team',
    x: 8,
    y: 45,
    width: 10,
    height: 8
  },
  {
    id: 'collapsible-headers', // #11 - Collapsible section
    title: 'Collapsible Show Blocks',
    description: 'Organize your rundown into logical blocks - collapse sections for easy reordering and overview',
    x: 8,
    y: 60,
    width: 12,
    height: 6
  },
  {
    id: 'autoscroll', // #12 - Top center area
    title: 'Auto-scroll Following',
    description: 'Automatically follows along with the showcaller so you never lose your place',
    x: 40,
    y: 14,
    width: 8,
    height: 6
  }
];

interface InteractiveRundownImageProps {
  src: string;
  alt: string;
  className?: string;
}

const InteractiveRundownImage = ({ src, alt, className = '' }: InteractiveRundownImageProps) => {
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);

  return (
    <TooltipProvider delayDuration={300}>
      <div className={`relative inline-block ${className}`}>
        <img 
          src={src} 
          alt={alt}
          className="w-full h-auto rounded-lg shadow-2xl"
          draggable={false}
        />
        
        {/* Subtle hotspot indicators */}
        {hotspots.map((hotspot) => (
          <Tooltip key={hotspot.id}>
            <TooltipTrigger asChild>
              <button
                className="absolute w-6 h-6 rounded-full bg-blue-500/80 hover:bg-blue-500 hover:scale-110 transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm border-2 border-white/50"
                style={{
                  left: `${hotspot.x + hotspot.width/2}%`,
                  top: `${hotspot.y + hotspot.height/2}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                onMouseEnter={() => setActiveHotspot(hotspot.id)}
                onMouseLeave={() => setActiveHotspot(null)}
                onFocus={() => setActiveHotspot(hotspot.id)}
                onBlur={() => setActiveHotspot(null)}
                aria-label={`Learn about ${hotspot.title}`}
              >
                {/* Subtle pulse ring on hover */}
                <div 
                  className={`absolute inset-0 rounded-full border-2 border-blue-400 animate-ping ${
                    activeHotspot === hotspot.id ? 'opacity-30' : 'opacity-0'
                  } transition-opacity duration-200`}
                />
                
                {/* Hotspot number */}
                <span className="text-white text-xs font-bold">
                  {hotspots.indexOf(hotspot) + 1}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent 
              side="top" 
              className="max-w-xs p-3 bg-background/95 backdrop-blur-sm border shadow-lg"
              sideOffset={8}
            >
              <div className="space-y-1">
                <h4 className="font-semibold text-sm text-foreground">{hotspot.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{hotspot.description}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
        
        {/* Legend for mobile */}
        <div className="mt-4 p-3 bg-background/50 backdrop-blur-sm rounded-lg border md:hidden">
          <h4 className="font-semibold text-sm mb-2 text-foreground">Tap the numbered areas above to explore features:</h4>
          <div className="grid grid-cols-1 gap-1 text-xs">
            {hotspots.slice(0, 6).map((hotspot, index) => (
              <div key={hotspot.id} className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                  {index + 1}
                </div>
                <span className="text-muted-foreground">{hotspot.title}</span>
              </div>
            ))}
            <div className="text-muted-foreground mt-1">+ {hotspots.length - 6} more features...</div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default InteractiveRundownImage;