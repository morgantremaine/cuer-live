
import { supabase } from '@/lib/supabase';

export const validateInvitationToken = async (token: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('team_invitations')
      .select('id')
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
    console.error('Error in validateInvitationToken:', error);
    return false;
  }
};

export const clearInvalidTokens = async () => {
  const token = localStorage.getItem('pendingInvitationToken');
  if (!token) return;

  try {
    const isValid = await validateInvitationToken(token);
    if (!isValid) {
      console.log('Clearing invalid invitation token');
      localStorage.removeItem('pendingInvitationToken');
    }
  } catch (error) {
    console.error('Error clearing invalid tokens:', error);
    localStorage.removeItem('pendingInvitationToken');
  }
};
