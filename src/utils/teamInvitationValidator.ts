import { supabase } from '@/integrations/supabase/client';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates email format and checks for disposable email providers
 */
export const validateInvitationEmail = (email: string): ValidationResult => {
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address.' };
  }

  // Check for common disposable email providers
  const disposableProviders = [
    '10minutemail.com',
    'guerrillamail.com',
    'mailinator.com',
    'tempmail.org',
    'yopmail.com',
    'throwaway.email'
  ];

  const domain = email.split('@')[1]?.toLowerCase();
  if (disposableProviders.includes(domain)) {
    return { isValid: false, error: 'Please use a permanent email address.' };
  }

  return { isValid: true };
};

/**
 * Checks if a user already exists in the system
 */
export const checkUserExists = async (email: string): Promise<{ exists: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('Error checking user existence:', error);
      return { exists: false, error: 'Unable to verify user status.' };
    }

    return { exists: !!data };
  } catch (error) {
    console.error('Exception checking user existence:', error);
    return { exists: false, error: 'Unable to verify user status.' };
  }
};

/**
 * Checks if a user is already a member of the team
 */
export const checkTeamMembership = async (email: string, teamId: string): Promise<{ isMember: boolean; error?: string }> => {
  try {
    // First get the user ID from profiles
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (profileError) {
      console.error('Error checking profile:', profileError);
      return { isMember: false, error: 'Unable to verify team membership.' };
    }

    if (!profileData) {
      // User doesn't exist, so they're not a team member
      return { isMember: false };
    }

    // Check if user is already a team member
    const { data: memberData, error: memberError } = await supabase
      .from('team_members')
      .select('id')
      .eq('user_id', profileData.id)
      .eq('team_id', teamId)
      .maybeSingle();

    if (memberError) {
      console.error('Error checking team membership:', memberError);
      return { isMember: false, error: 'Unable to verify team membership.' };
    }

    return { isMember: !!memberData };
  } catch (error) {
    console.error('Exception checking team membership:', error);
    return { isMember: false, error: 'Unable to verify team membership.' };
  }
};

/**
 * Checks if there's already a pending invitation for this email and team
 */
export const checkPendingInvitation = async (email: string, teamId: string): Promise<{ hasPending: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('team_invitations')
      .select('id, expires_at')
      .eq('email', email.toLowerCase())
      .eq('team_id', teamId)
      .eq('accepted', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error('Error checking pending invitations:', error);
      return { hasPending: false, error: 'Unable to verify pending invitations.' };
    }

    return { hasPending: !!data };
  } catch (error) {
    console.error('Exception checking pending invitations:', error);
    return { hasPending: false, error: 'Unable to verify pending invitations.' };
  }
};

/**
 * Validates an invitation token format
 */
export const validateInvitationToken = (token: string | undefined): ValidationResult => {
  if (!token) {
    return { isValid: false, error: 'No invitation token provided.' };
  }

  if (token === 'undefined' || token === 'null') {
    return { isValid: false, error: 'Invalid invitation token format.' };
  }

  // Basic UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    return { isValid: false, error: 'Invalid invitation token format.' };
  }

  return { isValid: true };
};

/**
 * Comprehensive validation for team invitations
 */
export const validateTeamInvitation = async (email: string, teamId: string): Promise<ValidationResult> => {
  // Validate email format
  const emailValidation = validateInvitationEmail(email);
  if (!emailValidation.isValid) {
    return emailValidation;
  }

  // Check if user is already a team member
  const membershipCheck = await checkTeamMembership(email, teamId);
  if (membershipCheck.error) {
    return { isValid: false, error: membershipCheck.error };
  }

  if (membershipCheck.isMember) {
    return { isValid: false, error: 'This user is already a member of your team.' };
  }

  // Check for pending invitations
  const pendingCheck = await checkPendingInvitation(email, teamId);
  if (pendingCheck.error) {
    return { isValid: false, error: pendingCheck.error };
  }

  if (pendingCheck.hasPending) {
    return { isValid: false, error: 'A pending invitation already exists for this email address.' };
  }

  return { isValid: true };
};