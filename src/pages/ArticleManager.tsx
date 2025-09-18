import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Star, StarOff, Clock, User, Plus, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import CuerLogo from '@/components/common/CuerLogo';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  hero_image: string | null;
  author: string;
  publish_date: string;
  read_time: string;
  category: string | null;
  featured: boolean;
  slug: string;
  created_at: string;
  view_count?: number;
}

const ArticleManager = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if user is authorized
  const isAuthorized = user?.email === 'morgan@cuer.live';

  useEffect(() => {
    if (!isAuthorized) {
      navigate('/blog');
      return;
    }
    fetchBlogPosts();
  }, [isAuthorized, navigate]);

  const fetchBlogPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select(`
          *,
          blog_post_views (
            view_count
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching blog posts:', error);
        toast({
          title: "Error",
          description: "Failed to fetch blog posts.",
          variant: "destructive"
        });
      } else {
        // Map the data to include view_count directly on the blog post object
        const postsWithViews = (data || []).map(post => ({
          ...post,
          view_count: post.blog_post_views?.[0]?.view_count || 0
        }));
        setBlogPosts(postsWithViews);
      }
    } catch (error) {
      console.error('Error fetching blog posts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch blog posts.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFeatured = async (postId: string, currentFeatured: boolean) => {
    try {
      // If setting as featured, first remove featured status from all other posts
      if (!currentFeatured) {
        await supabase
          .from('blog_posts')
          .update({ featured: false })
          .neq('id', postId);
      }

      // Then update the selected post
      const { error } = await supabase
        .from('blog_posts')
        .update({ featured: !currentFeatured })
        .eq('id', postId);

      if (error) {
        console.error('Error updating featured status:', error);
        toast({
          title: "Error",
          description: "Failed to update featured status.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: `Article ${!currentFeatured ? 'set as' : 'removed from'} featured.`,
        });
        fetchBlogPosts(); // Refresh the list
      }
    } catch (error) {
      console.error('Error updating featured status:', error);
      toast({
        title: "Error",
        description: "Failed to update featured status.",
        variant: "destructive"
      });
    }
  };

  const deletePost = async (postId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', postId);

      if (error) {
        console.error('Error deleting blog post:', error);
        toast({
          title: "Error",
          description: "Failed to delete blog post.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: `"${title}" has been deleted.`,
        });
        fetchBlogPosts(); // Refresh the list
      }
    } catch (error) {
      console.error('Error deleting blog post:', error);
      toast({
        title: "Error",
        description: "Failed to delete blog post.",
        variant: "destructive"
      });
    }
  };

  if (!isAuthorized) {
    return null; // Will redirect in useEffect
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading articles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-slate-950 text-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/blog')}
            className="text-gray-300 hover:text-white hover:bg-gray-700/50 p-2"
            title="Back to Blog"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CuerLogo className="h-8 w-auto" />
        </div>
        <div className="flex items-center space-x-6">
          <Link to="/blog" className="text-slate-300 hover:text-white transition-colors">
            Blog
          </Link>
          <Button 
            onClick={() => navigate('/blog/create')} 
            variant="outline" 
            className="border-blue-600/50 text-blue-400 hover:bg-blue-600/20"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Post
          </Button>
          <Button onClick={() => navigate('/dashboard')} variant="outline" className="border-slate-300/30 text-white hover:bg-slate-700/50">
            Dashboard
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
            Article
            <span className="text-blue-500 bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent"> Manager</span>
          </h1>
          <p className="text-xl text-slate-300 leading-relaxed">
            Manage your blog posts, edit content, and control featured articles.
          </p>
        </div>

        {/* Articles List */}
        <Card className="bg-slate-800/30 backdrop-blur-sm border-slate-700/30">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white">
              <span>All Articles ({blogPosts.length})</span>
              <Button 
                onClick={() => navigate('/blog/create')} 
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Article
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {blogPosts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400 mb-4">No articles found.</p>
                <Button 
                  onClick={() => navigate('/blog/create')}
                  variant="outline"
                  className="border-blue-600/50 text-blue-400 hover:bg-blue-600/20"
                >
                  Create Your First Article
                </Button>
              </div>
            ) : (
              blogPosts.map((post) => (
                <div 
                  key={post.id} 
                  className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600/30 hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {post.title}
                      </h3>
                      {post.featured && (
                        <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30">
                          <Star className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                      {post.category && (
                        <Badge variant="outline" className="border-slate-600 text-slate-300">
                          {post.category}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-slate-300 text-sm mb-3 line-clamp-2">
                      {post.excerpt}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs text-slate-400">
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>{post.author}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{post.read_time}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Eye className="h-3 w-3" />
                        <span>{post.view_count || 0} views</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 ml-4">
                    {/* Featured Toggle */}
                    <div className="flex items-center space-x-2">
                      <label htmlFor={`featured-${post.id}`} className="text-sm text-slate-300">
                        Featured
                      </label>
                      <Switch
                        id={`featured-${post.id}`}
                        checked={post.featured}
                        onCheckedChange={() => toggleFeatured(post.id, post.featured)}
                      />
                    </div>
                    
                    {/* Action Buttons */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/blog/edit/${post.id}`)}
                      className="border-blue-600/50 text-blue-400 hover:bg-blue-600/20"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deletePost(post.id, post.title)}
                      className="border-red-600/50 text-red-400 hover:bg-red-600/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ArticleManager;