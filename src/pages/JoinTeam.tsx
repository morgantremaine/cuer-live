
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle, UserX } from 'lucide-react';
import { toast } from 'sonner';

interface InvitationDetails {
  invitation: {
    id: string;
    email: string;
    team_id: string;
    invited_by: string;
    created_at: string;
    expires_at: string;
    token: string;
  };
  team: {
    id: string;
    name: string;
  };
  inviter: {
    full_name: string;
    email: string;
  };
}

export const JoinTeam = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [invitationDetails, setInvitationDetails] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailMismatch, setEmailMismatch] = useState(false);

  useEffect(() => {
    const fetchInvitationDetails = async () => {
      if (!token) {
        setError('No invitation token provided');
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Fetching invitation details for token:', token);
        
        const { data, error } = await supabase.rpc('get_invitation_details_safe', {
          invitation_token: token
        });

        if (error) {
          console.error('❌ Error fetching invitation details:', error);
          setError('Failed to load invitation details');
        } else if (data?.error) {
          console.log('⚠️ Invalid invitation:', data.error);
          setError(data.error);
        } else if (data) {
          console.log('✅ Invitation details loaded:', data);
          setInvitationDetails(data);
          
          // Check if user email matches invitation email
          if (user?.email && data.invitation?.email) {
            const userEmail = user.email.toLowerCase();
            const inviteEmail = data.invitation.email.toLowerCase();
            
            if (userEmail !== inviteEmail) {
              console.log('⚠️ Email mismatch detected:', { userEmail, inviteEmail });
              setEmailMismatch(true);
            }
          }
        } else {
          setError('Invalid or expired invitation');
        }
      } catch (error) {
        console.error('❌ Exception fetching invitation details:', error);
        setError('Failed to load invitation details');
      } finally {
        setLoading(false);
      }
    };

    fetchInvitationDetails();
  }, [token, user?.email]);

  const handleAcceptInvitation = async () => {
    if (!token || !user) {
      toast.error('Please sign in to accept this invitation');
      return;
    }

    if (emailMismatch) {
      toast.error('Please sign out and use the correct account');
      return;
    }

    setAccepting(true);

    try {
      console.log('🔄 Accepting invitation with token:', token);
      
      const { data, error } = await supabase.rpc('accept_team_invitation_safe', {
        invitation_token: token
      });

      if (error) {
        console.error('❌ Error accepting invitation:', error);
        toast.error('Failed to accept invitation: ' + error.message);
        return;
      }

      if (data?.success) {
        console.log('✅ Invitation accepted successfully:', data);
        toast.success(data.message || 'Successfully joined the team!');
        
        // Clear the token from localStorage if it exists
        localStorage.removeItem('pendingInvitationToken');
        
        // Navigate to dashboard after successful acceptance
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        console.error('❌ Invitation acceptance failed:', data?.error);
        toast.error(data?.error || 'Failed to accept invitation');
      }
    } catch (error) {
      console.error('❌ Exception accepting invitation:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setAccepting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      // The page will reload and show the sign-in prompt
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading invitation...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span>Invitation Error</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button 
              onClick={() => navigate('/auth')} 
              className="w-full mt-4"
              variant="outline"
            >
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Team Invitation</CardTitle>
            <CardDescription>
              You've been invited to join <strong>{invitationDetails?.team.name}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              This invitation is for: <strong>{invitationDetails?.invitation.email}</strong>
            </p>
            <Alert className="mb-4">
              <AlertDescription>
                Please sign in with the invited email address to accept this invitation.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => navigate('/auth')} 
              className="w-full"
            >
              Sign In to Accept
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (emailMismatch && invitationDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserX className="h-5 w-5 text-amber-500" />
              <span>Account Mismatch</span>
            </CardTitle>
            <CardDescription>
              Invitation for <strong>{invitationDetails.team.name}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This invitation is for <strong>{invitationDetails.invitation.email}</strong>, 
                but you're signed in as <strong>{user.email}</strong>.
              </AlertDescription>
            </Alert>
            <p className="text-sm text-gray-600 mb-4">
              To accept this invitation, please sign out and sign in with the correct account.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={handleSignOut}
                className="w-full"
                variant="outline"
              >
                Sign Out and Switch Account
              </Button>
              <Button 
                onClick={() => navigate('/dashboard')}
                variant="ghost"
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>Team Invitation</span>
          </CardTitle>
          <CardDescription>
            You've been invited to join <strong>{invitationDetails?.team.name}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitationDetails?.inviter && (
            <p className="text-sm text-gray-600 mb-2">
              Invited by: <strong>{invitationDetails.inviter.full_name || invitationDetails.inviter.email}</strong>
            </p>
          )}
          <p className="text-sm text-gray-600 mb-4">
            Invitation for: <strong>{invitationDetails?.invitation.email}</strong>
          </p>
          
          <Alert className="mb-4">
            <AlertDescription>
              You're signed in as <strong>{user.email}</strong>. Ready to join the team!
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Button 
              onClick={handleAcceptInvitation}
              disabled={accepting}
              className="w-full"
            >
              {accepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining Team...
                </>
              ) : (
                'Accept Invitation'
              )}
            </Button>
            <Button 
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="w-full"
              disabled={accepting}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinTeam;
