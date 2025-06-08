
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const useProfilePicture = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Load current profile picture
  useEffect(() => {
    if (user) {
      loadProfilePicture();
    }
  }, [user]);

  const loadProfilePicture = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('profile_picture_url')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile picture:', error);
        return;
      }

      setProfilePictureUrl(data?.profile_picture_url || null);
    } catch (error) {
      console.error('Error loading profile picture:', error);
    }
  };

  const uploadProfilePicture = async (file: File) => {
    if (!user) return;

    try {
      setUploading(true);

      // Create unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Delete existing file if it exists
      await supabase.storage
        .from('profile-pictures')
        .remove([fileName]);

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      // Update profile with new URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_picture_url: data.publicUrl })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      setProfilePictureUrl(data.publicUrl);
      
      toast({
        title: 'Success',
        description: 'Profile picture updated successfully!',
      });

    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload profile picture',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const removeProfilePicture = async () => {
    if (!user) return;

    try {
      setUploading(true);

      // Remove file from storage
      const fileName = `${user.id}/avatar`;
      await supabase.storage
        .from('profile-pictures')
        .remove([fileName]);

      // Update profile to remove URL
      const { error } = await supabase
        .from('profiles')
        .update({ profile_picture_url: null })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      setProfilePictureUrl(null);
      
      toast({
        title: 'Success',
        description: 'Profile picture removed successfully!',
      });

    } catch (error: any) {
      console.error('Error removing profile picture:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove profile picture',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return {
    profilePictureUrl,
    uploading,
    uploadProfilePicture,
    removeProfilePicture,
    reloadProfilePicture: loadProfilePicture
  };
};
