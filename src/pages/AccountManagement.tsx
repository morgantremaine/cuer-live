
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, User, Lock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import DashboardHeader from '@/components/DashboardHeader'
import Footer from '@/components/Footer'

const AccountManagement = () => {
  const navigate = useNavigate()
  const { user, signOut, updatePassword, updateProfile } = useAuth()
  const { toast } = useToast()
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [profileForm, setProfileForm] = useState({
    fullName: user?.user_metadata?.full_name || ''
  })
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Password Error",
        description: "New passwords don't match",
        variant: "destructive"
      })
      return
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Password Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      })
      return
    }

    setIsUpdatingPassword(true)
    
    try {
      const { error } = await updatePassword(passwordForm.newPassword)
      
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        })
      } else {
        toast({
          title: "Success",
          description: "Password updated successfully"
        })
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update password",
        variant: "destructive"
      })
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setIsUpdatingProfile(true)
    
    try {
      const { error } = await updateProfile(profileForm.fullName)
      
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        })
      } else {
        toast({
          title: "Success",
          description: "Profile updated successfully"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      })
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Account page: Sign out error, but still navigating to login:', error)
      navigate('/login')
    }
  }

  return (
    <div className="dark min-h-screen bg-gray-900 flex flex-col">
      <DashboardHeader userEmail={user?.email} onSignOut={handleSignOut} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="text-gray-300 hover:bg-gray-700 hover:text-white mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-white">Account Settings</h1>
          <p className="text-gray-400 mt-2">Manage your account preferences and security settings</p>
        </div>

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {/* Profile Information */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <User className="h-5 w-5 mr-2" />
                Profile Information
              </CardTitle>
              <CardDescription className="text-gray-400">
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-gray-300">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-gray-700 border-gray-600 text-gray-300"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <Label htmlFor="fullName" className="text-gray-300">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Enter your full name"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="w-full"
                >
                  {isUpdatingProfile ? 'Updating...' : 'Update Profile'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <Lock className="h-5 w-5 mr-2" />
                Change Password
              </CardTitle>
              <CardDescription className="text-gray-400">
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div>
                  <Label htmlFor="newPassword" className="text-gray-300">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Enter new password"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword" className="text-gray-300">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Confirm new password"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="w-full"
                >
                  {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Account Information */}
        <Card className="bg-gray-800 border-gray-700 mt-6">
          <CardHeader>
            <CardTitle className="text-white">Account Information</CardTitle>
            <CardDescription className="text-gray-400">
              Your account details and status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-gray-300">User ID</Label>
                <p className="text-gray-400 text-sm font-mono">{user?.id}</p>
              </div>
              <div>
                <Label className="text-gray-300">Account Created</Label>
                <p className="text-gray-400 text-sm">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  )
}

export default AccountManagement
