import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, Users, Bot, Share2, Monitor, Upload, Eye, Radio, FileText, Zap, Star, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CuerLogo from '@/components/common/CuerLogo';
import { useAuth } from '@/hooks/useAuth';
import { LandingPagePricing } from '@/components/LandingPagePricing';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pricingInterval, setPricingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login?tab=signup');
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
    <>
      {/* Preload critical background image */}
      <link rel="preload" as="image" href="/uploads/broadcast-control-room-hero.png" />
      
      <div className="min-h-screen bg-gradient-to-br from-black to-slate-950 text-white overflow-hidden relative">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-20 transition-all duration-500 ${
        isScrolled ? 'backdrop-blur-sm' : ''
      }`}
      style={{
        background: isScrolled ? 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0) 100%)' : 'transparent',
        maskImage: isScrolled ? 'linear-gradient(to bottom, black 0%, black 60%, transparent 100%)' : 'none',
        WebkitMaskImage: isScrolled ? 'linear-gradient(to bottom, black 0%, black 60%, transparent 100%)' : 'none'
      }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between p-6 pb-16">
          <div className={`flex items-center transition-all duration-500 ${
            isScrolled ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-2'
          }`}>
            <CuerLogo className="h-8 w-auto" />
          </div>
          <div className="flex items-center space-x-6">
          <div className="hidden md:flex items-center space-x-6 text-white">
            <button 
              onClick={() => document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Features
            </button>
            <button 
              onClick={() => navigate('/blog')}
              className="text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Blog
            </button>
            <button 
              onClick={() => document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Pricing
            </button>
          </div>
          {user ? (
            <Button onClick={() => navigate('/dashboard')} variant="outline" className="border-slate-300/30 text-white hover:bg-slate-700/50 glow-box">
              Dashboard
            </Button>
          ) : (
            <div className="flex items-center space-x-3">
              <Button onClick={() => navigate('/login')} variant="outline" className="border-slate-300/30 text-white hover:bg-slate-700/50 glow-box">
                Sign In
              </Button>
              <Button onClick={handleGetStarted} className="bg-blue-600 hover:bg-blue-700 text-white glow-box">
                Get Started for Free
              </Button>
            </div>
           )}
          </div>
        </div>
      </nav>

      {/* Hero Section with Full-Width Background */}
      <div className="relative z-10 w-full">
        {/* Hero Content with Background Image */}
        <div className="relative w-full min-h-screen">
          {/* Background Image - Fixed aspect ratio */}
          <div className="absolute inset-0 w-full h-full">
            <img 
              src="/uploads/broadcast-control-room-hero.png" 
              alt="Professional Broadcast Control Room"
              className="w-full h-full object-cover object-center animate-fade-in"
              loading="eager"
              fetchPriority="high"
            />
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/60"></div>
          </div>
          
          {/* Hero Text Content */}
          <div className="relative z-10 text-center space-y-8 py-24 px-8 max-w-7xl mx-auto min-h-screen flex flex-col justify-center">
            <Badge variant="secondary" className="bg-slate-700/50 text-slate-200 border-slate-600/50 fade-up pulse-glow">
              <Zap className="w-4 h-4 mr-2" />
              Professional Broadcast Tool
            </Badge>
            
            <div className="fade-up">
              <CuerLogo className="h-24 sm:h-32 md:h-40 lg:h-48 xl:h-56 w-auto mx-auto drop-shadow-2xl max-w-full" />
            </div>
            
            <p className="text-xl text-slate-300 leading-relaxed max-w-3xl mx-auto drop-shadow-xl fade-up">
              Purpose-built for speed, clarity, and control, Cuer delivers the high-end features of other premium rundown makers with the minimal and intuitive UI of Google Sheets.
            </p>

            <div className="flex justify-center fade-up">
              <Button 
                onClick={handleGetStarted}
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-4 h-auto glow-box relative overflow-hidden group"
              >
                <span className="relative z-10">Get Started for Free</span>
                <ArrowRight className="ml-2 h-5 w-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 shimmer"></div>
              </Button>
            </div>

          </div>
        </div>

        {/* Hero Rundown Interface - Starts exactly at image bottom */}
        <div className="relative bg-gradient-to-br from-black to-slate-950">
          <div className="max-w-6xl mx-auto px-6 py-24 fade-up">
            <div className="relative group">
              <img 
                src="/uploads/cuer-rundown-screenshot.png" 
                alt="Cuer Live Professional Rundown Interface with Advanced Features"
                className="w-full h-auto rounded-2xl shadow-2xl group-hover:scale-[1.02] transition-all duration-500"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Features Grid */}
      <div id="features-section" className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
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
            <Card key={index} className="bg-slate-800/30 backdrop-blur-sm border-slate-700/30 hover:bg-slate-800/50 transition-all duration-300 group glow-box fade-up">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`p-3 rounded-lg bg-slate-700/50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-semibold text-white group-hover:text-blue-300 transition-colors">{feature.title}</h3>
                </div>
                <p className="text-slate-300 leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Mobile & Tablet Compatibility Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-white">
            Stay in sync on <span className="bg-gradient-to-r from-blue-400 to-slate-400 bg-clip-text text-transparent">every device</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Full mobile and tablet compatibility ensures your entire team can collaborate seamlessly, whether they're in the studio, control room, or on the go.
          </p>
        </div>
        
        <div className="flex justify-center">
          <div className="group fade-up">
            <img 
              src="/uploads/mobile-mockups-v2.png" 
              alt="Cuer Live running on mobile devices showing professional rundown interface with tablet and phone views"
              className="h-auto max-w-xl group-hover:scale-[1.02] transition-all duration-500"
            />
          </div>
        </div>
      </div>

      {/* Live Show Control - Simple image only */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="text-center space-y-6 mb-16">
          <h3 className="text-3xl font-bold text-white">Live Show Control</h3>
          <p className="text-xl text-slate-400">
            Professional timing controls and real-time status tracking for your entire production team.
          </p>
          <div className="group fade-up">
            <img 
              src="/uploads/68360f2b-6961-47f6-a334-0ac01a4de303.png" 
              alt="Live Show Controls"
              className="w-full max-w-4xl mx-auto h-auto rounded-lg shadow-lg border border-slate-600/30 glow-box group-hover:scale-[1.02] transition-all duration-500"
            />
          </div>
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
                <span>Issue detection and suggestions</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>Intelligent timing and content recommendations</span>
              </div>
            </div>
          </div>
          <div className="group fade-up">
            <img 
              src="/uploads/d4e97f8e-fc43-4829-9671-f784ebd3ce47.png" 
              alt="Cuer AI Assistant Interface"
              className="w-full h-auto rounded-lg shadow-lg border border-slate-600/30 glow-box group-hover:scale-[1.02] transition-all duration-500"
            />
          </div>
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
          <div className="group fade-up">
            <img 
              src="/uploads/f4dc4d90-0508-49ae-8aad-abaaf909a734.png" 
              alt="Shared Rundown View"
              className="w-full h-auto rounded-lg shadow-lg border border-slate-600/30 glow-box group-hover:scale-[1.02] transition-all duration-500"
            />
          </div>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="group fade-up">
            <img 
              src="/uploads/832f09fb-bddb-4ced-b089-44bc34a1ac96.png" 
              alt="AD View Dashboard"
              className="w-full h-auto rounded-lg shadow-lg border border-slate-600/30 glow-box group-hover:scale-[1.02] transition-all duration-500"
            />
          </div>
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-white">AD View Dashboard</h3>
            <p className="text-xl text-slate-400">
              Dedicated Assistant Director view with live timing, script tracking, and comprehensive show control for professional broadcast environments and multiviewer placement.
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2 text-slate-300">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>Live timing and status tracking</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>Current script panel</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      </div>

      {/* Teleprompter Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-white">Full-Screen Teleprompter</h3>
            <p className="text-xl text-slate-400">
              Professional teleprompter mode with speed controls, formatting options, and realtime sync for back-and-forth editing and script writing.
            </p>
          </div>
          <div className="group fade-up">
            <img 
              src="/uploads/1461f5d6-383a-421e-ade7-2791f4afce6c.png" 
              alt="Teleprompter Full Screen"
              className="w-full h-auto rounded-lg shadow-lg border border-slate-600/30 glow-box group-hover:scale-[1.02] transition-all duration-500"
            />
          </div>
        </div>
      </div>

      {/* Blueprint Planning & Pre-Production */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-white">
            Complete planning tools for <span className="bg-gradient-to-r from-blue-400 to-slate-400 bg-clip-text text-transparent">seamless pre-production</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            From initial planning to live execution, Blueprint mode provides all the organizational tools your team needs for successful productions.
          </p>
        </div>
        {/* Smart Lists & Organization */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-white">Smart Lists & Organization</h3>
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
          <div className="group fade-up">
            <img 
              src="/uploads/0dd96b7d-2278-4e88-abd7-ebff65c98dd7.png" 
              alt="Blueprint Planning Interface"
              className="w-full h-auto rounded-lg shadow-lg border border-slate-600/30 glow-box group-hover:scale-[1.02] transition-all duration-500"
            />
          </div>
        </div>

        {/* Camera Plot Editor - Temporarily Disabled */}
        {/* 
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <div className="group fade-up">
            <img 
              src="/uploads/4ec27fa0-44b5-4515-bb67-9e999dca2f59.png" 
              alt="Camera Plot Editor"
              className="w-full h-auto rounded-lg shadow-lg border border-slate-600/30 glow-box group-hover:scale-[1.02] transition-all duration-500"
            />
          </div>
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-white">Camera Plot Editor</h3>
            <p className="text-xl text-slate-400">
              Visual camera plotting with drag-and-drop elements. Plan your camera positions, set layouts, and coordinate shots with precision for professional broadcast environments.
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2 text-slate-300">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>Drag-and-drop positioning</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>Multi-scene planning</span>
              </div>
            </div>
          </div>
        </div>
        */}
        
        {/* Team Management */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <div className="group fade-up">
            <img 
              src="/uploads/c1aca8d4-0287-46a0-ab8d-f31ce3d5cbbd.png" 
              alt="Team Management Interface"
              className="w-full h-auto rounded-lg shadow-lg border border-slate-600/30 glow-box group-hover:scale-[1.02] transition-all duration-500"
            />
          </div>
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
        </div>

        {/* Rich Notes & Documentation */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
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
          <div className="group fade-up">
            <img 
              src="/uploads/d8bd00f7-e579-4df8-8fcf-4d4c1466eae9.png" 
              alt="Notes and Documentation"
              className="w-full h-auto rounded-lg shadow-lg border border-slate-600/30 glow-box group-hover:scale-[1.02] transition-all duration-500"
            />
          </div>
        </div>
      </div>

      {/* Detailed Rundown Cards Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-white">
            Rich rundown cards with <span className="bg-gradient-to-r from-blue-400 to-slate-400 bg-clip-text text-transparent">detailed insights</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Each rundown shows comprehensive details at a glance - track headers, segments, duration, and activity status for efficient project management.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-white">Comprehensive Project Overview</h3>
            <p className="text-xl text-slate-400">
              Every rundown card displays essential information including segment counts, total duration, recent activity status, and quick access to both editing and blueprint modes.
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2 text-slate-300">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>Real-time activity tracking</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>Segment and header counts</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>Total duration display</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>Quick access to all modes</span>
              </div>
            </div>
          </div>
          <div className="group fade-up">
            <img 
              src="/uploads/fda659c6-14fe-4a8f-9b42-efba05fb6022.png" 
              alt="Detailed Rundown Card Interface"
              className="w-full h-auto rounded-lg shadow-lg border border-slate-600/30 glow-box group-hover:scale-[1.02] transition-all duration-500"
            />
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing-section" className="relative z-10 w-full pb-24">
        <div className="text-center mb-16 max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold mb-4 text-white">
            Choose the perfect plan for <span className="bg-gradient-to-r from-blue-400 to-slate-400 bg-clip-text text-transparent">your team</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Start with any plan and scale as your team grows. All plans include the core features you need for professional broadcast production.
          </p>
        </div>
        
        <LandingPagePricing 
          interval={pricingInterval}
          onIntervalChange={setPricingInterval}
        />
        
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

      {/* Copyright Footer */}
      <footer className="relative z-10 text-center py-8 border-t border-slate-800/50">
        <div className="text-center text-slate-400 text-sm space-y-2">
          <p>&copy; {new Date().getFullYear()} Cuer Live. All rights reserved.</p>
          <p>
            By using this site, you agree to our{' '}
            <a href="/terms" className="text-blue-400 hover:text-blue-300 underline">
              Terms
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-blue-400 hover:text-blue-300 underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </footer>
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl floating-element"></div>
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-slate-500/10 rounded-full blur-3xl floating-element" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl floating-element" style={{ animationDelay: '4s' }}></div>
        <div className="absolute top-1/4 left-1/3 w-60 h-60 bg-purple-500/5 rounded-full blur-2xl pulse-glow"></div>
      </div>
    </>
  );
};

export default LandingPage;