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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="flex items-center">
          <CuerLogo className="h-8 w-auto" />
        </div>
        <div className="flex items-center space-x-4">
          <Link to="/help" className="text-slate-300 hover:text-white transition-colors">
            Help
          </Link>
          {user ? (
            <Button onClick={() => navigate('/dashboard')} variant="outline" className="border-slate-300/30 text-white hover:bg-slate-700/50">
              Dashboard
            </Button>
          ) : (
            <Button onClick={() => navigate('/login')} variant="outline" className="border-slate-300/30 text-white hover:bg-slate-700/50">
              Sign In
            </Button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-24">
        <div className="text-center space-y-8 mb-16">
          <Badge variant="secondary" className="bg-slate-700/50 text-slate-200 border-slate-600/50">
            <Zap className="w-4 h-4 mr-2" />
            Professional Broadcast Tool
          </Badge>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight max-w-4xl mx-auto">
            The world's most
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-slate-400 bg-clip-text text-transparent">
              intuitive rundown maker
            </span>
          </h1>
          
          <p className="text-xl text-slate-300 leading-relaxed max-w-3xl mx-auto">
            Create stunning run of show documents with your entire team on Cuer Live. 
            Plan, cue, and direct events with precision, all from a web browser.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
              className="border-slate-300/30 text-white hover:bg-slate-700/50 text-lg px-8 py-4 h-auto"
            >
              Explore Features
            </Button>
          </div>
        </div>

        {/* Hero Rundown Interface - Much Larger */}
        <div className="relative max-w-6xl mx-auto mb-16">
          <img 
            src="/lovable-uploads/6ab67d89-df00-4400-85fc-59eb71afc52a.png" 
            alt="Cuer Live Professional Rundown Interface"
            className="w-full h-auto rounded-2xl shadow-2xl border border-slate-600/30"
          />
        </div>

        {/* Quick Features List */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {testimonialFeatures.slice(0, 4).map((feature, index) => (
            <div key={index} className="flex items-center space-x-3 text-slate-300 bg-slate-800/30 p-4 rounded-lg border border-slate-700/30">
              <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0" />
              <span className="text-sm font-medium">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Everything you need for 
            <span className="bg-gradient-to-r from-blue-400 to-slate-400 bg-clip-text text-transparent"> professional broadcasts</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            From pre-production planning to live show execution, Cuer Live provides all the tools your team needs.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-slate-800/30 backdrop-blur-sm border-slate-700/30 hover:bg-slate-800/50 transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`p-3 rounded-lg bg-slate-700/50 group-hover:scale-110 transition-transform`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                </div>
                <p className="text-slate-300 leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* How It Works Section - Updated */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="flex justify-center mb-16">
          <img 
            src="/lovable-uploads/f24e2bc5-3dc2-4493-9dad-16ca9fc91bd8.png" 
            alt="Create & Collaborate, Go Live, Share & Display"
            className="w-full max-w-5xl h-auto rounded-2xl shadow-lg border border-slate-600/30"
          />
        </div>

        {/* Live Show Control in alternating format */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-white">Live Show Control</h3>
            <p className="text-xl text-slate-400">
              Professional timing controls and real-time status tracking for your entire production team.
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2 text-slate-300">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>Real-time timing controls</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>Status tracking for entire team</span>
              </div>
            </div>
          </div>
          <img 
            src="/lovable-uploads/f781bf0d-20b8-472c-a811-7f489eea1594.png" 
            alt="Live Show Controls"
            className="w-full h-auto rounded-lg shadow-lg border border-slate-600/30"
          />
        </div>

        {/* Blueprint and Notes in alternating format */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-white">Blueprint Mode</h3>
            <p className="text-xl text-slate-400">
              Organize your show elements with smart checklists. Track talent, graphics, and show blocks with intuitive filtering and organization tools.
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2 text-slate-300">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>Smart filtering and organization</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>Checklist management</span>
              </div>
            </div>
          </div>
          <img 
            src="/lovable-uploads/0dd96b7d-2278-4e88-abd7-ebff65c98dd7.png" 
            alt="Blueprint Planning Interface"
            className="w-full h-auto rounded-lg shadow-lg border border-slate-600/30"
          />
        </div>
        
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <img 
            src="/lovable-uploads/d8bd00f7-e579-4df8-8fcf-4d4c1466eae9.png" 
            alt="Notes and Documentation"
            className="w-full h-auto rounded-lg shadow-lg border border-slate-600/30"
          />
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-white">Rich Notes & Documentation</h3>
            <p className="text-xl text-slate-400">
              Capture and organize show notes with rich text formatting, search functionality, and collaborative editing for your entire team.
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2 text-slate-300">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>Rich text formatting</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>Searchable documentation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Team Management in alternating format */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-white">Team Management</h3>
            <p className="text-xl text-slate-400">
              Invite team members, manage permissions, and collaborate seamlessly across your entire organization.
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2 text-slate-300">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>Role-based permissions</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>Real-time collaboration</span>
              </div>
            </div>
          </div>
          <img 
            src="/lovable-uploads/c1aca8d4-0287-46a0-ab8d-f31ce3d5cbbd.png" 
            alt="Team Management Interface"
            className="w-full h-auto rounded-lg shadow-lg border border-slate-600/30"
          />
        </div>
      </div>

      {/* AI Assistant Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Smart AI assistance for <span className="bg-gradient-to-r from-blue-400 to-slate-400 bg-clip-text text-transparent">perfect rundowns</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Get intelligent insights and suggestions from our AI assistant to optimize your rundown and catch potential issues before they happen.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-white">Cuer AI Assistant</h3>
            <p className="text-xl text-slate-400">
              Your intelligent production companion analyzes your rundown in real-time, offering suggestions and identifying potential issues to keep your show running smoothly.
            </p>
            <div className="grid grid-cols-1 gap-4 text-sm">
              <div className="flex items-center space-x-2 text-slate-300">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>Real-time rundown analysis and optimization</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>Proactive issue detection and suggestions</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>Intelligent timing and content recommendations</span>
              </div>
            </div>
          </div>
          <img 
            src="/lovable-uploads/d4e97f8e-fc43-4829-9671-f784ebd3ce47.png" 
            alt="Cuer AI Assistant Interface"
            className="w-full h-auto rounded-lg shadow-lg border border-slate-600/30"
          />
        </div>
      </div>

      {/* Additional Features Showcase */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-white">
            Every view you need for <span className="bg-gradient-to-r from-blue-400 to-slate-400 bg-clip-text text-transparent">professional production</span>
          </h2>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-white">Shared Public Views</h3>
            <p className="text-xl text-slate-400">
              Create read-only links for stakeholders, clients, and external viewers. Perfect for control rooms and public displays.
            </p>
          </div>
          <img 
            src="/lovable-uploads/a8f26352-6c2f-4e9f-91b5-6db3581e2d48.png" 
            alt="Shared Rundown View"
            className="w-full h-auto rounded-lg shadow-lg border border-slate-600/30"
          />
        </div>
        
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <img 
            src="/lovable-uploads/9f875f50-34f7-4b20-b8b3-b56ba3bccbe8.png" 
            alt="Teleprompter Full Screen"
            className="w-full h-auto rounded-lg shadow-lg border border-slate-600/30"
          />
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-white">Full-Screen Teleprompter</h3>
            <p className="text-xl text-slate-400">
              Professional teleprompter mode with speed controls, formatting options, and remote control capabilities for talent and operators.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 pb-24 text-center">
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-600/30 rounded-2xl p-12">
          <h2 className="text-4xl font-bold mb-6 text-white">
            Ready to transform your productions?
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
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
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-slate-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
};

export default LandingPage;