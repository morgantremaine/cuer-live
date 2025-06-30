
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Send team invitation function called');
    
    const { email, teamId, inviterName, teamName } = await req.json()
    console.log('Request body:', { email, teamId, inviterName, teamName });

    if (!email || !teamId) {
      console.error('Missing required fields:', { email, teamId });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email and teamId' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Validate and sanitize the inviter name and team name
    const safeInviterName = inviterName && typeof inviterName === 'string' && inviterName.trim() 
      ? inviterName.trim() 
      : 'A team member';
    
    const safeTeamName = teamName && typeof teamName === 'string' && teamName.trim() 
      ? teamName.trim() 
      : 'a team';

    console.log('Using safe names:', { safeInviterName, safeTeamName });

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the current user (inviter)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header found');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // Create a supabase client with the user's auth token to get user info
    const userSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })

    // Get the current user
    const { data: { user }, error: userError } = await userSupabase.auth.getUser()
    
    if (userError || !user) {
      console.error('Error getting user:', userError);
      return new Response(
        JSON.stringify({ error: 'Failed to get user information' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    console.log('Current user:', user.id);

    // Generate a unique token for the invitation
    const token = crypto.randomUUID()
    console.log('Generated invitation token:', token);

    // Create the invitation record
    const { data: invitation, error: invitationError } = await supabase
      .from('team_invitations')
      .insert({
        email,
        team_id: teamId,
        invited_by: user.id,
        token,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      })
      .select()
      .single()

    if (invitationError) {
      console.error('Error creating invitation:', invitationError);
      return new Response(
        JSON.stringify({ error: 'Failed to create invitation', details: invitationError.message }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    console.log('Created invitation:', invitation);

    // Get Resend API key
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    const resend = new Resend(resendApiKey)

    // Use the custom domain - prioritize SITE_URL env var, fallback to custom domain
    const siteUrl = Deno.env.get('SITE_URL') || 'https://cuer.live'
    const inviteUrl = `${siteUrl}/join-team/${token}`
    
    console.log('Sending invitation email to:', email);
    console.log('Invitation URL:', inviteUrl);
    console.log('Email will use inviter name:', safeInviterName);
    console.log('Email will use team name:', safeTeamName);

    // Send email using Resend - using cuer.live domain with improved styling
    const emailResult = await resend.emails.send({
      from: 'Cuer Team <noreply@cuer.live>',
      to: [email],
      subject: `You're invited to join ${safeTeamName} on Cuer`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Team Invitation - Cuer</title>
            <style>
              /* Reset styles */
              * { margin: 0; padding: 0; box-sizing: border-box; }
              
              /* Force dark mode compatibility */
              body, table, td, p, a, li, blockquote {
                -webkit-text-size-adjust: 100%; 
                -ms-text-size-adjust: 100%;
                color: #333333 !important;
              }
              
              /* Dark mode overrides */
              @media (prefers-color-scheme: dark) {
                body, .container, .content { 
                  background-color: #ffffff !important; 
                  color: #333333 !important;
                }
                .logo { color: #3b82f6 !important; }
                .footer { color: #666666 !important; }
              }
              
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                line-height: 1.6; 
                color: #333333 !important;
                background-color: #ffffff !important;
                margin: 0;
                padding: 0;
              }
              
              .container { 
                max-width: 600px; 
                margin: 0 auto; 
                padding: 20px;
                background-color: #ffffff !important;
              }
              
              .header { 
                text-align: center; 
                margin-bottom: 30px; 
              }
              
              .logo { 
                font-size: 28px; 
                font-weight: bold; 
                color: #3b82f6 !important;
                text-decoration: none;
                display: inline-block;
                margin-bottom: 10px;
              }
              
              h1 {
                color: #333333 !important;
                font-size: 24px;
                font-weight: 600;
                margin: 0;
              }
              
              .content { 
                background-color: #f8fafc !important;
                padding: 30px; 
                border-radius: 8px; 
                margin: 20px 0;
                border: 1px solid #e2e8f0;
              }
              
              p { 
                color: #333333 !important;
                margin: 16px 0;
                font-size: 16px;
                line-height: 1.5;
              }
              
              .highlight {
                font-weight: 600;
                color: #1e40af !important;
              }
              
              .button-container {
                text-align: center;
                margin: 30px 0;
              }
              
              .button { 
                display: inline-block; 
                background-color: #3b82f6 !important;
                color: #ffffff !important; 
                padding: 16px 32px; 
                text-decoration: none; 
                border-radius: 8px; 
                font-weight: 600;
                font-size: 16px;
                border: none;
                box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
              }
              
              .button:hover {
                background-color: #2563eb !important;
              }
              
              .link-fallback {
                font-size: 14px;
                color: #6b7280 !important;
                margin-top: 20px;
                word-break: break-all;
                background-color: #f1f5f9;
                padding: 12px;
                border-radius: 4px;
                border: 1px solid #e2e8f0;
              }
              
              .footer { 
                text-align: center; 
                margin-top: 40px; 
                color: #6b7280 !important;
                font-size: 14px;
                line-height: 1.4;
              }
              
              /* Ensure links are visible */
              a {
                color: #3b82f6 !important;
                text-decoration: none;
              }
              
              /* Force text color in various email clients */
              .content p,
              .content span,
              .content div {
                color: #333333 !important;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">Cuer</div>
                <h1>You've been invited to join a team!</h1>
              </div>
              
              <div class="content">
                <p>Hi there!</p>
                
                <p><span class="highlight">${safeInviterName}</span> has invited you to join <span class="highlight">${safeTeamName}</span> on Cuer.</p>
                
                <p>Cuer is a powerful rundown management platform that helps teams collaborate on broadcast rundowns and blueprints.</p>
                
                <p>Click the button below to accept the invitation and create your account:</p>
                
                <div class="button-container">
                  <a href="${inviteUrl}" class="button">Accept Invitation</a>
                </div>
                
                <div class="link-fallback">
                  <strong>Having trouble with the button?</strong><br>
                  Copy and paste this link into your browser:<br>
                  ${inviteUrl}
                </div>
                
                <p style="font-size: 14px; color: #6b7280 !important; margin-top: 20px;">
                  This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
                </p>
              </div>
              
              <div class="footer">
                <p>This email was sent by Cuer. If you didn't expect this invitation, you can safely ignore this email.</p>
                <p style="margin-top: 10px;">
                  <a href="https://cuer.live" style="color: #3b82f6 !important;">Visit Cuer</a>
                </p>
              </div>
            </div>
          </body>
        </html>
      `
    })

    console.log('Email sent successfully:', emailResult)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation sent successfully',
        token: token,
        inviteUrl: inviteUrl
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error sending team invitation:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to send invitation', details: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
