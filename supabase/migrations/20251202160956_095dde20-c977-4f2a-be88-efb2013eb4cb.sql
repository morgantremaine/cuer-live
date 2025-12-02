-- Create the trigger that binds handle_new_user() to auth.users INSERT events
-- This was never created, causing new users to not get profiles automatically

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();