import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SubscriptionStatus } from '@/components/subscription/SubscriptionStatus'
import { SubscriptionPlans } from '@/components/subscription/SubscriptionPlans'
import { useSubscription } from '@/hooks/useSubscription'
import { useAuth } from '@/hooks/useAuth'
import DashboardHeader from '@/components/DashboardHeader'

const Subscription = () => {
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly')
  const { access_type } = useSubscription()
  const { signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-900">
      <DashboardHeader onSignOut={signOut} />
      
      <div className="space-y-8">
        {/* Page Header */}
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-white">Choose Your Plan</h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Select the perfect plan for your production needs. Upgrade or downgrade at any time.
            </p>
          </div>

          {/* Current Subscription Status */}
          <div className="max-w-2xl mx-auto">
            <SubscriptionStatus />
          </div>
        </div>

        {/* Subscription Plans - Full width carousel */}
        {access_type !== 'team_member' && (
          <div className="w-full">
            <SubscriptionPlans 
              interval={interval}
              onIntervalChange={setInterval}
            />
          </div>
        )}

        {/* Team Member Message */}
        {access_type === 'team_member' && (
          <div className="container mx-auto px-4 max-w-6xl">
            <Card className="max-w-2xl mx-auto bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-center">Team Member Access</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-300">
                  You have access through your team membership. Contact your team admin to manage subscription settings.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default Subscription