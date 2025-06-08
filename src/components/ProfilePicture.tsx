
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ProfilePictureProps {
  url?: string | null;
  name?: string | null;
  email?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const ProfilePicture = ({ url, name, email, size = 'md', className = '' }: ProfilePictureProps) => {
  const getInitial = () => {
    if (name) {
      return name.charAt(0).toUpperCase();
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return '?';
  };

  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
    xl: 'h-12 w-12 text-lg'
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      {url && <AvatarImage src={url} alt={name || email || 'Profile'} />}
      <AvatarFallback className="bg-blue-600 text-white font-semibold">
        {getInitial()}
      </AvatarFallback>
    </Avatar>
  );
};

export default ProfilePicture;
