import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import DashboardHeader from '@/components/DashboardHeader'
import TeamManagement from '@/components/TeamManagement'
import { SubscriptionStatus } from '@/components/subscription/SubscriptionStatus'
import { SubscriptionPlans } from '@/components/subscription/SubscriptionPlans'
import { IntegrationsSettings } from '@/components/integrations/IntegrationsSettings'
import TeamLocalSessionManager from '@/components/TeamLocalSessionManager'
import { useSubscription } from '@/hooks/useSubscription'
import { useTeam } from '@/hooks/useTeam'

const AccountManagement = () => {
  const [fullName, setFullName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [showPlans, setShowPlans] = useState(false)
  const { user, signOut, updatePassword, updateProfile } = useAuth()
  const { access_type } = useSubscription()
  const { team } = useTeam()
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleBackToDashboard = () => {
    navigate('/dashboard')
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) {
      toast({
        title: 'Error',
        description: 'Full name is required',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    const { error } = await updateProfile(fullName.trim())
    
    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: 'Profile updated successfully!',
      })
      setFullName('')
    }
    setLoading(false)
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: "New passwords don't match",
        variant: 'destructive',
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters long',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    const { error } = await updatePassword(currentPassword, newPassword)
    
    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: 'Password updated successfully!',
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
    setLoading(false)
  }

  return (
    <div className="dark min-h-screen bg-gray-900">
      <DashboardHeader 
        userEmail={user?.email} 
        onSignOut={handleSignOut}
        showBackButton={true}
        onBack={handleBackToDashboard}
      />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Account Settings</h1>
          <p className="text-gray-400 mt-2">Manage your account and team settings</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-gray-800">
            <TabsTrigger value="profile" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">
              Security
            </TabsTrigger>
            <TabsTrigger value="subscription" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">
              Subscription
            </TabsTrigger>
            <TabsTrigger value="integrations" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">
              Integrations (beta)
            </TabsTrigger>
            <TabsTrigger value="collaboration" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">
              Collaboration
            </TabsTrigger>
            <TabsTrigger value="team" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">
              Team
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your profile information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="opacity-60"
                    />
                    <p className="text-sm text-muted-foreground">Email cannot be changed</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={user?.user_metadata?.full_name || 'Enter your full name'}
                    />
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Updating...' : 'Update Profile'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Updating...' : 'Update Password'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscription" className="space-y-6">
            <SubscriptionStatus />
            {/* Only show subscription plans for users without team access */}
            {access_type !== 'team_member' && (
              <div className="space-y-4">
                <Button
                  onClick={() => setShowPlans(!showPlans)}
                  variant="outline"
                  className="w-full bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                >
                  {showPlans ? 'Hide Plans' : 'View All Plans'}
                </Button>
                
                {showPlans && (
                  <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-gray-900 py-8">
                    <SubscriptionPlans 
                      interval={interval}
                      onIntervalChange={setInterval}
                    />
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="integrations">
            {team ? (
              <IntegrationsSettings teamId={team.id} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Team Integrations</CardTitle>
                  <CardDescription>
                    You need to be part of a team to manage integrations
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="collaboration">
            {team ? (
              <TeamLocalSessionManager />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Team Collaboration</CardTitle>
                  <CardDescription>
                    You need to be part of a team to manage local collaboration sessions
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="team">
            <TeamManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default AccountManagement
