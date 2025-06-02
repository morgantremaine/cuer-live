
import React from 'react';
import { 
  Tv, 
  Radio, 
  Mic, 
  Camera, 
  Music, 
  Video, 
  Calendar, 
  Clock, 
  Star, 
  Heart, 
  Bookmark, 
  Flag,
  FileText,
  Globe,
  Headphones,
  Play,
  Users,
  Zap,
  Trophy,
  Target
} from 'lucide-react';

const ICON_MAP = {
  Tv,
  Radio,
  Mic,
  Camera,
  Music,
  Video,
  Calendar,
  Clock,
  Star,
  Heart,
  Bookmark,
  Flag,
  FileText,
  Globe,
  Headphones,
  Play,
  Users,
  Zap,
  Trophy,
  Target
};

interface IconDisplayProps {
  iconName?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const IconDisplay = ({ iconName, size = 'md', className = '' }: IconDisplayProps) => {
  if (!iconName || !ICON_MAP[iconName as keyof typeof ICON_MAP]) {
    return null;
  }

  const IconComponent = ICON_MAP[iconName as keyof typeof ICON_MAP];

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <IconComponent 
      className={`${sizeClasses[size]} ${className}`}
    />
  );
};

export default IconDisplay;
