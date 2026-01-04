import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, moduleId, certificateId, moduleTitle, userName } = await req.json();

    if (!userId || !moduleId || !certificateId) {
      throw new Error('userId, moduleId, and certificateId are required');
    }

    console.log(`📧 Sending certificate email for user ${userId}, module ${moduleId}`);

    // 1. Get user email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.email) {
      throw new Error('User profile or email not found');
    }

    const userEmail = profile.email;
    const displayName = userName || (profile.first_name && profile.last_name 
      ? `${profile.first_name} ${profile.last_name}` 
      : profile.email);

    console.log(`📧 Sending to: ${userEmail}`);

    // 2. Get certificate file path
    const { data: certificate, error: certError } = await supabaseAdmin
      .from('certificates')
      .select('file_url')
      .eq('id', certificateId)
      .single();

    if (certError || !certificate?.file_url) {
      throw new Error('Certificate not found');
    }

    // 3. Generate signed URL for certificate (valid for 7 days)
    const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
      .from('certificates')
      .createSignedUrl(certificate.file_url, 60 * 60 * 24 * 7); // 7 days

    if (urlError) {
      console.error('Error creating signed URL:', urlError);
      throw new Error('Failed to generate certificate download URL');
    }

    const downloadUrl = signedUrlData.signedUrl;

    // 4. Get email template (try certificate_completed first, then fallback)
    let emailSubject = `🎉 Gratulacje! Twój certyfikat ukończenia szkolenia "${moduleTitle}"`;
    let emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #16a34a; text-align: center;">🎉 Gratulacje!</h1>
        
        <p style="font-size: 16px;">Drogi/Droga <strong>${displayName}</strong>,</p>
        
        <p style="font-size: 16px;">Z wielką przyjemnością informujemy, że pomyślnie ukończyłeś/aś szkolenie:</p>
        
        <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
          <h2 style="color: #166534; margin: 0;">${moduleTitle}</h2>
        </div>
        
        <p style="font-size: 16px;">Twój certyfikat jest gotowy do pobrania. Kliknij poniższy przycisk, aby go pobrać:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${downloadUrl}" 
             style="display: inline-block; background-color: #16a34a; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            📥 Pobierz Certyfikat
          </a>
        </div>
        
        <p style="font-size: 14px; color: #6b7280;">
          Link do pobrania jest ważny przez 7 dni. Po tym czasie możesz pobrać certyfikat 
          bezpośrednio z panelu użytkownika w sekcji Szkolenia.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #6b7280; text-align: center;">
          Dziękujemy za ukończenie szkolenia!<br>
          Zespół Pure Life
        </p>
      </div>
    `;

    // Try to get custom template
    const { data: template } = await supabaseAdmin
      .from('email_templates')
      .select('subject, body_html')
      .eq('internal_name', 'certificate_completed')
      .eq('is_active', true)
      .maybeSingle();

    if (template) {
      emailSubject = template.subject
        .replace('{{module_title}}', moduleTitle)
        .replace('{{user_name}}', displayName);
      emailBody = template.body_html
        .replace(/{{module_title}}/g, moduleTitle)
        .replace(/{{user_name}}/g, displayName)
        .replace(/{{download_url}}/g, downloadUrl);
    }

    // 5. Get SMTP configuration
    const smtpHost = Deno.env.get('SMTP_HOST');
    const smtpPort = Deno.env.get('SMTP_PORT');
    const smtpUsername = Deno.env.get('SMTP_USERNAME');
    const smtpPassword = Deno.env.get('SMTP_PASSWORD');

    if (!smtpHost || !smtpPort || !smtpUsername || !smtpPassword) {
      console.error('SMTP configuration incomplete');
      throw new Error('SMTP configuration not complete');
    }

    // 6. Send email via SMTP
    const emailPayload = {
      from: smtpUsername,
      to: userEmail,
      subject: emailSubject,
      html: emailBody,
    };

    // Use simple fetch to SMTP service or Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (resendApiKey) {
      // Use Resend if available
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Pure Life <onboarding@resend.dev>',
          to: [userEmail],
          subject: emailSubject,
          html: emailBody,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Resend error:', errorText);
        throw new Error(`Failed to send email via Resend: ${errorText}`);
      }

      console.log('✅ Email sent via Resend');
    } else {
      // Fallback to internal send-single-email function
      const { error: sendError } = await supabaseAdmin.functions.invoke('send-single-email', {
        body: {
          to: userEmail,
          subject: emailSubject,
          html: emailBody,
        }
      });

      if (sendError) {
        console.error('send-single-email error:', sendError);
        throw sendError;
      }

      console.log('✅ Email sent via send-single-email');
    }

    // 7. Log the email
    await supabaseAdmin
      .from('email_logs')
      .insert({
        recipient_email: userEmail,
        recipient_user_id: userId,
        subject: emailSubject,
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: { certificateId, moduleId, moduleTitle }
      });

    console.log('✅ Certificate email sent successfully');

    return new Response(JSON.stringify({
      success: true,
      message: 'Certificate email sent successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in send-certificate-email:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
