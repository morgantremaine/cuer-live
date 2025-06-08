
import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProfilePicture } from '@/hooks/useProfilePicture';
import { useAuth } from '@/hooks/useAuth';
import ProfilePicture from './ProfilePicture';
import { Upload, Trash2 } from 'lucide-react';

const ProfilePictureUpload = () => {
  const { user } = useAuth();
  const { profilePictureUrl, uploading, uploadProfilePicture, removeProfilePicture } = useProfilePicture();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB.');
      return;
    }

    await uploadProfilePicture(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <Label className="text-gray-300">Profile Picture</Label>
      
      <div className="flex items-center space-x-4">
        <ProfilePicture
          url={profilePictureUrl}
          name={user?.user_metadata?.full_name}
          email={user?.email}
          size="xl"
        />
        
        <div className="flex flex-col space-y-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUploadClick}
            disabled={uploading}
            className="flex items-center space-x-2"
          >
            <Upload className="h-4 w-4" />
            <span>{uploading ? 'Uploading...' : 'Upload Photo'}</span>
          </Button>
          
          {profilePictureUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={removeProfilePicture}
              disabled={uploading}
              className="flex items-center space-x-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
              <span>Remove</span>
            </Button>
          )}
        </div>
      </div>
      
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <p className="text-sm text-gray-500">
        Upload a profile picture or your name's first letter will be used.
      </p>
    </div>
  );
};

export default ProfilePictureUpload;
