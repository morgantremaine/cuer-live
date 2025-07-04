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
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Animated Matrix-style background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i}
              className="absolute w-px bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent"
              style={{
                left: `${i * 5}%`,
                height: '100%',
                animation: `slide-down ${2 + i * 0.1}s linear infinite`,
                animationDelay: `${i * 0.2}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 2}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between p-6 backdrop-blur-sm bg-black/20 border-b border-cyan-500/20">
        <div className="flex items-center">
          <CuerLogo className="h-8 w-auto filter drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
        </div>
        <div className="flex items-center space-x-4">
          <Link to="/help" className="text-cyan-400 hover:text-cyan-300 transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
            Help
          </Link>
          {user ? (
            <Button onClick={() => navigate('/dashboard')} variant="outline" className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400 transition-all duration-300">
              Dashboard
            </Button>
          ) : (
            <Button onClick={() => navigate('/login')} variant="outline" className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400 transition-all duration-300">
              Sign In
            </Button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 w-full pb-12">
        {/* Main Hero */}
        <div className="relative mb-16 w-full min-h-screen flex items-center justify-center">
          {/* Holographic backdrop */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-purple-500/5 to-pink-500/5"></div>
          
          {/* Hero Content */}
          <div className="relative z-10 text-center space-y-12 px-8 max-w-6xl mx-auto">
            {/* Glitch badge */}
            <div className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 backdrop-blur-sm">
              <Zap className="w-5 h-5 mr-3 text-cyan-400 animate-pulse" />
              <span className="text-cyan-300 font-mono tracking-wider">NEXT-GEN BROADCAST TECH</span>
            </div>
            
            {/* Main title with electric effect */}
            <div className="space-y-6">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-tight tracking-tight">
                <span className="block bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]">
                  THE FUTURE OF
                </span>
                <span className="block text-6xl md:text-8xl lg:text-9xl bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse drop-shadow-[0_0_30px_rgba(34,211,238,0.8)]">
                  RUNDOWNS
                </span>
              </h1>
              
              <div className="relative">
                <p className="text-xl md:text-2xl text-cyan-100 leading-relaxed max-w-4xl mx-auto font-light tracking-wide">
                  Enter the new era of show production. Cuer Live transforms your broadcast workflow with 
                  <span className="text-cyan-400 font-semibold glow-text"> AI-powered precision</span>, 
                  <span className="text-purple-400 font-semibold glow-text"> real-time collaboration</span>, and 
                  <span className="text-pink-400 font-semibold glow-text"> unmatched control</span>.
                </p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Button 
                onClick={handleGetStarted}
                size="lg" 
                className="relative group bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white text-xl px-12 py-6 h-auto font-bold tracking-wide transition-all duration-300 hover:scale-105 hover:drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]"
              >
                <span className="relative z-10">INITIALIZE SYSTEM</span>
                <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md blur-xl"></div>
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate('/help')}
                className="border-2 border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-400 text-xl px-12 py-6 h-auto font-bold tracking-wide transition-all duration-300 hover:scale-105 backdrop-blur-sm"
              >
                SCAN FEATURES
              </Button>
            </div>
          </div>
        </div>

        {/* Hero Interface Preview */}
        <div className="relative max-w-7xl mx-auto mb-20">
          <div className="relative group">
            {/* Glowing border effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative">
              <img 
                src="/lovable-uploads/6ab67d89-df00-4400-85fc-59eb71afc52a.png" 
                alt="Cuer Live Professional Rundown Interface"
                className="w-full h-auto rounded-2xl border border-cyan-500/30 shadow-2xl"
              />
              {/* Holographic overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent rounded-2xl pointer-events-none"></div>
            </div>
          </div>
        </div>

        {/* System Status Indicators */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-24">
          {testimonialFeatures.slice(0, 4).map((feature, index) => (
            <div key={index} className="relative group">
              <div className="flex items-center space-x-3 text-cyan-100 bg-black/40 backdrop-blur-sm p-6 rounded-xl border border-cyan-500/20 hover:border-cyan-400/40 transition-all duration-300">
                <div className="relative">
                  <CheckCircle className="h-6 w-6 text-cyan-400 animate-pulse" />
                  <div className="absolute inset-0 h-6 w-6 text-cyan-400 animate-ping opacity-20">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                </div>
                <span className="text-sm font-mono tracking-wide uppercase">{feature}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Core Systems Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="text-center mb-20">
          <div className="inline-block mb-6">
            <span className="text-cyan-400 font-mono text-sm tracking-[0.2em] uppercase">System Modules</span>
          </div>
          <h2 className="text-5xl md:text-6xl font-black mb-6">
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              CORE SYSTEMS
            </span>
          </h2>
          <p className="text-xl text-cyan-100/80 max-w-4xl mx-auto leading-relaxed">
            Advanced modules engineered for mission-critical broadcast operations. Each system optimized for peak performance.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="relative group">
              {/* Animated border */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl opacity-20 group-hover:opacity-40 transition duration-300 blur"></div>
              
              <div className="relative bg-black/60 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-8 hover:border-cyan-400/40 transition-all duration-300 group">
                <div className="flex items-start space-x-6 mb-6">
                  <div className="relative">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 group-hover:scale-110 transition-transform duration-300">
                      <feature.icon className={`h-8 w-8 ${feature.color} drop-shadow-[0_0_8px_currentColor]`} />
                    </div>
                    {/* Pulse ring */}
                    <div className="absolute inset-0 rounded-xl border border-cyan-400/30 animate-ping opacity-20 group-hover:opacity-40"></div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">{feature.title}</h3>
                    <div className="w-12 h-0.5 bg-gradient-to-r from-cyan-400 to-transparent mb-4"></div>
                  </div>
                </div>
                <p className="text-cyan-100/70 leading-relaxed font-light">{feature.description}</p>
                
                {/* Status indicator */}
                <div className="flex items-center mt-6 text-xs font-mono text-cyan-400">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full mr-2 animate-pulse"></div>
                  SYSTEM ONLINE
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Mission Control */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-32">
        <div className="text-center mb-20">
          <div className="inline-block mb-6">
            <span className="text-purple-400 font-mono text-sm tracking-[0.2em] uppercase">Mission Control</span>
          </div>
          <h3 className="text-4xl md:text-5xl font-black text-white mb-6">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              LIVE COMMAND CENTER
            </span>
          </h3>
          <p className="text-xl text-cyan-100/80 max-w-3xl mx-auto leading-relaxed">
            Advanced mission control interface with precision timing and real-time status monitoring for critical broadcast operations.
          </p>
        </div>
        
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative">
            <img 
              src="/lovable-uploads/68360f2b-6961-47f6-a334-0ac01a4de303.png" 
              alt="Live Show Controls"
              className="w-full max-w-5xl mx-auto h-auto rounded-2xl border border-purple-500/30 shadow-2xl"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent rounded-2xl pointer-events-none"></div>
          </div>
        </div>
      </div>

      {/* AI Neural Network */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-32">
        <div className="text-center mb-20">
          <div className="inline-block mb-6">
            <span className="text-pink-400 font-mono text-sm tracking-[0.2em] uppercase">Neural Network</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              AI COMMAND INTERFACE
            </span>
          </h2>
          <p className="text-xl text-cyan-100/80 max-w-4xl mx-auto leading-relaxed">
            Next-generation artificial intelligence continuously monitors, analyzes, and optimizes your broadcast workflow in real-time.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="space-y-6">
              <h3 className="text-3xl font-bold text-white tracking-tight">CUER AI NEURAL CORE</h3>
              <p className="text-xl text-cyan-100/70 leading-relaxed">
                Advanced machine learning algorithms provide real-time analysis, predictive insights, and automated optimization for mission-critical broadcast operations.
              </p>
            </div>
            
            <div className="space-y-4">
              {[
                "Real-time neural analysis & optimization",
                "Predictive issue detection algorithms",
                "Intelligent timing recommendation engine"
              ].map((feature, index) => (
                <div key={index} className="flex items-center space-x-4 text-cyan-100">
                  <div className="relative">
                    <div className="w-3 h-3 bg-pink-400 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 w-3 h-3 bg-pink-400 rounded-full animate-ping opacity-40"></div>
                  </div>
                  <span className="text-lg font-mono tracking-wide">{feature}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative">
              <img 
                src="/lovable-uploads/d4e97f8e-fc43-4829-9671-f784ebd3ce47.png" 
                alt="Cuer AI Assistant Interface"
                className="w-full h-auto rounded-2xl border border-pink-500/30 shadow-2xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-pink-500/10 to-transparent rounded-2xl pointer-events-none"></div>
            </div>
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
          <img 
            src="/lovable-uploads/a8f26352-6c2f-4e9f-91b5-6db3581e2d48.png" 
            alt="Shared Rundown View"
            className="w-full h-auto rounded-lg shadow-lg border border-slate-600/30"
          />
        </div>
        
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <img 
            src="/lovable-uploads/832f09fb-bddb-4ced-b089-44bc34a1ac96.png" 
            alt="AD View Dashboard"
            className="w-full h-auto rounded-lg shadow-lg border border-slate-600/30"
          />
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

      {/* Teleprompter Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-white">Full-Screen Teleprompter</h3>
            <p className="text-xl text-slate-400">
              Professional teleprompter mode with speed controls, formatting options, and realtime sync for back-and-forth editing and script writing.
            </p>
          </div>
          <img 
            src="/lovable-uploads/9f875f50-34f7-4b20-b8b3-b56ba3bccbe8.png" 
            alt="Teleprompter Full Screen"
            className="w-full h-auto rounded-lg shadow-lg border border-slate-600/30"
          />
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
          <img 
            src="/lovable-uploads/0dd96b7d-2278-4e88-abd7-ebff65c98dd7.png" 
            alt="Blueprint Planning Interface"
            className="w-full h-auto rounded-lg shadow-lg border border-slate-600/30"
          />
        </div>

        {/* Camera Plot Editor */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <img 
            src="/lovable-uploads/4ec27fa0-44b5-4515-bb67-9e999dca2f59.png" 
            alt="Camera Plot Editor"
            className="w-full h-auto rounded-lg shadow-lg border border-slate-600/30"
          />
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
        
        {/* Rich Notes & Documentation */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
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
          <img 
            src="/lovable-uploads/d8bd00f7-e579-4df8-8fcf-4d4c1466eae9.png" 
            alt="Notes and Documentation"
            className="w-full h-auto rounded-lg shadow-lg border border-slate-600/30"
          />
        </div>

        {/* Team Management */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <img 
            src="/lovable-uploads/c1aca8d4-0287-46a0-ab8d-f31ce3d5cbbd.png" 
            alt="Team Management Interface"
            className="w-full h-auto rounded-lg shadow-lg border border-slate-600/30"
          />
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
        <p className="text-slate-400 text-sm">
          © {new Date().getFullYear()} Cuer Live. All rights reserved.
        </p>
      </footer>
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