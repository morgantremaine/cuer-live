
import { supabase } from '@/lib/supabase';

export const validateInvitationToken = async (token: string): Promise<boolean> => {
  try {
    console.log('Validating invitation token:', token);
    
    const { data, error } = await supabase
      .from('team_invitations')
      .select('id, expires_at, accepted, email')
      .eq('token', token)
      .eq('accepted', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    console.log('Token validation result:', { data, error });

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

export const clearInvalidTokens = async () => {
  try {
    // Only clear tokens if we're not on a join team page
    if (window.location.pathname.startsWith('/join-team/')) {
      console.log('On join team page, skipping token cleanup');
      return;
    }

    // Clear any stale invitation tokens from localStorage
    const pendingToken = localStorage.getItem('pendingInvitationToken');
    if (pendingToken) {
      console.log('Checking validity of stored invitation token');
      
      const isValid = await validateInvitationToken(pendingToken);
      if (!isValid) {
        console.log('Stored token is invalid, clearing it');
        localStorage.removeItem('pendingInvitationToken');
      } else {
        console.log('Stored token is still valid');
      }
    }
  } catch (error) {
    console.error('Error checking token validity, clearing it:', error);
    localStorage.removeItem('pendingInvitationToken');
  }
};

export const getInvitationDetails = async (token: string) => {
  try {
    const { data, error } = await supabase
      .from('team_invitations')
      .select(`
        id,
        email,
        team_id,
        expires_at,
        accepted,
        teams (
          id,
          name
        )
      `)
      .eq('token', token)
      .maybeSingle();

    if (error) {
      console.error('Error fetching invitation details:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching invitation details:', error);
    return null;
  }
};
