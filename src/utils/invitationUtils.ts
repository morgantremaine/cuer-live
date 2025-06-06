
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

    if (error || !data) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating invitation token:', error);
    return false;
  }
};

export const clearInvalidTokens = () => {
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
