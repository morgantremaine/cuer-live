
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Upload, X } from 'lucide-react';

interface RundownLogoUploadProps {
  rundownId: string;
  currentLogoUrl?: string | null;
  onLogoUpdate: (logoUrl: string | null) => void;
  onClose: () => void;
}

const RundownLogoUpload = ({ 
  rundownId, 
  currentLogoUrl, 
  onLogoUpdate, 
  onClose 
}: RundownLogoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 2MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Remove existing logo if present
      if (currentLogoUrl) {
        await handleRemoveLogo(false);
      }

      // Upload new logo
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${rundownId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('rundown-logos')
        .upload(fileName, file, {
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('rundown-logos')
        .getPublicUrl(fileName);

      // Update rundown with logo URL
      const { error: updateError } = await supabase
        .from('rundowns')
        .update({ logo_url: publicUrl })
        .eq('id', rundownId);

      if (updateError) throw updateError;

      onLogoUpdate(publicUrl);
      toast({
        title: 'Logo uploaded',
        description: 'Your rundown logo has been uploaded successfully.',
      });
      onClose();
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload logo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async (showToast = true) => {
    if (!currentLogoUrl || !user) return;

    setRemoving(true);

    try {
      // Extract file path from URL
      const urlParts = currentLogoUrl.split('/');
      const fileName = urlParts.slice(-2).join('/'); // user_id/rundown_id.ext

      // Remove from storage
      const { error: deleteError } = await supabase.storage
        .from('rundown-logos')
        .remove([fileName]);

      if (deleteError) throw deleteError;

      // Update rundown to remove logo URL
      const { error: updateError } = await supabase
        .from('rundowns')
        .update({ logo_url: null })
        .eq('id', rundownId);

      if (updateError) throw updateError;

      onLogoUpdate(null);
      if (showToast) {
        toast({
          title: 'Logo removed',
          description: 'Your rundown logo has been removed.',
        });
        onClose();
      }
    } catch (error) {
      console.error('Error removing logo:', error);
      if (showToast) {
        toast({
          title: 'Remove failed',
          description: 'Failed to remove logo. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="text-sm font-medium">Rundown Logo</div>
      
      {currentLogoUrl && (
        <div className="flex items-center space-x-2">
          <img 
            src={currentLogoUrl} 
            alt="Current logo" 
            className="w-8 h-8 object-contain"
          />
          <span className="text-xs text-gray-500">Current logo</span>
        </div>
      )}

      <div className="flex space-x-2">
        <div className="flex-1">
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading}
            className="text-xs"
          />
        </div>
        
        {currentLogoUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRemoveLogo(true)}
            disabled={removing}
            className="text-red-600 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {uploading && (
        <div className="text-xs text-gray-500">Uploading...</div>
      )}
      
      {removing && (
        <div className="text-xs text-gray-500">Removing...</div>
      )}
    </div>
  );
};

export default RundownLogoUpload;
