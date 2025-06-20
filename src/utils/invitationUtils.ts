
import { supabase } from '@/lib/supabase';

export const validateInvitationToken = async (token: string): Promise<boolean> => {
  try {
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
    return;
  }

  // Clear any stale invitation tokens from localStorage
  const pendingToken = localStorage.getItem('pendingInvitationToken');
  if (pendingToken) {
    validateInvitationToken(pendingToken).then((isValid) => {
      if (!isValid) {
        localStorage.removeItem('pendingInvitationToken');
      }
    }).catch((error) => {
      console.error('Error checking token validity, clearing it:', error);
      localStorage.removeItem('pendingInvitationToken');
    });
  }
};
