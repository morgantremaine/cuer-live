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

  // Core benefits focused on outcomes, not features
  const coreBenefits = [
    {
      icon: Clock,
      title: "Stop Timing Disasters",
      description: "Never miss a cue or run long again. Smart timing keeps your show on track automatically.",
      color: "text-blue-500"
    },
    {
      icon: Users,
      title: "End Team Chaos",
      description: "Everyone sees the same rundown instantly. No more outdated scripts or missed changes.",
      color: "text-green-500"
    },
    {
      icon: Bot,
      title: "Catch Problems Early",
      description: "AI spots issues before they derail your show. Get warnings for timing conflicts and missing elements.",
      color: "text-purple-500"
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
              Turn broadcast chaos into seamless execution. The professional rundown tool that actually works the way your team thinks.
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

      {/* Core Benefits - Problem/Solution Focus */}
      <div id="features-section" className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            The broadcast problems 
            <span className="bg-gradient-to-r from-blue-400 to-slate-400 bg-clip-text text-transparent">you'll never face again</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Stop fighting your tools. Start delivering flawless shows every time.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {coreBenefits.map((benefit, index) => (
            <Card key={index} className="bg-slate-800/30 backdrop-blur-sm border-slate-700/30 hover:bg-slate-800/50 transition-all duration-300 group glow-box fade-up">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-6">
                  <div className={`p-4 rounded-full bg-slate-700/50 group-hover:scale-110 transition-all duration-300`}>
                    <benefit.icon className={`h-8 w-8 ${benefit.color}`} />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-blue-300 transition-colors">{benefit.title}</h3>
                <p className="text-slate-300 leading-relaxed text-lg">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* How It Works - Process Flow */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-white">
            From planning to air 
            <span className="bg-gradient-to-r from-blue-400 to-slate-400 bg-clip-text text-transparent">in three simple steps</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            The streamlined workflow that gets your team from rundown creation to flawless execution.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-500/20 border-2 border-blue-500 rounded-full flex items-center justify-center mx-auto text-2xl font-bold text-blue-400">1</div>
            <h3 className="text-2xl font-bold text-white">Plan & Build</h3>
            <p className="text-slate-400">Create your rundown with smart templates. Import existing scripts or start fresh with our blueprint tools.</p>
          </div>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-500/20 border-2 border-green-500 rounded-full flex items-center justify-center mx-auto text-2xl font-bold text-green-400">2</div>
            <h3 className="text-2xl font-bold text-white">Execute Live</h3>
            <p className="text-slate-400">Real-time timing, teleprompter mode, and live cues keep everyone perfectly synchronized during broadcast.</p>
          </div>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-purple-500/20 border-2 border-purple-500 rounded-full flex items-center justify-center mx-auto text-2xl font-bold text-purple-400">3</div>
            <h3 className="text-2xl font-bold text-white">Collaborate</h3>
            <p className="text-slate-400">Team sees changes instantly. Share with stakeholders. Access from any device, anywhere.</p>
          </div>
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

      {/* Professional Views Section - Consolidated */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-white">
            Every view your team needs 
            <span className="bg-gradient-to-r from-blue-400 to-slate-400 bg-clip-text text-transparent">for professional production</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            From control room displays to talent teleprompters - the right interface for every role.
          </p>
        </div>

        {/* Live Show Control */}
        <div className="mb-20">
          <div className="text-center space-y-6 mb-12">
            <h3 className="text-3xl font-bold text-white">Live Show Control</h3>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Real-time timing and status tracking keeps your entire production team synchronized.
            </p>
          </div>
          <div className="group fade-up">
            <img 
              src="/uploads/68360f2b-6961-47f6-a334-0ac01a4de303.png" 
              alt="Live Show Controls"
              className="w-full max-w-4xl mx-auto h-auto rounded-lg shadow-lg border border-slate-600/30 glow-box group-hover:scale-[1.02] transition-all duration-500"
            />
          </div>
        </div>

        {/* AI Assistant */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-white">AI Assistant</h3>
            <p className="text-xl text-slate-400">
              Catch problems before they happen. Get intelligent suggestions for timing, content, and show flow optimization.
            </p>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-slate-300">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>Real-time rundown analysis</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>Issue detection and solutions</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>Content and timing suggestions</span>
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

        {/* Shared Views */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <div className="group fade-up">
            <img 
              src="/uploads/f4dc4d90-0508-49ae-8aad-abaaf909a734.png" 
              alt="Shared Rundown View"
              className="w-full h-auto rounded-lg shadow-lg border border-slate-600/30 glow-box group-hover:scale-[1.02] transition-all duration-500"
            />
          </div>
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-white">Stakeholder Views</h3>
            <p className="text-xl text-slate-400">
              Share read-only rundowns with clients, executives, and external viewers. No login required.
            </p>
          </div>
        </div>

        {/* AD View */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-white">Control Room Display</h3>
            <p className="text-xl text-slate-400">
              Dedicated Assistant Director view with live timing and script tracking. Perfect for multiviewer displays.
            </p>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-slate-300">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>Live timing display</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-300">
                <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span>Current script panel</span>
              </div>
            </div>
          </div>
          <div className="group fade-up">
            <img 
              src="/uploads/832f09fb-bddb-4ced-b089-44bc34a1ac96.png" 
              alt="AD View Dashboard"
              className="w-full h-auto rounded-lg shadow-lg border border-slate-600/30 glow-box group-hover:scale-[1.02] transition-all duration-500"
            />
          </div>
        </div>

        {/* Teleprompter */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="group fade-up">
            <img 
              src="/uploads/1461f5d6-383a-421e-ade7-2791f4afce6c.png" 
              alt="Teleprompter Full Screen"
              className="w-full h-auto rounded-lg shadow-lg border border-slate-600/30 glow-box group-hover:scale-[1.02] transition-all duration-500"
            />
          </div>
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-white">Professional Teleprompter</h3>
            <p className="text-xl text-slate-400">
              Full-screen teleprompter with speed controls and real-time script sync for talent and operators.
            </p>
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
            Stop fighting your rundown software
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Join broadcast professionals who've already eliminated timing disasters and team chaos.
            Create your first flawless rundown in minutes.
          </p>
          <Button 
            onClick={handleGetStarted}
            size="lg" 
            className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-12 py-4 h-auto"
          >
            Get Started for Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
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