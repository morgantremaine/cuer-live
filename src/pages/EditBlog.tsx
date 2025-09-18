import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Upload, Clock, User, Tag, Eye, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import CuerLogo from '@/components/common/CuerLogo';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const EditBlog = () => {
  const navigate = useNavigate();
  const { postId } = useParams();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPost, setIsLoadingPost] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [heroImagePreview, setHeroImagePreview] = useState<string>('');
  
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    heroImage: '',
    author: 'Cuer Team',
    category: '',
    readTime: '',
    content: '',
    featured: false
  });

  // Check if user is authorized to edit blog posts
  const isAuthorized = user?.email === 'morgan@cuer.live';

  useEffect(() => {
    if (!isAuthorized) {
      navigate('/blog');
      return;
    }
    if (postId) {
      loadBlogPost();
    }
  }, [postId, isAuthorized, navigate]);

  const loadBlogPost = async () => {
    if (!postId) return;
    
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (error) {
        console.error('Error loading blog post:', error);
        toast({
          title: "Error",
          description: "Failed to load blog post.",
          variant: "destructive"
        });
        navigate('/blog/manage');
        return;
      }

      if (data) {
        setFormData({
          title: data.title,
          excerpt: data.excerpt,
          heroImage: data.hero_image || '',
          author: data.author,
          category: data.category || '',
          readTime: data.read_time,
          content: data.content,
          featured: data.featured
        });
        
        if (data.hero_image) {
          setHeroImagePreview(data.hero_image);
        }
      }
    } catch (error) {
      console.error('Error loading blog post:', error);
      toast({
        title: "Error",
        description: "Failed to load blog post.",
        variant: "destructive"
      });
      navigate('/blog/manage');
    } finally {
      setIsLoadingPost(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-slate-950 text-white flex items-center justify-center">
        <Card className="bg-slate-800/30 backdrop-blur-sm border-slate-700/30 max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h2>
            <p className="text-slate-300 mb-6">You don't have permission to edit blog posts.</p>
            <Button onClick={() => navigate('/blog')} variant="outline">
              Back to Blog
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingPost) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading article...</p>
        </div>
      </div>
    );
  }

  const handleInputChange = (field: string, value: string | Date) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setHeroImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setHeroImagePreview(result);
        setFormData(prev => ({ ...prev, heroImage: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const calculateReadTime = (content: string): string => {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} min read`;
  };

  const handleSave = async () => {
    if (!formData.title || !formData.excerpt || !formData.content) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in title, excerpt, and content.",
        variant: "destructive"
      });
      return;
    }

    if (!user || !postId) {
      toast({
        title: "Error",
        description: "Unable to update blog post.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Calculate read time if not provided
      const readTime = formData.readTime || calculateReadTime(formData.content);
      
      // Generate slug from title
      const slug = generateSlug(formData.title);

      // Update blog post object for database
      const updateData = {
        title: formData.title,
        excerpt: formData.excerpt,
        content: formData.content,
        hero_image: formData.heroImage || null,
        author: formData.author,
        category: formData.category || null,
        read_time: readTime,
        slug: slug,
        featured: formData.featured
      };

      // Update in database
      const { error } = await supabase
        .from('blog_posts')
        .update(updateData)
        .eq('id', postId);

      if (error) {
        console.error('Error updating blog post:', error);
        toast({
          title: "Error",
          description: "Failed to update blog post. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Blog Post Updated",
        description: `"${formData.title}" has been updated successfully.`,
      });

      // Navigate back to article manager
      navigate('/blog/manage');
      
    } catch (error) {
      console.error('Error updating blog post:', error);
      toast({
        title: "Error",
        description: "Failed to update blog post. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const PreviewModal = () => {
    const readTime = formData.readTime || calculateReadTime(formData.content);
    
    return (
      <div className="max-w-4xl mx-auto">
        {/* Article Header */}
        <header className="mb-8">
          <div className="flex items-center space-x-4 mb-6 text-sm text-slate-400">
            <Badge variant="outline" className="border-slate-600 text-slate-300">
              {formData.category || 'Uncategorized'}
            </Badge>
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{readTime}</span>
            </div>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4 text-white">
            {formData.title || 'Blog Post Title'}
          </h1>
          
          <p className="text-lg text-slate-300 leading-relaxed mb-6">
            {formData.excerpt || 'Blog post excerpt will appear here...'}
          </p>
          
          <div className="flex items-center space-x-2 text-slate-400">
            <User className="h-5 w-5" />
            <span>By {formData.author}</span>
          </div>
        </header>

        {/* Hero Image */}
        {(heroImagePreview || formData.heroImage) && (
          <div className="mb-8">
            <img 
              src={heroImagePreview || formData.heroImage}
              alt={formData.title || 'Hero image'}
              className="w-full h-48 md:h-64 object-cover rounded-lg"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-48 md:h-64 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-lg flex items-center justify-center"><span class="text-slate-400">Image not available</span></div>';
              }}
            />
          </div>
        )}

        {/* Article Body */}
        <div 
          className="prose prose-lg prose-invert max-w-none 
                     prose-headings:text-white prose-headings:font-bold 
                     prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
                     prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
                     prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-4
                     prose-ul:text-slate-300 prose-li:mb-2
                     prose-strong:text-white prose-strong:font-semibold
                     prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline"
          dangerouslySetInnerHTML={{ 
            __html: formData.content || '<p class="text-slate-400 italic">Start writing your blog content...</p>' 
          }}
        />

        {/* Call to Action Section - Automatically included */}
        <div className="mt-16 mb-16 text-center bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-2xl p-8 md:p-12">
          <h3 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Production Workflow?
          </h3>
          <p className="text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto mb-8">
            Experience the future of broadcast production with Cuer's intuitive rundown management. 
            Get started with a free account today.
          </p>
          <Button 
            size="lg" 
            className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-4 h-auto relative overflow-hidden group"
          >
            <span className="relative z-10">Get Started for Free</span>
            <ArrowRight className="ml-2 h-5 w-5 relative z-10 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-slate-950 text-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/blog/manage')}
            className="text-gray-300 hover:text-white hover:bg-gray-700/50 p-2"
            title="Back to Article Manager"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CuerLogo className="h-8 w-auto" />
        </div>
        <div className="flex items-center space-x-6">
          <Link to="/blog" className="text-slate-300 hover:text-white transition-colors">
            Blog
          </Link>
          <Button onClick={() => navigate('/dashboard')} variant="outline" className="border-slate-300/30 text-white hover:bg-slate-700/50">
            Dashboard
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
            Edit 
            <span className="text-blue-500 bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent"> Blog Post</span>
          </h1>
          <p className="text-xl text-slate-300 leading-relaxed">
            Update your blog post content and settings.
          </p>
        </div>

        <Card className="bg-slate-800/30 backdrop-blur-sm border-slate-700/30">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <User className="h-5 w-5" />
              <span>Blog Post Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-slate-200">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter blog post title"
                className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
              />
            </div>

            {/* Excerpt */}
            <div className="space-y-2">
              <Label htmlFor="excerpt" className="text-slate-200">Excerpt *</Label>
              <Textarea
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) => handleInputChange('excerpt', e.target.value)}
                placeholder="Write a compelling excerpt that summarizes your post (160 characters max recommended)"
                className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 min-h-[80px]"
                maxLength={200}
              />
              <div className="text-sm text-slate-400">
                {formData.excerpt.length}/200 characters
              </div>
            </div>

            {/* Hero Image Upload */}
            <div className="space-y-2">
              <Label htmlFor="heroImage" className="text-slate-200">Hero Image</Label>
              <div className="flex items-center space-x-4">
                <Input
                  id="heroImage"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="bg-slate-700/50 border-slate-600 text-white file:bg-blue-600 file:text-white file:border-0 file:rounded file:px-4 file:py-2"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-300"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </div>
              {heroImagePreview && (
                <div className="mt-4">
                  <img
                    src={heroImagePreview}
                    alt="Hero image preview"
                    className="w-full max-w-md h-48 object-cover rounded-lg border border-slate-600"
                  />
                </div>
              )}
            </div>

            {/* Category and Read Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-slate-200">Category</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="Technology" className="text-white">Technology</SelectItem>
                    <SelectItem value="Best Practices" className="text-white">Best Practices</SelectItem>
                    <SelectItem value="Guide" className="text-white">Guide</SelectItem>
                    <SelectItem value="Industry News" className="text-white">Industry News</SelectItem>
                    <SelectItem value="Tutorials" className="text-white">Tutorials</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="readTime" className="text-slate-200">Read Time</Label>
                <Input
                  id="readTime"
                  value={formData.readTime}
                  onChange={(e) => handleInputChange('readTime', e.target.value)}
                  placeholder="e.g., 5 min read (auto-calculated if empty)"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                />
              </div>
            </div>

            {/* Author */}
            <div className="space-y-2">
              <Label htmlFor="author" className="text-slate-200">Author</Label>
              <Input
                id="author"
                value={formData.author}
                onChange={(e) => handleInputChange('author', e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white"
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content" className="text-slate-200">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                placeholder="Write your blog post content here. Use HTML tags for formatting (h2, h3, p, ul, li, strong, em, etc.)"
                className="bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 min-h-[400px] font-mono text-sm"
              />
              <div className="text-sm text-slate-400">
                Word count: {formData.content.split(/\s+/).filter(word => word.length > 0).length} words
                {formData.content && ` • Estimated read time: ${calculateReadTime(formData.content)}`}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-700">
              <Button
                variant="outline"
                onClick={() => navigate('/blog/manage')}
                className="border-slate-600 text-slate-300 hover:bg-slate-700/50"
              >
                Cancel
              </Button>
              
              <div className="flex items-center space-x-3">
                <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-blue-600/50 text-blue-400 hover:bg-blue-600/20"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-6xl max-h-[90vh] bg-slate-900 border-slate-700 overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-white">Blog Post Preview</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4">
                      <PreviewModal />
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Blog Post
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditBlog;