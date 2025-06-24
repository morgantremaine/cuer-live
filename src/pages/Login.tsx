import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import Footer from '@/components/Footer'
import CuerLogo from '@/components/common/CuerLogo'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [showResetForm, setShowResetForm] = useState(false)
  const [showResendConfirmation, setShowResendConfirmation] = useState(false)
  const { signIn, signUp, resetPassword, resendConfirmation } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await signIn(email, password)
    
    if (error) {
      if (error.message.includes('Email not confirmed')) {
        setShowResendConfirmation(true)
        toast({
          title: 'Email not confirmed',
          description: 'Please check your email and click the confirmation link, or resend the confirmation email.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        })
      }
    } else {
      toast({
        title: 'Success',
        description: 'Signed in successfully!',
      })
      navigate('/dashboard')
    }
    
    setLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate invite code
    if (inviteCode !== 'cuer2025') {
      toast({
        title: 'Invalid Invite Code',
        description: 'Please enter a valid invite code to create an account.',
        variant: 'destructive',
      })
      return
    }
    
    setLoading(true)
    
    const { error } = await signUp(email, password, fullName, inviteCode)
    
    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: 'Account created successfully! Please check your email to verify your account before signing in.',
      })
      // Don't navigate to dashboard, user needs to confirm email first
    }
    
    setLoading(false)
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await resetPassword(resetEmail)
    
    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: 'Password reset email sent! Check your inbox for further instructions.',
      })
      setShowResetForm(false)
      setResetEmail('')
    }
    
    setLoading(false)
  }

  const handleResendConfirmation = async () => {
    setLoading(true)
    
    const { error } = await resendConfirmation(email)
    
    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: 'Confirmation email sent! Please check your inbox.',
      })
      setShowResendConfirmation(false)
    }
    
    setLoading(false)
  }

  if (showResetForm) {
    return (
      <div className="dark min-h-screen flex flex-col bg-gray-900">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-gray-800 border-gray-700">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <CuerLogo className="h-12 w-auto" />
              </div>
              <CardTitle className="text-white">Reset Password</CardTitle>
              <CardDescription className="text-gray-400">
                Enter your email address and we'll send you a link to reset your password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-gray-300">Email</Label>
                  <Input
                    id="reset-email"
                    name="email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:border-gray-500"
                  />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full text-gray-300 hover:bg-gray-700 hover:text-white"
                  onClick={() => setShowResetForm(false)}
                >
                  Back to Sign In
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="dark min-h-screen flex flex-col bg-gray-900">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <CuerLogo className="h-12 w-auto" />
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-700">
                <TabsTrigger value="signin" className="data-[state=active]:bg-gray-600 data-[state=active]:text-white text-gray-300">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-gray-600 data-[state=active]:text-white text-gray-300">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-gray-300">Email</Label>
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                      className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:border-gray-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-gray-300">Password</Label>
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                      className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:border-gray-500"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                    {loading ? 'Signing In...' : 'Sign In'}
                  </Button>
                  <div className="text-center space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowResetForm(true)}
                      className="text-sm text-blue-400 hover:text-blue-300 underline"
                    >
                      Forgot your password?
                    </button>
                    {showResendConfirmation && (
                      <div>
                        <p className="text-sm text-gray-400 mb-2">
                          Haven't received the confirmation email?
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleResendConfirmation}
                          disabled={loading}
                          className="text-gray-300 border-gray-600 hover:bg-gray-700"
                        >
                          {loading ? 'Sending...' : 'Resend Confirmation'}
                        </Button>
                      </div>
                    )}
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-gray-300">Full Name</Label>
                    <Input
                      id="signup-name"
                      name="name"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="name"
                      className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:border-gray-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-gray-300">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                      className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:border-gray-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-gray-300">Password</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                      className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:border-gray-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-invite-code" className="text-gray-300">Invite Code</Label>
                    <Input
                      id="signup-invite-code"
                      name="inviteCode"
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="Enter invite code"
                      required
                      className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:border-gray-500"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                    {loading ? 'Creating Account...' : 'Sign Up'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  )
}

export default Login
