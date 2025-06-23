
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

const JoinTeam = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<any>(null);
  const [inviterProfile, setInviterProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('signup');
  const [userExists, setUserExists] = useState(false);
  const [userJustSignedUp, setUserJustSignedUp] = useState(false);
  const { user, signUp, signIn } = useAuth();
  const { acceptInvitation } = useTeam();
  const { toast } = useToast();

  // Store invitation token in localStorage when page loads
  useEffect(() => {
    if (token) {
      console.log('Storing invitation token in localStorage:', token);
      localStorage.setItem('pendingInvitationToken', token);
    }
  }, [token]);

  useEffect(() => {
    const loadInvitation = async () => {
      if (!token) {
        console.log('No token provided, redirecting to login');
        navigate('/login');
        return;
      }

      try {
        console.log('Loading invitation data for token:', token);
        
        const { data: invitationData, error: invitationError } = await supabase
          .from('team_invitations')
          .select(`
            *,
            teams (name)
          `)
          .eq('token', token)
          .eq('accepted', false)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

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

        if (!invitationData) {
          console.log('Invalid or expired invitation token');
          toast({
            title: 'Invalid Invitation',
            description: 'This invitation link is invalid or has expired.',
            variant: 'destructive',
          });
          localStorage.removeItem('pendingInvitationToken');
          navigate('/login');
          return;
        }

        setInvitation(invitationData);
        setEmail(invitationData.email);

        // Try to get the inviter's profile
        if (invitationData.invited_by) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', invitationData.invited_by)
            .maybeSingle();

          if (profileData) {
            setInviterProfile(profileData);
          }
        }
        
        // Check if user already exists with this email
        await checkUserExists(invitationData.email);
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
  }, [token, navigate, toast]);

  const checkUserExists = async (emailToCheck: string) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', emailToCheck)
        .maybeSingle();
      
      if (profileData) {
        setUserExists(true);
        setActiveTab('signin');
      } else {
        setUserExists(false);
        setActiveTab('signup');
      }
    } catch (error) {
      console.error('Error in checkUserExists:', error);
      setUserExists(false);
      setActiveTab('signup');
    }
  };

  // Handle invitation acceptance when user becomes available
  useEffect(() => {
    const handleInvitationAcceptance = async () => {
      // Only proceed if we have a user, invitation, token, and we're not already processing
      if (!user || !invitation || !token || isProcessing) {
        console.log('Conditions not met for invitation acceptance:', {
          hasUser: !!user,
          hasInvitation: !!invitation,
          hasToken: !!token,
          isProcessing
        });
        return;
      }

      // Check if the user just signed up (to avoid processing for existing users)
      if (userJustSignedUp || localStorage.getItem('pendingInvitationToken') === token) {
        console.log('User is ready for invitation acceptance, processing...');
        await handleAcceptInvitation();
      }
    };

    handleInvitationAcceptance();
  }, [user, invitation, token, userJustSignedUp]);

  const handleAcceptInvitation = async () => {
    if (!token) {
      console.error('No token available for invitation acceptance');
      return;
    }

    setIsProcessing(true);
    
    try {
      console.log('Accepting invitation with token:', token);
      const { error } = await acceptInvitation(token);
      
      if (error) {
        console.error('Failed to accept invitation:', error);
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive',
        });
        setIsProcessing(false);
      } else {
        console.log('Invitation accepted successfully');
        // Only clear the token after successful acceptance
        localStorage.removeItem('pendingInvitationToken');
        toast({
          title: 'Success',
          description: 'Welcome to the team!',
        });
        // Small delay to ensure team data is loaded before navigation
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to join team. Please try again.',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
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
    console.log('Creating account for team invitation:', email);
    
    // Team invitation signup
    const { error } = await signUp(email, password, fullName);
    
    if (error) {
      console.error('Sign up error:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      setIsProcessing(false);
    } else {
      console.log('Team invitation account created successfully');
      setUserJustSignedUp(true);
      // Don't clear isProcessing here - let the invitation acceptance handle it
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsProcessing(true);
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
    } else {
      console.log('Sign in successful, will process invitation');
      // Don't clear isProcessing here - let the invitation acceptance handle it
    }
  };

  if (loading) {
    return (
      <div className="dark min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading invitation...</p>
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
            <CardTitle className="text-white">Joining Team</CardTitle>
            <CardDescription className="text-gray-400">
              Please wait while we add you to {invitation.teams?.name || 'the team'}...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-300">Processing your invitation...</p>
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
    if (inviterProfile?.full_name) {
      return inviterProfile.full_name;
    }
    if (inviterProfile?.email) {
      return inviterProfile.email;
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
            <CardTitle className="text-white">Join Team: {invitation.teams?.name || 'Team'}</CardTitle>
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
                <div className="mb-4 p-3 bg-green-900/20 border border-green-700 rounded">
                  <p className="text-sm text-green-300">
                    ✓ No email verification required for team invitations
                  </p>
                </div>
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
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default JoinTeam;
