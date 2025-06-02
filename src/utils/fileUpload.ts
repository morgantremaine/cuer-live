
import { supabase } from '@/lib/supabase'

export const uploadFile = async (file: File): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User must be authenticated to upload files')
  }
  
  // Create a unique filename with user ID folder structure
  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}/${Date.now()}.${fileExt}`
  
  console.log('fileUpload: Uploading file to Supabase Storage:', fileName)
  
  const { data, error } = await supabase.storage
    .from('rundown-icons')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    console.error('fileUpload: Supabase storage error:', error)
    throw new Error(`Failed to upload file: ${error.message}`)
  }

  console.log('fileUpload: File uploaded successfully:', data.path)
  
  // Get the public URL for the uploaded file
  const { data: { publicUrl } } = supabase.storage
    .from('rundown-icons')
    .getPublicUrl(data.path)

  console.log('fileUpload: Generated public URL:', publicUrl)
  
  return publicUrl
}

export const handleFileUpload = async (file: File): Promise<string> => {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed')
  }
  
  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File size must be less than 5MB')
  }
  
  return uploadFile(file)
}
