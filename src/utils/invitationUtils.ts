
import { supabase } from '@/lib/supabase';

export const validateInvitationToken = async (token: string): Promise<boolean> => {
  try {
    console.log('Validating invitation token:', token);
    
    const { data, error } = await supabase
      .from('team_invitations')
      .select('id, expires_at, accepted')
      .eq('token', token)
      .eq('accepted', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    console.log('Invitation validation result:', { data, error });

    if (error) {
      console.error('Error validating invitation token:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error validating invitation token:', error);
    return false;
  }
};

export const clearInvalidTokens = () => {
  // Only clear tokens if we're not on a join team page
  if (window.location.pathname.startsWith('/join-team/')) {
    console.log('On JoinTeam page, not clearing tokens');
    return;
  }

  // Clear any stale invitation tokens from localStorage
  const pendingToken = localStorage.getItem('pendingInvitationToken');
  if (pendingToken) {
    console.log('Checking if pending token is still valid:', pendingToken);
    validateInvitationToken(pendingToken).then((isValid) => {
      if (!isValid) {
        console.log('Clearing invalid invitation token from localStorage');
        localStorage.removeItem('pendingInvitationToken');
      } else {
        console.log('Pending token is still valid, keeping it');
      }
    }).catch((error) => {
      console.error('Error checking token validity, clearing it:', error);
      localStorage.removeItem('pendingInvitationToken');
    });
  }
};
