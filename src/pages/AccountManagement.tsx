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
import { useSubscription } from '@/hooks/useSubscription'
import { useTeam } from '@/hooks/useTeam'
import { supabase } from '@/integrations/supabase/client'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { ChevronDown, ChevronRight } from 'lucide-react'

const AccountManagement = () => {
  const [fullName, setFullName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [showPlans, setShowPlans] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteOptions, setShowDeleteOptions] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const { user, signOut, updatePassword, updateProfile } = useAuth()
  const { subscribed, access_type, openCustomerPortal } = useSubscription()
  const { team, allUserTeams, userRole, switchToTeam } = useTeam()
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

  const handleDeleteAccount = async () => {
    if (!user?.email) return
    
    if (!deletePassword.trim()) {
      toast({
        title: 'Password Required',
        description: 'Please enter your password to confirm account deletion.',
        variant: 'destructive',
      })
      return
    }
    
    setIsDeleting(true)
    try {
      // Verify password by attempting to sign in
      const { error: passwordError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword
      })
      
      if (passwordError) {
        toast({
          title: 'Incorrect Password',
          description: 'The password you entered is incorrect.',
          variant: 'destructive',
        })
        setIsDeleting(false)
        return
      }
      
      // If password is correct, proceed with deletion
      const { error } = await supabase.functions.invoke('delete-user-account', {
        body: { email: user.email }
      })
      
      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete account. Please try again or contact support.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Account Deleted',
          description: 'Your account has been permanently deleted.',
        })
        
        // Sign out the user and redirect
        await signOut()
        navigate('/login')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete account. Please contact support.',
        variant: 'destructive',
      })
    }
    setIsDeleting(false)
    setDeletePassword('')
  }

  return (
    <div className="dark min-h-screen bg-gray-900">
      <DashboardHeader 
        userEmail={user?.email} 
        onSignOut={handleSignOut}
        showBackButton={true}
        onBack={handleBackToDashboard}
        team={team}
        allUserTeams={allUserTeams}
        userRole={userRole}
        switchToTeam={switchToTeam}
      />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Account Settings</h1>
          <p className="text-gray-400 mt-2">Manage your account and team settings</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className={`grid w-full ${user?.email === 'morgan@cuer.live' ? 'grid-cols-5' : 'grid-cols-4'} bg-gray-800`}>
            <TabsTrigger value="profile" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">
              Security
            </TabsTrigger>
            <TabsTrigger value="subscription" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">
              Subscription
            </TabsTrigger>
            {user?.email === 'morgan@cuer.live' && (
              <TabsTrigger value="integrations" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-300">
                Integrations (beta)
              </TabsTrigger>
            )}
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
            
            <Separator className="my-6" />
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-red-600">Delete Account</CardTitle>
                  <CardDescription>
                    Permanently delete your account and all associated data
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setShowDeleteOptions(!showDeleteOptions)
                    if (!showDeleteOptions) {
                      setDeletePassword('')
                    }
                  }}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  {showDeleteOptions ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                {showDeleteOptions && (
                  <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border">
                    {subscribed ? (
                      <div className="space-y-4">
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            <strong>Paid Account:</strong> To delete your account, please:
                          </p>
                          <ol className="mt-2 text-sm text-yellow-800 dark:text-yellow-200 list-decimal list-inside space-y-1">
                            <li>Cancel your subscription first</li>
                            <li>Contact help@cuer.live for manual account deletion</li>
                          </ol>
                        </div>
                        <Button 
                          onClick={openCustomerPortal}
                          variant="outline"
                        >
                          Manage Subscription
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                          <p className="text-sm text-red-800 dark:text-red-200">
                            <strong>Warning:</strong> This action cannot be undone. This will permanently delete your account and remove all data including rundowns, blueprints, and team memberships.
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="deletePassword">Enter your password to confirm:</Label>
                          <Input
                            id="deletePassword"
                            type="password"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            placeholder="Enter your password"
                            className="max-w-sm"
                          />
                        </div>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="destructive" 
                              disabled={isDeleting || !deletePassword.trim()}
                            >
                              {isDeleting ? 'Deleting Account...' : 'Delete Account Permanently'}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-white dark:bg-gray-800 z-50">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete your account
                                and remove all your data from our servers including:
                                <br /><br />
                                • All rundowns and blueprints
                                <br />
                                • Team memberships
                                <br />
                                • User preferences and settings
                                <br />
                                • Account profile and history
                                <br /><br />
                                <strong>Account:</strong> {user?.email}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700">
                                Delete Account Permanently
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                )}
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

          {user?.email === 'morgan@cuer.live' && (
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
          )}

          <TabsContent value="team">
            <TeamManagement key={team?.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default AccountManagement
