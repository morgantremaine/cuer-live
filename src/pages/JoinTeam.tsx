
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
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const JoinTeam = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('signup');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<string>('');
  const { user, signUp, signIn } = useAuth();
  const { acceptInvitation } = useTeam();
  const { toast } = useToast();

  useEffect(() => {
    const loadInvitation = async () => {
      if (!token) {
        console.log('No token provided, redirecting to login');
        navigate('/login');
        return;
      }

      try {
        console.log('Validating invitation token:', token);
        
        // Store token for later use during signup
        localStorage.setItem('pendingInvitationToken', token);
        
        // Use the new database function to validate the token
        const { data: validationResult, error: validationError } = await supabase.rpc(
          'validate_invitation_token',
          { token_param: token }
        );

        if (validationError) {
          console.error('Error validating invitation token:', validationError);
          setValidationError('Failed to validate invitation. Please try again.');
          setLoading(false);
          return;
        }

        console.log('Validation result:', validationResult);

        if (!validationResult?.valid) {
          console.log('Invalid invitation token:', validationResult?.error);
          setValidationError(validationResult?.error || 'Invalid or expired invitation token');
          setLoading(false);
          return;
        }

        // Set invitation data from validation result
        const invitationData = {
          id: validationResult.invitation.id,
          email: validationResult.invitation.email,
          team_id: validationResult.invitation.team_id,
          invited_by: validationResult.invitation.invited_by,
          created_at: validationResult.invitation.created_at,
          expires_at: validationResult.invitation.expires_at,
          token: validationResult.invitation.token,
          teams: {
            id: validationResult.team.id,
            name: validationResult.team.name
          },
          inviter: validationResult.inviter
        };

        setInvitation(invitationData);
        setEmail(invitationData.email || '');

        // Check if user already exists with this email
        if (invitationData.email) {
          await checkUserExists(invitationData.email);
        }

      } catch (error) {
        console.error('Error loading invitation:', error);
        setValidationError('Failed to load invitation. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadInvitation();
  }, [token, navigate]);

  const checkUserExists = async (emailToCheck: string) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', emailToCheck)
        .maybeSingle();
      
      if (profileData) {
        setActiveTab('signin');
      } else {
        setActiveTab('signup');
      }
    } catch (error) {
      console.error('Error in checkUserExists:', error);
      setActiveTab('signup');
    }
  };

  // Enhanced invitation acceptance with better error handling
  const handleAcceptInvitation = async () => {
    if (!token) {
      console.error('No token available for invitation acceptance');
      setIsProcessing(false);
      return;
    }

    try {
      setProcessingStep('Accepting team invitation...');
      console.log('Accepting invitation with token:', token);
      console.log('Current user:', user?.id, user?.email);
      
      // Wait for auth to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { error } = await acceptInvitation(token);
      
      if (error) {
        console.error('Failed to accept invitation:', error);
        
        // Handle specific error cases with better user messaging
        if (error.includes('already a member')) {
          toast({
            title: 'Already a Member',
            description: 'You are already a member of this team. Redirecting to dashboard...',
          });
          localStorage.removeItem('pendingInvitationToken');
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        } else {
          toast({
            title: 'Error',
            description: error,
            variant: 'destructive',
          });
          
          // Try direct database approach as fallback
          console.log('Trying direct database approach...');
          await handleDirectInvitationAcceptance();
        }
      } else {
        console.log('Invitation accepted successfully');
        localStorage.removeItem('pendingInvitationToken');
        setProcessingStep('Success! Redirecting to dashboard...');
        toast({
          title: 'Success',
          description: 'Welcome to the team!',
        });
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      
      // Try direct database approach as fallback
      console.log('Trying direct database approach as fallback...');
      await handleDirectInvitationAcceptance();
    }
  };

  // Direct database approach for invitation acceptance
  const handleDirectInvitationAcceptance = async () => {
    if (!user || !invitation) return;

    try {
      console.log('Direct invitation acceptance for user:', user.id, 'team:', invitation.team_id);
      
      // First ensure user has a profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || fullName || ''
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }

      // Check if already a team member
      const { data: existingMembership } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('team_id', invitation.team_id)
        .maybeSingle();

      if (existingMembership) {
        console.log('User is already a team member');
        toast({
          title: 'Already a Member',
          description: 'You are already a member of this team!',
        });
      } else {
        // Add user to team
        const { error: membershipError } = await supabase
          .from('team_members')
          .insert({
            user_id: user.id,
            team_id: invitation.team_id,
            role: 'member'
          });

        if (membershipError) {
          console.error('Error creating team membership:', membershipError);
          throw membershipError;
        }

        console.log('Team membership created successfully');
      }

      // Mark invitation as accepted
      const { error: invitationError } = await supabase
        .from('team_invitations')
        .update({ accepted: true })
        .eq('token', token);

      if (invitationError) {
        console.error('Error marking invitation as accepted:', invitationError);
      }

      localStorage.removeItem('pendingInvitationToken');
      setProcessingStep('Success! Redirecting to dashboard...');
      toast({
        title: 'Success',
        description: 'Welcome to the team!',
      });
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);

    } catch (error) {
      console.error('Error in direct invitation acceptance:', error);
      toast({
        title: 'Error',
        description: 'Failed to join team. Please try again or contact support.',
        variant: 'destructive',
      });
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  // Handle invitation acceptance when user becomes available
  useEffect(() => {
    const handleInvitationAcceptance = async () => {
      if (!user || !token || isProcessing) {
        return;
      }

      console.log('User is ready for invitation acceptance, processing...');
      setIsProcessing(true);
      setProcessingStep('Preparing to join team...');
      
      await handleAcceptInvitation();
    };

    // Only process if we have a user and haven't started processing yet
    if (user && token && !isProcessing) {
      handleInvitationAcceptance();
    }
  }, [user, token]);

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    
    if (password.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters long',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setProcessingStep('Creating your account...');
    console.log('Creating account for team invitation:', email);
    
    const { error } = await signUp(email, password, fullName);
    
    if (error) {
      console.error('Sign up error:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      setIsProcessing(false);
      setProcessingStep('');
    } else {
      console.log('Team invitation account created successfully');
      setProcessingStep('Account created! Processing invitation...');
      // Processing will continue in the useEffect when user becomes available
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    
    setIsProcessing(true);
    setProcessingStep('Signing you in...');
    console.log('Signing in user for team invitation:', email);
    
    const { error } = await signIn(email, password);
    
    if (error) {
      console.error('Sign in error:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      setIsProcessing(false);
      setProcessingStep('');
    } else {
      console.log('Sign in successful, will process invitation');
      setProcessingStep('Signed in! Processing invitation...');
      // Processing will continue in the useEffect when user becomes available
    }
  }

  if (loading) {
    return (
      <div className="dark min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-300">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (validationError || !invitation) {
    return (
      <div className="dark min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-white">Invalid Invitation</CardTitle>
            <CardDescription className="text-gray-400">
              {validationError || 'This invitation link is invalid or has expired.'}
            </CardDescription>
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

  if (user && isProcessing) {
    return (
      <div className="dark min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {processingStep.includes('Success') ? (
                <CheckCircle className="h-12 w-12 text-green-500" />
              ) : (
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              )}
            </div>
            <CardTitle className="text-white">Joining Team</CardTitle>
            <CardDescription className="text-gray-400">
              {invitation.teams?.name || 'the team'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-300 mb-4">{processingStep}</p>
            {!processingStep.includes('Success') && (
              <div className="text-sm text-gray-500">
                Please wait, this may take a few moments...
              </div>
            )}
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
              You're about to join {invitation.teams?.name || 'this team'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleAcceptInvitation} 
              className="w-full" 
              disabled={isProcessing}
            >
              {isProcessing ? 'Joining Team...' : 'Accept Invitation'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getInviterDisplayName = () => {
    if (invitation.inviter?.full_name) {
      return invitation.inviter.full_name;
    }
    if (invitation.inviter?.email) {
      return invitation.inviter.email;
    }
    return 'A team member';
  };

  return (
    <div className="dark min-h-screen flex flex-col bg-gray-900">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <img 
                src="/lovable-uploads/d3829867-67da-4acb-a6d3-66561a4e60e7.png" 
                alt="Cuer Logo" 
                className="h-12 w-auto"
              />
            </div>
            <CardTitle className="text-white">Join Team: {invitation?.teams?.name || 'Team'}</CardTitle>
            <CardDescription className="text-gray-400">
              {getInviterDisplayName()} has invited you to join their team.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700 rounded">
                  <p className="text-sm text-blue-300">
                    ⓘ Account will be created and you'll join the team automatically
                  </p>
                </div>
                <form onSubmit={handleCreateAccount} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-300">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                      placeholder="Enter your email"
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
                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Account & Join Team'
                    )}
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
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                      placeholder="Enter your email"
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
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      'Sign In & Join Team'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default JoinTeam;
