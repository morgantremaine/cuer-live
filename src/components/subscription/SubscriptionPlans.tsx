import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Users } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

const PLANS = [
  {
    name: 'Producer',
    description: 'Perfect for small productions',
    maxMembers: 2,
    monthlyPrice: 25,
    yearlyPrice: 240,
    features: [
      'Up to 2 team members',
      'Unlimited rundowns',
      'Real-time collaboration',
      'Basic support'
    ]
  },
  {
    name: 'Show',
    description: 'Ideal for growing teams',
    maxMembers: 4,
    monthlyPrice: 35,
    yearlyPrice: 315,
    features: [
      'Up to 4 team members',
      'Unlimited rundowns',
      'Real-time collaboration',
      'Priority support',
      'Advanced features'
    ]
  },
  {
    name: 'Studio',
    description: 'For professional studios',
    maxMembers: 7,
    monthlyPrice: 55,
    yearlyPrice: 594,
    popular: true,
    features: [
      'Up to 7 team members',
      'Unlimited rundowns',
      'Real-time collaboration',
      'Priority support',
      'Advanced features',
      'Custom integrations'
    ]
  },
  {
    name: 'Studio Plus',
    description: 'Enhanced studio capabilities',
    maxMembers: 10,
    monthlyPrice: 75,
    yearlyPrice: 810,
    features: [
      'Up to 10 team members',
      'Unlimited rundowns',
      'Real-time collaboration',
      'Priority support',
      'Advanced features',
      'Custom integrations',
      'Premium templates'
    ]
  },
  {
    name: 'Network',
    description: 'For large organizations',
    maxMembers: 25,
    monthlyPrice: 125,
    yearlyPrice: 1350,
    features: [
      'Up to 25 team members',
      'Unlimited rundowns',
      'Real-time collaboration',
      'Priority support',
      'Advanced features',
      'Custom integrations',
      'Premium templates',
      'Dedicated account manager'
    ]
  }
];

interface SubscriptionPlansProps {
  interval: 'monthly' | 'yearly';
  onIntervalChange: (interval: 'monthly' | 'yearly') => void;
}

export const SubscriptionPlans = ({ interval, onIntervalChange }: SubscriptionPlansProps) => {
  const { subscription_tier, createCheckout, loading } = useSubscription();

  const isCurrentPlan = (planName: string) => {
    return subscription_tier === planName;
  };

  return (
    <div className="space-y-6">
      {/* Interval Toggle */}
      <div className="flex justify-center">
        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => onIntervalChange('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              interval === 'monthly'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => onIntervalChange('yearly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              interval === 'yearly'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Yearly
            <Badge variant="secondary" className="ml-2 text-xs">
              Save 10%
            </Badge>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {PLANS.map((plan) => (
          <Card
            key={plan.name}
            className={`relative ${
              plan.popular
                ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20'
                : 'border-gray-200 dark:border-gray-700'
            } ${
              isCurrentPlan(plan.name)
                ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-500'
                : 'bg-white dark:bg-gray-800'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-500 text-white">
                  <Crown className="w-3 h-3 mr-1" />
                  Most Popular
                </Badge>
              </div>
            )}
            
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">{plan.name}</CardTitle>
              <CardDescription className="text-sm">{plan.description}</CardDescription>
              
              <div className="flex items-center justify-center gap-1 text-gray-600 dark:text-gray-400">
                <Users className="w-4 h-4" />
                <span className="text-sm">{plan.maxMembers} team members</span>
              </div>
              
              <div className="py-4">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  ${interval === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {interval === 'monthly' ? 'per month' : 'per year'}
                </div>
                {interval === 'yearly' && (
                  <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                    Save ${(plan.monthlyPrice * 12) - plan.yearlyPrice} yearly
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <Button
                onClick={() => createCheckout(plan.name, interval)}
                disabled={loading || isCurrentPlan(plan.name)}
                className={`w-full mb-4 ${
                  isCurrentPlan(plan.name)
                    ? 'bg-green-500 hover:bg-green-600'
                    : plan.popular
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : ''
                }`}
                variant={isCurrentPlan(plan.name) ? 'default' : plan.popular ? 'default' : 'outline'}
              >
                {isCurrentPlan(plan.name) ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Current Plan
                  </>
                ) : (
                  'Get Started'
                )}
              </Button>
              
              <ul className="space-y-2 text-sm">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};