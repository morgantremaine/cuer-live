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
    console.log('Send welcome email function called');
    
    const { email, userName } = await req.json()
    console.log('Request body:', { email, userName });

    if (!email) {
      console.error('Missing required field: email');
      return new Response(
        JSON.stringify({ error: 'Missing required field: email' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

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
    const siteUrl = Deno.env.get('SITE_URL') || 'https://cuer.live'
    const logoUrl = Deno.env.get('EMAIL_LOGO_URL') || `${siteUrl}/cuer-logo-email.png`;
    
    console.log('Sending welcome email to:', email);

    // Send welcome email using Resend
    const emailResult = await resend.emails.send({
      from: 'Cuer Team <noreply@cuer.live>',
      to: [email],
      subject: `Welcome to Cuer Live! Your professional rundown platform is ready`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Cuer Live</title>
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
              
              .logo-img { 
                height: 48px;
                display: block;
                margin: 0 auto 12px auto;
                max-width: 240px;
              }
              
              h1 {
                color: #333333 !important;
                font-size: 28px;
                font-weight: 700;
                margin: 0;
                line-height: 1.2;
              }
              
              h2 {
                color: #333333 !important;
                font-size: 22px;
                font-weight: 600;
                margin: 30px 0 15px 0;
              }
              
              h3 {
                color: #333333 !important;
                font-size: 18px;
                font-weight: 600;
                margin: 20px 0 8px 0;
              }
              
              .content { 
                background-color: #f8fafc !important;
                padding: 30px; 
                border-radius: 8px; 
                margin: 20px 0;
                border: 1px solid #e2e8f0;
              }
              
              .feature-section {
                background-color: #ffffff !important;
                padding: 20px;
                margin: 15px 0;
                border-radius: 6px;
                border-left: 4px solid #3b82f6;
              }
              
              p { 
                color: #333333 !important;
                margin: 12px 0;
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
              
              .feature-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 15px;
                margin: 20px 0;
              }
              
              .feature-item {
                background-color: #f1f5f9 !important;
                padding: 15px;
                border-radius: 6px;
                border: 1px solid #e2e8f0;
              }
              
              .feature-title {
                font-weight: 600;
                color: #1e40af !important;
                margin-bottom: 5px;
                font-size: 16px;
              }
              
              .feature-desc {
                color: #4b5563 !important;
                font-size: 14px;
                line-height: 1.4;
              }
              
              .pricing-section {
                background-color: #eff6ff !important;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                border: 1px solid #dbeafe;
              }
              
              .footer { 
                text-align: center; 
                margin-top: 40px; 
                color: #6b7280 !important;
                font-size: 14px;
                line-height: 1.4;
              }
              
              .asterisk {
                color: #ef4444 !important;
                font-weight: bold;
              }
              
              .paid-note {
                background-color: #fef3c7 !important;
                color: #92400e !important;
                padding: 12px;
                border-radius: 6px;
                font-size: 14px;
                margin: 20px 0;
                border: 1px solid #fcd34d;
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

              .mockup-image {
                width: 100%;
                max-width: 500px;
                height: auto;
                border-radius: 8px;
                margin: 15px 0;
                border: 1px solid #e2e8f0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <img src="${logoUrl}" alt="Cuer Logo" class="logo-img" />
                <h1>Welcome to Cuer Live!</h1>
                <p style="font-size: 18px; color: #4b5563 !important; margin-top: 10px;">Your professional rundown platform is ready</p>
              </div>
              
              <div class="content">
                <p>Hi ${userName || 'there'}!</p>
                
                <p>Welcome to <span class="highlight">Cuer Live</span> - the professional broadcast rundown management platform trusted by production teams worldwide.</p>
                
                <p>You now have access to powerful tools that will transform how your team collaborates on live broadcasts and productions.</p>
                
                <div class="button-container">
                  <a href="${siteUrl}/dashboard" class="button">Start Your First Rundown</a>
                </div>

                <h2>🚀 Core Features You Can Use Right Now</h2>
                
                <div class="feature-grid">
                  <div class="feature-item">
                    <div class="feature-title">⚡ Real-time Sync Across Users</div>
                    <div class="feature-desc">See changes instantly as your team collaborates. No more version conflicts or lost updates.</div>
                  </div>
                  
                  <div class="feature-item">
                    <div class="feature-title">💾 Auto-save</div>
                    <div class="feature-desc">Never lose your work again. Every change is automatically saved in real-time.</div>
                  </div>
                  
                  <div class="feature-item">
                    <div class="feature-title">📱 Mobile & Tablet Ready</div>
                    <div class="feature-desc">Access your rundowns from anywhere. Full compatibility across all devices.</div>
                  </div>
                  
                  <div class="feature-item">
                    <div class="feature-title">📋 Blueprint Mode</div>
                    <div class="feature-desc">Plan and organize your shows with smart lists, checklists, and pre-production tools.</div>
                  </div>
                  
                  <div class="feature-item">
                    <div class="feature-title">👥 Team Collaboration</div>
                    <div class="feature-desc">Invite team members, set roles, and work together seamlessly on any production.</div>
                  </div>
                </div>

                <img src="${siteUrl}/uploads/mobile-mockups-v2.png" alt="Cuer on mobile devices" class="mockup-image" style="display: block; margin: 20px auto;" />

                <h2>⭐ Premium Features Available <span class="asterisk">*</span></h2>
                
                <div class="feature-grid">
                  <div class="feature-item">
                    <div class="feature-title">🎬 Teleprompter Mode <span class="asterisk">*</span></div>
                    <div class="feature-desc">Full-screen teleprompter with speed controls and professional formatting options.</div>
                  </div>
                  
                  <div class="feature-item">
                    <div class="feature-title">📺 AD View Dashboard <span class="asterisk">*</span></div>
                    <div class="feature-desc">Dedicated Assistant Director view with live timing and comprehensive show control.</div>
                  </div>
                  
                  <div class="feature-item">
                    <div class="feature-title">🤖 AI Assistant <span class="asterisk">*</span></div>
                    <div class="feature-desc">Intelligent rundown analysis, content suggestions, and timing optimization powered by AI.</div>
                  </div>
                </div>

                <img src="${siteUrl}/uploads/d4e97f8e-fc43-4829-9671-f784ebd3ce47.png" alt="Cuer AI Assistant" class="mockup-image" style="display: block; margin: 20px auto;" />

                <div class="paid-note">
                  <span class="asterisk">*</span> These premium features are available with paid subscription plans. <a href="${siteUrl}/subscription" style="color: #92400e !important; text-decoration: underline;">View pricing plans</a>
                </div>

                <div class="pricing-section">
                  <h3 style="margin-top: 0;">Ready to unlock the full power of Cuer Live?</h3>
                  <p style="margin-bottom: 15px;">Choose from flexible subscription plans designed for teams of every size:</p>
                  <ul style="margin: 10px 0 15px 20px; color: #4b5563 !important;">
                    <li><strong>Pro:</strong> Perfect for small teams and independent creators</li>
                    <li><strong>Premium:</strong> Advanced features for growing production teams</li>
                    <li><strong>Enterprise:</strong> Custom solutions for large organizations</li>
                  </ul>
                  <div class="button-container">
                    <a href="${siteUrl}/subscription" class="button">View Pricing Plans</a>
                  </div>
                </div>

                <h2>🆘 Need Help Getting Started?</h2>
                <p>Our team is here to support you every step of the way:</p>
                <ul style="margin: 10px 0 15px 20px; color: #333333 !important;">
                  <li><strong>Help Center:</strong> <a href="${siteUrl}/help">Visit our comprehensive help page</a></li>
                  <li><strong>Direct Support:</strong> Email us at <a href="mailto:help@cuer.live">help@cuer.live</a></li>
                  <li><strong>Quick Start:</strong> <a href="${siteUrl}/dashboard">Jump right into your dashboard</a></li>
                </ul>

                <div class="button-container" style="margin-top: 30px;">
                  <a href="${siteUrl}/dashboard" class="button">Get Started Now</a>
                </div>
                
                <p style="text-align: center; font-size: 14px; color: #6b7280 !important; margin-top: 25px;">
                  Ready to transform your broadcast production workflow?<br>
                  Your team is going to love working with Cuer Live.
                </p>
              </div>
              
              <div class="footer">
                <p>Welcome to the future of broadcast rundown management.</p>
                <p style="margin-top: 10px;">
                  <a href="https://cuer.live" style="color: #3b82f6 !important;">Visit Cuer Live</a> |
                  <a href="mailto:help@cuer.live" style="color: #3b82f6 !important;">Contact Support</a>
                </p>
              </div>
            </div>
          </body>
        </html>
      `
    })

    console.log('Welcome email sent successfully:', emailResult)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Welcome email sent successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error sending welcome email:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to send welcome email', details: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})