import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface IconUploadProps {
  currentIcon?: string;
  onIconChange: (iconData: string | null) => void;
  disabled?: boolean;
}

const IconUpload = ({ currentIcon, onIconChange, disabled = false }: IconUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file (PNG, JPG, etc.)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 2MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        onIconChange(result);
        toast({
          title: 'Success',
          description: 'Icon uploaded successfully!',
        });
        setIsUploading(false);
      };
      reader.onerror = () => {
        toast({
          title: 'Error',
          description: 'Failed to read the file',
          variant: 'destructive',
        });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading icon:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload icon',
        variant: 'destructive',
      });
      setIsUploading(false);
    }

    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveIcon = () => {
    onIconChange(null);
    toast({
      title: 'Success',
      description: 'Icon removed successfully!',
    });
  };

  return (
    <div>
      {currentIcon ? (
        <Button
          variant="outline"
          onClick={handleRemoveIcon}
          disabled={disabled}
          className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600 hover:border-gray-500"
        >
          <X className="h-4 w-4 mr-2" />
          Remove Icon
        </Button>
      ) : (
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600 hover:border-gray-500"
        >
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? 'Uploading...' : 'Upload Icon'}
        </Button>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default IconUpload;
