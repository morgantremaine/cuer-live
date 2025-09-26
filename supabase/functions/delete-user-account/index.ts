import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Delete user account function called');
    
    const { email } = await req.json()
    console.log('Request to delete user:', email);

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Finding user by email:', email);
    
    // First, find the user ID from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error listing users:', authError);
      return new Response(
        JSON.stringify({ error: 'Failed to find user' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    const userToDelete = authUsers.users.find(user => user.email === email)
    
    if (!userToDelete) {
      console.log('User not found:', email);
      return new Response(
        JSON.stringify({ message: 'User not found or already deleted' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    const userId = userToDelete.id
    console.log('Found user ID:', userId);

    // Step 1: Clean up rundowns - set last_updated_by to NULL for this user
    console.log('Cleaning up rundown references...');
    const { error: rundownError } = await supabase
      .from('rundowns')
      .update({ last_updated_by: null })
      .eq('last_updated_by', userId)

    if (rundownError) {
      console.error('Error updating rundowns:', rundownError);
    } else {
      console.log('Successfully cleaned rundown references');
    }

    // Step 2: Delete or transfer user's content
    console.log('Cleaning up user data...');

    // Delete user's team memberships
    const { error: memberError } = await supabase
      .from('team_members')
      .delete()
      .eq('user_id', userId)

    if (memberError) {
      console.error('Error deleting team memberships:', memberError);
    }

    // Delete user's rundowns
    const { error: rundownDeleteError } = await supabase
      .from('rundowns')
      .delete()
      .eq('user_id', userId)

    if (rundownDeleteError) {
      console.error('Error deleting rundowns:', rundownDeleteError);
    }

    // Delete user's blueprints
    const { error: blueprintError } = await supabase
      .from('blueprints')
      .delete()
      .eq('user_id', userId)

    if (blueprintError) {
      console.error('Error deleting blueprints:', blueprintError);
    }

    // Delete user's profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('Error deleting profile:', profileError);
    }

    // Delete user's subscribers record
    const { error: subscriberError } = await supabase
      .from('subscribers')
      .delete()
      .eq('user_id', userId)

    if (subscriberError) {
      console.error('Error deleting subscriber:', subscriberError);
    }

    // Delete other user-related data
    const tablesToClean = [
      'user_column_preferences',
      'user_rundown_zoom_preferences',
      'rundown_presence',
      'column_layouts',
      'team_conversations',
      'app_notification_dismissals'
    ]

    for (const table of tablesToClean) {
      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('user_id', userId)
        
        if (error) {
          console.error(`Error cleaning ${table}:`, error);
        } else {
          console.log(`Cleaned ${table} successfully`);
        }
      } catch (err) {
        console.error(`Error processing ${table}:`, err);
      }
    }

    // Step 3: Delete from auth.users
    console.log('Deleting user from auth...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Error deleting user from auth:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete user from auth', details: deleteError.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    console.log('User successfully deleted:', email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${email} has been completely deleted`,
        userId: userId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in delete-user-account function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: 'Failed to delete user', details: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})