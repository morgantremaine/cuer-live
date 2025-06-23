
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, teamName, inviterName, token } = await req.json();

    console.log('Sending invitation email to:', email, 'for team:', teamName);

    if (!email || !teamName || !token) {
      console.error('Missing required fields:', { email, teamName, token });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the site URL from the request origin or use environment variable
    const origin = req.headers.get('origin') || req.headers.get('referer');
    let siteUrl = 'https://cuer.live'; // Default fallback
    
    // If we have an origin, use it; otherwise try to get from environment
    if (origin) {
      try {
        const url = new URL(origin);
        siteUrl = `${url.protocol}//${url.host}`;
      } catch (e) {
        console.log('Could not parse origin, using default:', e);
      }
    } else {
      // Try to construct from Supabase URL as fallback
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      if (supabaseUrl) {
        siteUrl = supabaseUrl.replace('supabase.co', 'lovableproject.com');
      }
    }
    
    const inviteUrl = `${siteUrl}/join-team/${token}`;

    console.log('Generated invite URL:', inviteUrl);

    // Send email using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not found');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const emailData = {
      from: 'Cuer <noreply@cuer.live>',
      to: [email],
      subject: `You've been invited to join ${teamName} on Cuer`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://khdiwrkgahsbjszlwnob.lovableproject.com/lovable-uploads/d3829867-67da-4acb-a6d3-66561a4e60e7.png" alt="Cuer" style="height: 60px;">
          </div>
          
          <h1 style="color: #333; text-align: center; margin-bottom: 30px;">
            You're invited to join ${teamName}!
          </h1>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <p style="color: #666; font-size: 16px; line-height: 1.5; margin: 0;">
              <strong>${inviterName || 'A team member'}</strong> has invited you to join <strong>${teamName}</strong> on Cuer, 
              the professional rundown and production management platform.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          
          <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
            <p style="color: #1e40af; margin: 0; font-size: 14px;">
              <strong>What's next?</strong><br>
              Click the button above to create your account or sign in, and you'll automatically be added to the team.
              No email verification required for team invitations!
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${inviteUrl}" style="color: #3b82f6; word-break: break-all;">${inviteUrl}</a>
          </p>
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 20px 0 0 0;">
            This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
    };

    console.log('Sending email with data:', { ...emailData, html: '[HTML content]' });

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    const emailResult = await emailResponse.json();
    
    if (!emailResponse.ok) {
      console.error('Email sending failed:', emailResult);
      return new Response(
        JSON.stringify({ error: 'Failed to send invitation email', details: emailResult }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Email sent successfully:', emailResult);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-team-invitation function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
