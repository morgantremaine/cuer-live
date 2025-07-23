-- Clean up any remaining data for morgantremaine@icloud.com
DELETE FROM profiles WHERE email = 'morgantremaine@icloud.com';

-- Clean up any pending invitations for this email
DELETE FROM team_invitations WHERE email = 'morgantremaine@icloud.com';

-- Clean up any subscriber records for this email
DELETE FROM subscribers WHERE email = 'morgantremaine@icloud.com';