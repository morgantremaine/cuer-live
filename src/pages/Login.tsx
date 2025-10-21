import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import Footer from '@/components/Footer'
import CuerLogo from '@/components/common/CuerLogo'

// Feature flag - set to true once Google OAuth is verified
const GOOGLE_AUTH_ENABLED = false

const Login = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const defaultTab = searchParams.get('tab') === 'signup' ? 'signup' : 'signin'
  const isStreamDeck = searchParams.get('streamdeck') === 'true'
  
  // Separate form states for clarity
  const [signInData, setSignInData] = useState({ email: '', password: '' })
  const [signUpData, setSignUpData] = useState({ email: '', password: '', confirmPassword: '', fullName: '', agreeToTerms: false })
  const [resetEmail, setResetEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [showResetForm, setShowResetForm] = useState(false)
  const [showResendConfirmation, setShowResendConfirmation] = useState(false)
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false)
  const { signIn, signUp, resetPassword, resendConfirmation, signInWithGoogle, session, user } = useAuth()
  const { toast } = useToast()

  // Handle navigation for authenticated users (both Stream Deck and normal)
  useEffect(() => {
    if (user && session) {
      if (isStreamDeck) {
        console.log('🎛️ Stream Deck: Sending auth success message');
        // Send auth success message to parent window (Stream Deck popup)
        window.opener?.postMessage({
          type: 'CUER_AUTH_SUCCESS',
          token: session.access_token,
          user: { 
            email: session.user?.email,
            id: session.user?.id 
          }
        }, '*'); // Allow any origin for Stream Deck communication
        
        // Close the popup after a short delay
        setTimeout(() => {
          window.close();
        }, 100);
      } else {
        // For normal users, redirect to dashboard
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, session, isStreamDeck, navigate]);

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
          
          // Send error to Stream Deck if needed
          if (isStreamDeck) {
            console.log('🎛️ Stream Deck: Sending auth error message');
            window.opener?.postMessage({
              type: 'CUER_AUTH_ERROR',
              error: error.message
            }, '*'); // Allow any origin for Stream Deck communication
          }
        }
      } else {
        console.log('✅ Sign in successful');
        toast({
          title: 'Success',
          description: 'Signed in successfully!',
        })
        
        // For Stream Deck, the success handling is done in useEffect above
        // For normal login, navigation is handled by the auth system
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

  const handleGoogleSignIn = async () => {
    setLoading(true)
    
    try {
      const { error } = await signInWithGoogle()
      
      if (error) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to sign in with Google',
          variant: 'destructive',
        })
        setLoading(false)
      }
      // Don't set loading to false on success - user will be redirected
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      })
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
            {isStreamDeck && (
              <CardDescription className="text-blue-400">
                🎛️ Stream Deck Plugin Login
              </CardDescription>
            )}
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
                    
                    {GOOGLE_AUTH_ENABLED && (
                      <>
                        <div className="relative my-4">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-600" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-gray-800 px-2 text-gray-400">Or continue with</span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-gray-600 bg-gray-700 text-white hover:bg-gray-600"
                          onClick={handleGoogleSignIn}
                          disabled={loading}
                        >
                          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                            <path
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              fill="#4285F4"
                            />
                            <path
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              fill="#34A853"
                            />
                            <path
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              fill="#FBBC05"
                            />
                            <path
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              fill="#EA4335"
                            />
                          </svg>
                          Continue with Google
                        </Button>
                      </>
                    )}

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
                    
                    {GOOGLE_AUTH_ENABLED && (
                      <>
                        <div className="relative my-4">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-600" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-gray-800 px-2 text-gray-400">Or continue with</span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-gray-600 bg-gray-700 text-white hover:bg-gray-600"
                          onClick={handleGoogleSignIn}
                          disabled={loading}
                        >
                          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                            <path
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              fill="#4285F4"
                            />
                            <path
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              fill="#34A853"
                            />
                            <path
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              fill="#FBBC05"
                            />
                            <path
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              fill="#EA4335"
                            />
                          </svg>
                          Continue with Google
                        </Button>
                      </>
                    )}
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
