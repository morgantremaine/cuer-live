import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import Footer from '@/components/Footer'
import CuerLogo from '@/components/common/CuerLogo'

const Login = () => {
  const [searchParams] = useSearchParams()
  const defaultTab = searchParams.get('tab') === 'signup' ? 'signup' : 'signin'
  // Separate form states for clarity
  const [signInData, setSignInData] = useState({ email: '', password: '' })
  const [signUpData, setSignUpData] = useState({ email: '', password: '', confirmPassword: '', fullName: '', agreeToTerms: false })
  const [resetEmail, setResetEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [showResetForm, setShowResetForm] = useState(false)
  const [showResendConfirmation, setShowResendConfirmation] = useState(false)
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false)
  const { signIn, signUp, resetPassword, resendConfirmation } = useAuth()
  const { toast } = useToast()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const { error } = await signIn(signInData.email, signInData.password)
      
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
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (signUpData.password !== signUpData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      })
      return
    }
    
    if (!signUpData.agreeToTerms) {
      toast({
        title: 'Error',
        description: 'You must agree to the Terms of Service and Privacy Policy to create an account.',
        variant: 'destructive',
      })
      return
    }
    
    setLoading(true)
    
    try {
      const { error } = await signUp(signUpData.email, signUpData.password, signUpData.fullName)
      
      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        })
      } else {
        setShowEmailConfirmation(true)
        // Clear form on success
        setSignUpData({ email: '', password: '', confirmPassword: '', fullName: '', agreeToTerms: false })
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
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
    
    try {
      const { error } = await resendConfirmation(signInData.email)
      
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
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (showResetForm) {
    return (
      <div className="dark min-h-screen flex flex-col bg-gray-900">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-gray-800 border-gray-700">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <CuerLogo className="h-12 w-auto" isDark={true} />
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
              <CuerLogo className="h-12 w-auto" isDark={true} />
            </div>
          </CardHeader>
          <CardContent>
            {showEmailConfirmation ? (
              <div className="text-center space-y-4">
                <div className="text-white text-lg font-semibold">Check Your Email</div>
                <p className="text-gray-400">
                  We've sent a verification link to your email address. Please check your inbox and click the link to verify your account before signing in.
                </p>
                <Button 
                  onClick={() => setShowEmailConfirmation(false)}
                  variant="outline"
                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                >
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <Tabs defaultValue={defaultTab} className="w-full">
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
                        value={signInData.email}
                        onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
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
                        value={signInData.password}
                        onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
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
                        value={signUpData.fullName}
                        onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
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
                        value={signUpData.email}
                        onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
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
                        value={signUpData.password}
                        onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                        autoComplete="new-password"
                        required
                        className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:border-gray-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm-password" className="text-gray-300">Confirm Password</Label>
                      <Input
                        id="signup-confirm-password"
                        name="confirmPassword"
                        type="password"
                        value={signUpData.confirmPassword}
                        onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                        autoComplete="new-password"
                        required
                        className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:border-gray-500"
                      />
                    </div>
                    <div className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        id="agree-terms"
                        checked={signUpData.agreeToTerms}
                        onChange={(e) => setSignUpData({ ...signUpData, agreeToTerms: e.target.checked })}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                        required
                      />
                      <label htmlFor="agree-terms" className="text-sm text-gray-300">
                        By creating an account, you agree to the{' '}
                        <a 
                          href="/terms" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          Terms of Service
                        </a>
                        {' '}and{' '}
                        <a 
                          href="/privacy" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          Privacy Policy
                        </a>
                        .
                      </label>
                    </div>
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                      {loading ? 'Creating Account...' : 'Sign Up'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  )
}

export default Login
