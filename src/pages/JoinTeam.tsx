
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import Footer from '@/components/Footer';

const JoinTeam = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const { user, signUp, signIn } = useAuth();
  const { acceptInvitation } = useTeam();
  const { toast } = useToast();

  useEffect(() => {
    const loadInvitation = async () => {
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('team_invitations')
          .select(`
            *,
            teams (name),
            profiles!team_invitations_invited_by_fkey (full_name, email)
          `)
          .eq('token', token)
          .eq('accepted', false)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (error || !data) {
          toast({
            title: 'Invalid Invitation',
            description: 'This invitation link is invalid or has expired.',
            variant: 'destructive',
          });
          navigate('/login');
          return;
        }

        setInvitation(data);
        setEmail(data.email);
      } catch (error) {
        console.error('Error loading invitation:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    loadInvitation();
  }, [token, navigate, toast]);

  useEffect(() => {
    // If user is already logged in and we have an invitation, accept it
    if (user && invitation && !isCreatingAccount) {
      handleAcceptInvitation();
    }
  }, [user, invitation]);

  const handleAcceptInvitation = async () => {
    if (!token) return;

    const { error } = await acceptInvitation(token);
    
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Welcome to the team!',
      });
      navigate('/dashboard');
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

    setIsCreatingAccount(true);
    const { error } = await signUp(email, password, fullName);
    
    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      setIsCreatingAccount(false);
    } else {
      // Account created, but user needs to verify email first
      toast({
        title: 'Account Created',
        description: 'Please check your email to verify your account, then return to this page to join the team.',
      });
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

  if (user) {
    return (
      <div className="dark min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <CardTitle className="text-white">Join Team</CardTitle>
            <CardDescription className="text-gray-400">
              You're about to join {invitation.teams.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleAcceptInvitation} className="w-full">
              Accept Invitation
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
              <img 
                src="/lovable-uploads/d3829867-67da-4acb-a6d3-66561a4e60e7.png" 
                alt="Cuer Logo" 
                className="h-12 w-auto"
              />
            </div>
            <CardTitle className="text-white">Join Team: {invitation.teams.name}</CardTitle>
            <CardDescription className="text-gray-400">
              {invitation.profiles?.full_name || invitation.profiles?.email} has invited you to join their team. Create your account to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={isCreatingAccount}>
                {isCreatingAccount ? 'Creating Account...' : 'Create Account & Join Team'}
              </Button>
            </form>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-400">
                Already have an account?{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Sign in instead
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default JoinTeam;
