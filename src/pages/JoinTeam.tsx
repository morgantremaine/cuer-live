import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import Footer from '@/components/Footer';
import CuerLogo from '@/components/common/CuerLogo';

const JoinTeam = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  console.log('JoinTeam component loaded with token:', token);
  console.log('useParams result:', useParams());
  console.log('Current URL:', window.location.href);
  
  const [invitation, setInvitation] = useState<any>(null);
  const [inviterProfile, setInviterProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('signup');
  const [userExists, setUserExists] = useState(false);
  const [profileError, setProfileError] = useState(false);
  const [invitationProcessed, setInvitationProcessed] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const { user, signUp, signIn } = useAuth();
  const { acceptInvitation } = useTeam();
  const { toast } = useToast();

  // Define helper function early in the component
  const getInviterDisplayName = () => {
    if (profileError) {
      return 'A team member';
    }
    if (inviterProfile?.full_name) {
      return inviterProfile.full_name;
    }
    if (inviterProfile?.email) {
      return inviterProfile.email;
    }
    return 'A team member';
  };

  // Store invitation token in localStorage and load invitation data
  useEffect(() => {
    console.log('Token from useParams:', token);
    console.log('Type of token:', typeof token);
    
    if (!token || token === 'undefined') {
      console.error('Invalid token received:', token);
      localStorage.removeItem('pendingInvitationToken');
      
      toast({
        title: 'Invalid Invitation Link',
        description: 'The invitation link appears to be malformed. Please request a new invitation.',
        variant: 'destructive',
      });
      
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      return;
    }

    console.log('Storing invitation token in localStorage:', token);
    localStorage.setItem('pendingInvitationToken', token);

    const loadInvitation = async () => {
      try {
        console.log('Loading invitation data for token:', token);
        
        // Use the safe function to get all invitation details
        const { data: invitationResponse, error: invitationError } = await supabase.rpc(
          'get_invitation_details_safe',
          { invitation_token: token }
        );

        console.log('Invitation details response:', { invitationResponse, invitationError });

        if (invitationError) {
          console.error('Error loading invitation:', invitationError);
          toast({
            title: 'Error Loading Invitation',
            description: 'There was an error loading the invitation details.',
            variant: 'destructive',
          });
          localStorage.removeItem('pendingInvitationToken');
          navigate('/login');
          return;
        }

        // Check if the response contains an error (function returned error object)
        if (!invitationResponse || invitationResponse.error) {
          console.log('Invalid or expired invitation token:', invitationResponse?.error);
          toast({
            title: 'Invalid Invitation',
            description: invitationResponse?.error || 'This invitation link is invalid or has expired.',
            variant: 'destructive',
          });
          localStorage.removeItem('pendingInvitationToken');
          navigate('/login');
          return;
        }

        // Set invitation and inviter profile from the function result
        setInvitation({
          ...invitationResponse.invitation,
          teams: invitationResponse.team
        });
        setEmail(invitationResponse.invitation.email);

        if (invitationResponse.inviter) {
          setInviterProfile(invitationResponse.inviter);
          setProfileError(false);
        } else {
          console.log('No inviter profile found, using fallback display');
          setProfileError(true);
        }
        
        // Check if user already exists with this email
        await checkUserExists(invitationResponse.invitation.email);
      } catch (error) {
        console.error('Error loading invitation:', error);
        toast({
          title: 'Error',
          description: 'Failed to load invitation details.',
          variant: 'destructive',
        });
        localStorage.removeItem('pendingInvitationToken');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    loadInvitation();
  }, [token]); // Removed navigate and toast from dependencies to prevent loop

  const checkUserExists = async (emailToCheck: string) => {
    try {
      console.log('Checking if user exists for email:', emailToCheck);
      
      // Simply assume user doesn't exist and default to signup to avoid 401 errors
      // Let the actual signup/signin process handle user existence validation
      console.log('Defaulting to sign up tab to avoid authentication issues');
      setUserExists(false);
      setActiveTab('signup');
    } catch (error) {
      console.error('Error in checkUserExists:', error);
      setUserExists(false);
      setActiveTab('signup');
    }
  };

  // Handle invitation acceptance when user is authenticated
  useEffect(() => {
    // Guard against re-runs during processing
    if (invitationProcessed || isProcessing) return;
    
    if (user && invitation) {
      console.log('User is authenticated and invitation is loaded, processing invitation');
      setInvitationProcessed(true);
      
      // Add a small delay to ensure useTeam hook doesn't interfere
      setTimeout(() => {
        handleAcceptInvitation();
      }, 200);
    }
  }, [user?.id, invitation?.id]); // Simplified dependencies

  const handleAcceptInvitation = async () => {
    if (!token || isProcessing) return;
    
    // Check if we're already processing this specific invitation
    const processingKey = `acceptingInvitation-${token}`;
    if (localStorage.getItem(processingKey) === 'true') {
      console.log('Already processing this invitation, skipping duplicate call');
      return;
    }
    
    // Set processing flag for this specific invitation
    localStorage.setItem(processingKey, 'true');
    
    // Clear token IMMEDIATELY to prevent race conditions with useInvitationHandler
    console.log('Clearing pendingInvitationToken immediately');
    localStorage.removeItem('pendingInvitationToken');

    setIsProcessing(true);
    
    try {
      console.log('Accepting invitation with token:', token);
      const { error } = await acceptInvitation(token);
      
      if (error) {
        console.error('Failed to accept invitation:', error);
        
        // If invitation was already accepted, treat as success and redirect
        if (error.toLowerCase().includes('already been accepted')) {
          console.log('Invitation already accepted - redirecting to dashboard');
          toast({
            title: 'Welcome!',
            description: 'You are already a member of this team.',
          });
          setTimeout(() => {
            localStorage.removeItem(processingKey);
            navigate('/dashboard', { replace: true });
          }, 500);
          return;
        }
        
        // Other errors - show error and allow retry
        localStorage.removeItem(processingKey);
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive',
        });
        setIsProcessing(false);
        setInvitationProcessed(false); // Reset so user can try again
      } else {
        console.log('Invitation accepted successfully');
        toast({
          title: 'Success',
          description: 'Welcome to the team!',
        });
        
        // Add a small delay before navigation to ensure toast is visible
        setTimeout(() => {
          localStorage.removeItem(processingKey);
          navigate('/dashboard', { replace: true });
        }, 500);
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      localStorage.removeItem(processingKey);
      toast({
        title: 'Error',
        description: 'Failed to join team. Please try again.',
        variant: 'destructive',
      });
      setIsProcessing(false);
      setInvitationProcessed(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreeToTerms) {
      toast({
        title: 'Error',
        description: 'You must agree to the Terms of Service and Privacy Policy to create an account.',
        variant: 'destructive',
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }
    
    if (password.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters long',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    console.log('Creating account for:', email);
    
    const { error, data } = await signUp(email, password, fullName);
    
    if (error) {
      console.error('Sign up error:', error);
      
      // Handle "user already registered" case
      if (error.message.includes('User already registered')) {
        toast({
          title: 'Account Already Exists',
          description: 'This email is already registered. Please use the sign-in tab instead.',
        });
        setActiveTab('signin'); // Switch to sign-in tab
        setIsProcessing(false);
        return;
      }
      
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      setIsProcessing(false);
    } else {
      console.log('Account created successfully');
      
      // Since email confirmation is disabled, user should have immediate session
      if (data?.session) {
        console.log('User has immediate session - proceeding with team invitation');
        toast({
          title: 'Account Created Successfully!',
          description: 'Welcome! You will now join the team automatically.',
        });
        // User will be automatically processed by the useEffect that handles invitation acceptance
      } else {
        console.log('Unexpected: No immediate session despite disabled email confirmation');
        // Fallback - still show confirmation screen just in case
        setShowEmailConfirmation(true);
      }
      setIsProcessing(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsProcessing(true);
    console.log('Signing in user:', email);
    
    const { error } = await signIn(email, password);
    
    if (error) {
      console.error('Sign in error:', error);
      
      if (error.message.includes('Email not confirmed') || error.message.includes('Invalid login credentials')) {
        toast({
          title: 'Sign In Failed',
          description: 'Please check your email and password, or create a new account if you haven\'t signed up yet.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      }
      setIsProcessing(false);
    }
    // If successful, the useEffect will handle accepting the invitation
  };

  if (loading) {
    return (
      <div className="dark min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading invitation...</p>
          <p className="mt-2 text-sm text-gray-500">Token: {token || 'No token'}</p>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="dark min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <CardTitle className="text-white">Invalid Invitation</CardTitle>
            <CardDescription className="text-gray-400">
              This invitation link is invalid or has expired.
            </CardDescription>
            <p className="text-xs text-gray-500 mt-2">
              Token received: {token || 'undefined'}
            </p>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/login')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user && !isProcessing) {
    return (
      <div className="dark min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <CardTitle className="text-white">Join Team</CardTitle>
            <CardDescription className="text-gray-400">
              You're about to join {getInviterDisplayName()}'s team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleAcceptInvitation} 
              className="w-full" 
              disabled={isProcessing || invitationProcessed}
            >
              {isProcessing ? 'Joining Team...' : 'Accept Invitation'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen flex flex-col bg-gray-900">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <CuerLogo isDark={true} className="h-12 w-auto" />
            </div>
            <CardTitle className="text-white">Join {getInviterDisplayName()}'s Team</CardTitle>
            <CardDescription className="text-gray-400">
              {getInviterDisplayName()} has invited you to join their team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showEmailConfirmation ? (
              <div className="text-center space-y-4">
                <div className="text-white text-lg font-semibold">Almost There!</div>
                <p className="text-gray-400">
                  If you're seeing this message, there may have been an issue with automatic account setup. Please try refreshing the page or contact support.
                </p>
                <div className="space-y-2">
                  <Button 
                    onClick={() => window.location.reload()}
                    className="text-white bg-blue-600 hover:bg-blue-700 w-full"
                  >
                    Refresh Page
                  </Button>
                  <Button 
                    onClick={() => setShowEmailConfirmation(false)}
                    variant="ghost"
                    className="text-gray-400 hover:text-gray-300 w-full"
                  >
                    Back to Sign In
                  </Button>
                </div>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-700">
                  <TabsTrigger value="signup" className="text-gray-300 data-[state=active]:text-white">
                    Create Account
                  </TabsTrigger>
                  <TabsTrigger value="signin" className="text-gray-300 data-[state=active]:text-white">
                    Sign In
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="signup" className="space-y-4 mt-4">
                  <form onSubmit={handleCreateAccount} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-300">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        disabled
                        className="bg-gray-600 border-gray-500 text-gray-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-gray-300">Full Name</Label>
                      <Input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-gray-300">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                        placeholder="Create a password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-gray-300">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                        placeholder="Confirm your password"
                      />
                    </div>
                    <div className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        id="agree-terms-join"
                        checked={agreeToTerms}
                        onChange={(e) => setAgreeToTerms(e.target.checked)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700"
                        required
                      />
                        <label htmlFor="agree-terms-join" className="text-sm text-gray-300">
                        I agree to create an account and join {getInviterDisplayName()}'s team by accepting the{' '}
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
                    <Button 
                      type="submit" 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Creating Account...' : 'Create Account & Join Team'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signin" className="space-y-4 mt-4">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email" className="text-gray-300">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        value={email}
                        disabled
                        className="bg-gray-600 border-gray-500 text-gray-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password" className="text-gray-300">Password</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                        placeholder="Enter your password"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Signing In...' : 'Sign In & Join Team'}
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
  );
};

export default JoinTeam;
