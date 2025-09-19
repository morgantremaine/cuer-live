import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, Users, Bot, Share2, Monitor, Upload, Eye, Radio, FileText, Zap, Star, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CuerLogo from '@/components/common/CuerLogo';
import { useAuth } from '@/hooks/useAuth';
import { LandingPagePricing } from '@/components/LandingPagePricing';
import { FeatureExplorer } from '@/components/FeatureExplorer';
import rundownScreenshot from '@/assets/cuer-on-laptop-mockup.png';

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
      description: "Never miss a cue. Smart timing keeps your show on track automatically.",
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
      <link rel="preload" as="image" href="/uploads/cuer-landing-bg.png" />
      
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
              onClick={() => document.getElementById('feature-explorer-section')?.scrollIntoView({ behavior: 'smooth' })}
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
              src="/uploads/cuer-landing-bg.png" 
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
            
            <p className="text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto drop-shadow-xl fade-up">
              Cuer is the fast, intuitive rundown app that gives you the advanced features of pro broadcast software without the learning curve.
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
          <div className="max-w-6xl mx-auto px-6 pt-0 pb-12 fade-up">
            <div className="relative group">
              <img 
                src={rundownScreenshot} 
                alt="Cuer Live Professional Rundown Interface with Advanced Features"
                className="w-full h-auto rounded-2xl shadow-2xl group-hover:scale-[1.02] transition-all duration-500"
              />
            </div>
          </div>
        </div>

      </div>

      {/* How It Works - Process Flow */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-white">
            From planning to air in{' '}
            <span className="bg-gradient-to-r from-blue-400 to-slate-400 bg-clip-text text-transparent">three simple steps</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Streamline your workflow with Cuer's suite of broadcast tools.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-500/20 border-2 border-blue-500 rounded-full flex items-center justify-center mx-auto text-2xl font-bold text-blue-400">1</div>
            <h3 className="text-2xl font-bold text-white">Plan & Build</h3>
            <p className="text-slate-400">Build rundowns fast with intuitive design and auto asset lists using Cuer Blueprints. Get intelligent suggestions and optimization with Cuer AI.</p>
          </div>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-500/20 border-2 border-green-500 rounded-full flex items-center justify-center mx-auto text-2xl font-bold text-green-400">2</div>
            <h3 className="text-2xl font-bold text-white">Collaborate</h3>
            <p className="text-slate-400">Edit together in real time with instant sync for your whole team. Share with stakeholders using Read-Only Share Links - no login required.</p>
          </div>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-purple-500/20 border-2 border-purple-500 rounded-full flex items-center justify-center mx-auto text-2xl font-bold text-purple-400">3</div>
            <h3 className="text-2xl font-bold text-white">Execute Live</h3>
            <p className="text-slate-400">Live showcaller controls keep your crew in sync and on time, while floating segments and rundown-to-prompter updates flow instantly to air.</p>
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

      {/* Interactive Feature Explorer */}
      <div id="feature-explorer-section" className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-white">
            Complete workflow coverage{' '}
            <span className="bg-gradient-to-r from-blue-400 to-slate-400 bg-clip-text text-transparent">from planning to broadcast</span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Every tool your team needs, organized by how you actually work.
          </p>
        </div>

        <FeatureExplorer />
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
            Create seamless shows, every time.
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Join broadcast professionals who've already eliminated timing disasters and team chaos.
            Create your first rundown in minutes.
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