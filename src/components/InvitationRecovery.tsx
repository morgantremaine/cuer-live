
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTeam } from '@/hooks/useTeam';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

const InvitationRecovery = () => {
  const { user } = useAuth();
  const { acceptInvitation, loadTeamData } = useTeam();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [invitationInfo, setInvitationInfo] = useState<any>(null);

  useEffect(() => {
    // Check for pending invitation token
    const token = localStorage.getItem('pendingInvitationToken');
    if (token) {
      setPendingToken(token);
      // Try to get invitation info
      fetchInvitationInfo(token);
    }
  }, []);

  const fetchInvitationInfo = async (token: string) => {
    try {
      const { data, error } = await supabase.rpc('validate_invitation_token', {
        token_param: token
      });
      
      if (!error && data?.valid) {
        setInvitationInfo(data);
      }
    } catch (error) {
      console.error('Error fetching invitation info:', error);
    }
  };

  const handleProcessInvitation = async () => {
    if (!pendingToken || !user) return;

    setIsProcessing(true);
    console.log('Manual invitation processing for user:', user.id, 'token:', pendingToken);

    try {
      const { error } = await acceptInvitation(pendingToken);
      
      if (error) {
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive',
        });
      } else {
        localStorage.removeItem('pendingInvitationToken');
        setPendingToken(null);
        
        toast({
          title: 'Success',
          description: 'Successfully joined the team!',
        });

        // Reload team data
        await loadTeamData();
      }
    } catch (error) {
      console.error('Error processing invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to process invitation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearToken = () => {
    localStorage.removeItem('pendingInvitationToken');
    setPendingToken(null);
    setInvitationInfo(null);
    toast({
      title: 'Cleared',
      description: 'Pending invitation token has been cleared.',
    });
  };

  if (!pendingToken || !user) {
    return null;
  }

  return (
    <Card className="bg-yellow-900/20 border-yellow-600">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-300">
          <AlertTriangle className="h-5 w-5" />
          Pending Team Invitation
        </CardTitle>
        <CardDescription className="text-yellow-200">
          You have a pending team invitation that needs to be processed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {invitationInfo && (
          <div className="text-sm text-gray-300">
            <p><strong>Team:</strong> {invitationInfo.team?.name}</p>
            <p><strong>Email:</strong> {invitationInfo.invitation?.email}</p>
          </div>
        )}
        
        <div className="flex gap-2">
          <Button 
            onClick={handleProcessInvitation}
            disabled={isProcessing}
            className="bg-yellow-600 hover:bg-yellow-700 text-black"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Join Team
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleClearToken}
            disabled={isProcessing}
            className="border-gray-600 text-gray-300"
          >
            Clear Token
          </Button>
        </div>
        
        <div className="text-xs text-gray-400">
          Debug: User ID {user.id}, Token: {pendingToken.substring(0, 8)}...
        </div>
      </CardContent>
    </Card>
  );
};

export default InvitationRecovery;
