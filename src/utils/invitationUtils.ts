
import { supabase } from '@/lib/supabase';

export const validateInvitationToken = async (token: string): Promise<boolean> => {
  try {
    // Use a service role or public access to validate tokens
    // This should work without authentication
    const { data, error } = await supabase
      .from('team_invitations')
      .select('id, expires_at, accepted')
      .eq('token', token)
      .eq('accepted', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

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
    validateInvitationToken(pendingToken).then((isValid) => {
      if (!isValid) {
        console.log('Clearing invalid invitation token from localStorage');
        localStorage.removeItem('pendingInvitationToken');
      }
    });
  }
};
