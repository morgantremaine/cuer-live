import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Users, ChevronLeft, ChevronRight, UserPlus, Infinity, Zap, Bot, Headphones, UserCheck } from 'lucide-react';

const PLANS = [
  {
    name: 'Free',
    description: 'Perfect for getting started',
    maxMembers: 1,
    teamRange: '1 team member',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      '1 team member',
      '3 rundowns',
      'Real-time collaboration',
      'Basic features',
      'Community support'
    ]
  },
  {
    name: 'Pro',
    description: 'Perfect for small productions',
    maxMembers: 3,
    teamRange: 'Up to 3 team members',
    monthlyPrice: 15,
    yearlyPrice: 162, // 10% off: 15 * 12 * 0.9
    features: [
      'Up to 3 team members',
      'Unlimited rundowns',
      'Real-time collaboration',
      'Advanced features',
      'AI helper',
      'Priority support'
    ]
  },
  {
    name: 'Premium',
    description: 'Ideal for growing teams',
    maxMembers: 25,
    teamRange: 'Up to 25 team members',
    monthlyPrice: 45,
    yearlyPrice: 486, // 10% off: 45 * 12 * 0.9
    popular: true,
    features: [
      'Up to 25 team members',
      'Unlimited rundowns',
      'Real-time collaboration',
      'Advanced features',
      'AI helper',
      'Priority support',
      'Team management'
    ]
  },
  {
    name: 'Enterprise',
    description: 'Scales to your company',
    maxMembers: null,
    teamRange: 'Unlimited team members',
    monthlyPrice: null,
    yearlyPrice: null,
    isEnterprise: true,
    features: [
      'Unlimited team members',
      'Unlimited rundowns',
      'Real-time collaboration',
      'Advanced features',
      'AI helper',
      'Priority support',
      'Team management',
      'Dedicated account manager',
      'Custom integrations'
    ]
  }
];

const getFeatureIcon = (feature: string) => {
  if (feature.includes('team members')) {
    return <UserPlus className="w-4 h-4 text-blue-500" />;
  }
  if (feature.includes('Unlimited rundowns')) {
    return <Infinity className="w-4 h-4 text-purple-500" />;
  }
  if (feature.includes('Real-time collaboration')) {
    return <Zap className="w-4 h-4 text-yellow-500" />;
  }
  if (feature.includes('Advanced features')) {
    return <Crown className="w-4 h-4 text-orange-500" />;
  }
  if (feature.includes('AI helper')) {
    return <Bot className="w-4 h-4 text-green-500" />;
  }
  if (feature.includes('Priority support')) {
    return <Headphones className="w-4 h-4 text-red-500" />;
  }
  if (feature.includes('Dedicated account manager')) {
    return <UserCheck className="w-4 h-4 text-indigo-500" />;
  }
  return <UserPlus className="w-4 h-4 text-gray-500" />;
};

interface LandingPagePricingProps {
  interval: 'monthly' | 'yearly';
  onIntervalChange: (interval: 'monthly' | 'yearly') => void;
}

