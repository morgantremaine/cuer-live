import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Clock, User, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CuerLogo from '@/components/common/CuerLogo';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { SEO } from '@/components/SEO';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  hero_image: string | null;
  author: string;
  read_time: string | null;
  category: string | null;
  featured: boolean;
  slug: string;
  content: string;
}

const BlogPost = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  useEffect(() => {
    if (postId) {
      fetchBlogPost(postId);
    }
  }, [postId]);

  const fetchBlogPost = async (slug: string) => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) {
        console.error('Error fetching blog post:', error);
        setNotFound(true);
      } else {
        setPost(data);
        
        // Increment page view count
        try {
          const { error: viewError } = await supabase.rpc('increment_blog_post_view', {
            post_uuid: data.id
          });
          
          if (viewError) {
            console.error('Error incrementing page view:', viewError);
          }
        } catch (viewError) {
          console.error('Error incrementing page view:', viewError);
        }
      }
    } catch (error) {
      console.error('Error fetching blog post:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };
  
  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login?tab=signup');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading article...</p>
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black to-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Post Not Found</h1>
          <p className="text-slate-400 mb-8">The blog post you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/blog')} className="bg-blue-600 hover:bg-blue-700">
            Back to Blog
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-slate-950 text-white">
      <SEO 
        title={`${post.title} - Cuer Blog`}
        description={post.excerpt}
        keywords={`${post.category}, broadcast production, rundown management`}
        canonicalUrl={`https://cuer.live/blog/${post.slug}`}
        ogImage={post.hero_image || 'https://cuer.live/uploads/cuer-og-image.jpg'}
        ogType="article"
      />
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-4xl mx-auto">
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
          <Link to="/" className="text-slate-300 hover:text-white transition-colors">
            Home
          </Link>
          {!user && (
            <Button onClick={() => navigate('/login')} variant="outline" className="border-slate-300/30 text-white hover:bg-slate-700/50">
              Sign In
            </Button>
          )}
        </div>
      </nav>

      {/* Article Content */}
      <article className="max-w-4xl mx-auto px-6 py-12">
        {/* Article Header */}
        <header className="mb-12">
          <div className="flex items-center space-x-4 mb-6 text-sm text-slate-400">
            {post.category && (
              <Badge variant="outline" className="border-slate-600 text-slate-300">
                {post.category}
              </Badge>
            )}
            {post.read_time && (
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{post.read_time}</span>
              </div>
            )}
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6 text-white">
            {post.title}
          </h1>
          
          <p className="text-xl text-slate-300 leading-relaxed mb-8">
            {post.excerpt}
          </p>
          
          <div className="flex items-center space-x-2 text-slate-400">
            <User className="h-5 w-5" />
            <span>By {post.author}</span>
          </div>
        </header>

        {/* Hero Image */}
        {post.hero_image && (
          <div className="mb-12">
            <img 
              src={post.hero_image} 
              alt={post.title}
              className="w-full rounded-lg shadow-2xl"
            />
          </div>
        )}

        {/* Article Body */}
        <div className="prose prose-invert prose-lg max-w-none">
          <div 
            className="text-slate-200 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>

        {/* Call to Action */}
        <div className="mt-16 p-8 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Streamline Your Production?</h2>
          <p className="text-slate-300 mb-6">
            Get your first show organized in minutes. Create your free Cuer account today.
          </p>
          <Button 
            onClick={handleGetStarted}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
          >
            Get Started Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <div className="mt-16 pt-8 border-t border-slate-700 flex justify-center">
          <Button 
            onClick={() => navigate('/blog')} 
            variant="outline" 
            className="border-slate-600 text-slate-300 hover:bg-slate-600/20"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Blog
          </Button>
        </div>
      </article>

      {/* Footer */}
      <footer className="bg-slate-900/50 border-t border-slate-800 mt-20">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <CuerLogo className="h-8 w-auto" />
              <span className="text-slate-400">© {new Date().getFullYear()} Cuer. All rights reserved.</span>
            </div>
            <div className="flex items-center space-x-6">
              <Link to="/blog" className="text-slate-300 hover:text-white transition-colors">
                Blog
              </Link>
              <Link to="/" className="text-slate-300 hover:text-white transition-colors">
                Home
              </Link>
              <Button 
                onClick={handleGetStarted}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BlogPost;