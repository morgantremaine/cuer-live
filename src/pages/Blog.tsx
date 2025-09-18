import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, User, Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CuerLogo from '@/components/common/CuerLogo';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  hero_image: string | null;
  author: string;
  read_time: string;
  category: string | null;
  featured: boolean;
  slug: string;
}

const Blog = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlogPosts();
  }, []);

  const fetchBlogPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching blog posts:', error);
      } else {
        setBlogPosts(data || []);
      }
    } catch (error) {
      console.error('Error fetching blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const featuredPost = blogPosts.find(post => post.featured);
  const otherPosts = blogPosts.filter(post => !post.featured);

  // Check if user is authorized to create blog posts
  const canCreateBlog = user?.email === 'morgan@cuer.live';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading blog posts...</p>
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
            onClick={() => navigate('/')}
            className="text-gray-300 hover:text-white hover:bg-gray-700/50 p-2"
            title="Back to Home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CuerLogo className="h-8 w-auto" />
        </div>
        <div className="flex items-center space-x-6">
          <Link to="/" className="text-slate-300 hover:text-white transition-colors">
            Home
          </Link>
          {canCreateBlog && (
            <div className="flex items-center space-x-3">
              <Button 
                onClick={() => navigate('/blog/manage')} 
                variant="outline" 
                className="border-slate-600/50 text-slate-300 hover:bg-slate-600/20"
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage Articles
              </Button>
              <Button 
                onClick={() => navigate('/blog/create')} 
                variant="outline" 
                className="border-blue-600/50 text-blue-400 hover:bg-blue-600/20"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Post
              </Button>
            </div>
          )}
          <Button onClick={() => navigate('/login')} variant="outline" className="border-slate-300/30 text-white hover:bg-slate-700/50">
            Sign In
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
            Cuer
            <span className="text-blue-500 bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent"> Blog</span>
          </h1>
          <p className="text-xl text-slate-300 leading-relaxed max-w-3xl mx-auto">
            Insights, tips, and best practices for modern broadcast production teams.
          </p>
        </div>

        {/* Featured Article */}
        {featuredPost && (
          <div className="mb-16">
            <Badge variant="secondary" className="bg-blue-600/20 text-blue-400 border-blue-600/30 mb-6">
              Featured Article
            </Badge>
            <Card className="bg-slate-800/30 backdrop-blur-sm border-slate-700/30 hover:bg-slate-800/50 transition-all duration-300 group overflow-hidden">
              <div className="grid lg:grid-cols-2 gap-0">
                <div className="relative">
                  <img 
                    src={featuredPost.hero_image || '/uploads/default-blog-hero.jpg'}
                    alt={featuredPost.title}
                    className="w-full h-64 lg:h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      // Fallback to a gradient background if image fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.className += ' bg-gradient-to-br from-blue-600/20 to-purple-600/20';
                    }}
                  />
                </div>
                <CardContent className="p-8 flex flex-col justify-center">
                  <div className="flex items-center space-x-4 mb-4 text-sm text-slate-400">
                    <Badge variant="outline" className="border-slate-600 text-slate-300">
                      {featuredPost.category}
                    </Badge>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{featuredPost.read_time}</span>
                    </div>
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4 group-hover:text-blue-300 transition-colors">
                    {featuredPost.title}
                  </h2>
                  <p className="text-slate-300 leading-relaxed mb-6">
                    {featuredPost.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm text-slate-400">
                      <User className="h-4 w-4" />
                      <span>{featuredPost.author}</span>
                    </div>
                    <Button 
                      onClick={() => navigate(`/blog/${featuredPost.slug}`)}
                      variant="outline" 
                      className="border-blue-600/50 text-blue-400 hover:bg-blue-600/20"
                    >
                      Read Full Article
                    </Button>
                  </div>
                </CardContent>
              </div>
            </Card>
          </div>
        )}

        {/* Other Articles Grid */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8">Latest Articles</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {otherPosts.map((post) => (
              <Card key={post.id} className="bg-slate-800/30 backdrop-blur-sm border-slate-700/30 hover:bg-slate-800/50 transition-all duration-300 group overflow-hidden">
                <div className="relative">
                  <img 
                    src={post.hero_image || '/uploads/default-blog-hero.jpg'}
                    alt={post.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      // Fallback to a gradient background if image fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.className += ' bg-gradient-to-br from-blue-600/20 to-purple-600/20 h-48';
                    }}
                  />
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4 mb-3 text-sm text-slate-400">
                    <Badge variant="outline" className="border-slate-600 text-slate-300">
                      {post.category}
                    </Badge>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{post.read_time}</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-blue-300 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-slate-300 leading-relaxed mb-4 text-sm">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm text-slate-400">
                      <User className="h-4 w-4" />
                      <span>{post.author}</span>
                    </div>
                    <Button 
                      onClick={() => navigate(`/blog/${post.slug}`)}
                      variant="ghost" 
                      size="sm"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Read More
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Blog;