export const LandingPagePricing = ({ interval, onIntervalChange }: LandingPagePricingProps) => {
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showArrows, setShowArrows] = useState(false);

  // Center Premium plan on mount and check if arrows are needed
  useEffect(() => {
    const checkArrowsNeeded = () => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const needsScroll = container.scrollWidth > container.clientWidth;
        setShowArrows(needsScroll);
        
        // Center Premium plan if arrows are needed
        if (needsScroll) {
          const premiumIndex = PLANS.findIndex(plan => plan.name === 'Premium');
          const cardWidth = 320; // Approximate card width + gap
          const scrollPosition = (premiumIndex * cardWidth) - (container.clientWidth / 2) + (cardWidth / 2);
          container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
        }
      }
    };

    // Check initially and on resize
    checkArrowsNeeded();
    window.addEventListener('resize', checkArrowsNeeded);
    
    return () => window.removeEventListener('resize', checkArrowsNeeded);
  }, []);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  const handleGetStarted = (planName: string) => {
    if (planName === 'Free') {
      navigate('/dashboard');
    } else if (planName === 'Enterprise') {
      window.location.href = 'mailto:sales@cuer.live?subject=Enterprise Plan Inquiry';
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="space-y-6">
      {/* Interval Toggle */}
      <div className="flex justify-center">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-600/30 p-1 rounded-lg">
          <button
            onClick={() => onIntervalChange('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              interval === 'monthly'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => onIntervalChange('yearly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              interval === 'yearly'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Yearly
            <Badge variant="secondary" className="ml-2 text-xs bg-green-500/20 text-green-400 border-green-500/30">
              Save 10%
            </Badge>
          </button>
        </div>
      </div>

      {/* Plans Carousel */}
      <div className="relative">
        {/* Navigation Arrows - Only show when scrolling is needed */}
        {showArrows && (
          <>
            <Button
              variant="outline"
              size="icon"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-slate-800/90 hover:bg-slate-700 shadow-lg border-2 border-slate-600/50"
              onClick={scrollLeft}
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-slate-800/90 hover:bg-slate-700 shadow-lg border-2 border-slate-600/50"
              onClick={scrollRight}
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </Button>
          </>
        )}

        {/* Scrollable Plans Container */}
        <div 
          ref={scrollContainerRef}
          className={`flex gap-6 overflow-x-auto scrollbar-hide py-8 ${
            showArrows ? 'px-12' : 'px-6 justify-center'
          }`}
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={`flex-shrink-0 w-80 relative transform transition-all duration-300 hover:scale-105 hover:shadow-xl hover:z-20 ${
                plan.popular
                  ? 'border-2 border-blue-500 ring-4 ring-blue-500/20 shadow-lg bg-gradient-to-br from-blue-950/50 to-indigo-950/50'
                  : 'border border-slate-600/50 hover:border-blue-400'
              } bg-slate-800/50 backdrop-blur-sm`}
              style={{ scrollSnapAlign: 'center' }}
            >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-1 text-sm font-semibold shadow-lg">
                  <Crown className="w-4 h-4 mr-1" />
                  Most Popular
                </Badge>
              </div>
            )}
            
            <CardHeader className="text-center pb-4 pt-6">
              <CardTitle className={`text-xl font-bold ${plan.popular ? 'text-white' : 'text-white'}`}>
                {plan.name}
              </CardTitle>
              <CardDescription className="text-sm text-slate-400 mb-2">
                {plan.description}
              </CardDescription>
              
              <div className={`inline-flex items-center justify-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                plan.popular 
                  ? 'bg-white/20 text-white border border-white/30' 
                  : 'bg-slate-700/50 text-slate-300 border border-slate-600/50'
              }`}>
                <Users className="w-4 h-4" />
                <span>{plan.teamRange}</span>
              </div>
              
               <div className="py-6">
                <div className={`text-5xl font-bold ${plan.popular ? 'text-white' : 'text-white'}`}>
                  {plan.isEnterprise ? 'Contact us' : `$${interval === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}`}
                </div>
                <div className="text-sm text-slate-400 mt-1">
                  {plan.isEnterprise ? 'Custom pricing' : (interval === 'monthly' ? 'per month' : 'per year')}
                </div>
                {interval === 'yearly' && !plan.isEnterprise && (
                  <div className="text-sm text-green-400 font-semibold mt-2 bg-green-500/20 border border-green-500/30 px-3 py-1 rounded-full inline-block">
                    Save ${(plan.monthlyPrice * 12) - plan.yearlyPrice} yearly
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="pt-0 pb-6">
              <Button
                onClick={() => handleGetStarted(plan.name)}
                className={`w-full mb-6 py-3 text-base font-semibold transition-all duration-300 ${
                  plan.name === 'Free'
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl'
                    : plan.isEnterprise
                    ? 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg hover:shadow-xl'
                    : plan.popular
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl'
                    : 'border-2 border-slate-600 hover:border-blue-500 hover:bg-blue-950/20 text-white bg-slate-700/50'
                }`}
                variant={plan.name === 'Free' || plan.popular || plan.isEnterprise ? 'default' : 'outline'}
              >
                {plan.name === 'Free' ? 'Get Started Free' : plan.isEnterprise ? 'Contact Sales' : 'Get Started'}
                {plan.popular && <Crown className="w-4 h-4 ml-2" />}
              </Button>
              
              <ul className="space-y-3 text-sm">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      {getFeatureIcon(feature)}
                    </div>
                    <span className="text-slate-300 leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
        </div>
      </div>
    </div>
  );
};