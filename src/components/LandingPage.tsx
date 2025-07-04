import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, Users, Bot, Share2, Monitor, Upload, Eye, Radio, FileText, Zap, Star, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CuerLogo from '@/components/common/CuerLogo';
import { useAuth } from '@/hooks/useAuth';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const features = [
    {
      icon: Clock,
      title: "Precision Timing",
      description: "Automated cue timing that adapts to changes in real-time, minimizing manual cueing and errors.",
      color: "text-blue-500"
    },
    {
      icon: Users,
      title: "Team Collaboration", 
      description: "Real-time collaboration with your entire team. See changes instantly, work together seamlessly.",
      color: "text-green-500"
    },
    {
      icon: Bot,
      title: "AI-Powered Assistant",
      description: "Intelligent AI helper for rundown analysis, content suggestions, and timing assistance.",
      color: "text-purple-500"
    },
    {
      icon: Share2,
      title: "Share & Display",
      description: "Create public read-only links for stakeholders and external viewing without login required.",
      color: "text-indigo-500"
    },
    {
      icon: Monitor,
      title: "Teleprompter Ready",
      description: "Full-screen teleprompter mode with scrolling controls for talent and operators.",
      color: "text-amber-500"
    },
    {
      icon: Eye,
      title: "AD View Dashboard",
      description: "Dedicated Assistant Director view with live timing for control room displays.",
      color: "text-red-500"
    }
  ];

  const testimonialFeatures = [
    "Real-time auto-save prevents data loss",
    "Drag & drop reordering",
    "Visual status tracking during live shows", 
    "Custom column layouts per team member",
    "Blueprint mode for pre-production planning",
    "CSV import for existing rundowns"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white overflow-hidden">
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="flex items-center">
          <CuerLogo className="h-8 w-8" />
        </div>
        <div className="flex items-center space-x-4">
          <Link to="/help" className="text-gray-300 hover:text-white transition-colors">
            Help
          </Link>
          {user ? (
            <Button onClick={() => navigate('/dashboard')} variant="outline" className="border-white/20 text-white hover:bg-white/10">
              Dashboard
            </Button>
          ) : (
            <Button onClick={() => navigate('/login')} variant="outline" className="border-white/20 text-white hover:bg-white/10">
              Sign In
            </Button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-200 border-blue-400/30">
                <Zap className="w-4 h-4 mr-2" />
                Professional Broadcast Tool
              </Badge>
              
              <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                Your next production
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  will be on time
                </span>
              </h1>
              
              <p className="text-xl text-gray-300 leading-relaxed max-w-2xl">
                Create stunning run of show documents with your entire team on Cuer Live. 
                Plan, cue, and direct events with precision, all from a web browser.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={handleGetStarted}
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-4 h-auto"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate('/help')}
                className="border-white/20 text-white hover:bg-white/10 text-lg px-8 py-4 h-auto"
              >
                Explore Features
              </Button>
            </div>

            {/* Quick Features List */}
            <div className="grid grid-cols-2 gap-4 pt-8">
              {testimonialFeatures.slice(0, 4).map((feature, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm text-gray-300">
                  <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Actual Rundown Interface */}
          <div className="relative">
            <img 
              src="/lovable-uploads/eee4cab2-b77f-407a-abd0-caaf1ac3e21d.png" 
              alt="Cuer Live Interface"
              className="w-full h-auto rounded-2xl shadow-2xl border border-white/10"
            />
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-32">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Everything you need for 
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> professional broadcasts</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            From pre-production planning to live show execution, Cuer Live provides all the tools your team needs.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`p-3 rounded-lg bg-gray-800/50 group-hover:scale-110 transition-transform`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                </div>
                <p className="text-gray-300 leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* How It Works Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-32">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">How it works</h2>
          <p className="text-xl text-gray-400">Simple, powerful, professional</p>
        </div>
        
        {/* Use the provided screenshot */}
        <div className="flex justify-center">
          <img 
            src="/lovable-uploads/ef6cf2a6-c012-42e8-8c8f-4a7e0570f2b0.png" 
            alt="How Cuer Live Works - Create & Collaborate, Go Live, Share & Display"
            className="w-full max-w-5xl h-auto rounded-2xl shadow-lg"
          />
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 pb-32 text-center">
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm border border-white/10 rounded-2xl p-12">
          <h2 className="text-4xl font-bold mb-6">
            Ready to transform your productions?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join broadcast professionals who trust Cuer Live for their most important shows.
            Start building your first rundown today.
          </p>
          <Button 
            onClick={handleGetStarted}
            size="lg" 
            className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-12 py-4 h-auto"
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
};

export default LandingPage;