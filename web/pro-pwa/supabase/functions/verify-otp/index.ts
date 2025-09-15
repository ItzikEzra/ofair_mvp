
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { normalizePhoneNumber } from '../_shared/phone-utils.ts'
import { validateInputLength, sanitizeInput, addSecurityHeaders, maskSensitiveData } from '../_shared/security.ts'

Deno.serve(async (req) => {
  console.log('[verify-otp] Function invoked.');
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone, otp } = await req.json()
    
    // Input validation and sanitization
    if (!phone || !otp || typeof phone !== 'string' || typeof otp !== 'string') {
      console.error('[verify-otp] Error: Phone and OTP are required and must be strings.');
      return new Response(JSON.stringify({ error: 'Phone and OTP are required' }), {
        headers: addSecurityHeaders({ ...corsHeaders, 'Content-Type': 'application/json' }),
        status: 400,
      })
    }

    // Validate input lengths to prevent attacks
    validateInputLength(phone, 20, 'phone');
    validateInputLength(otp, 10, 'otp');

    // Mask sensitive data in logs
    console.log('[verify-otp] Received verification request for phone:', maskSensitiveData(phone, 2));

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    console.log('[verify-otp] Supabase client created successfully.');
    
    const normalizedNumbers = normalizePhoneNumber(phone)
    if (normalizedNumbers.length === 0) {
      console.error('[verify-otp] Invalid phone number after normalization');
      return new Response(JSON.stringify({ error: 'Invalid phone number' }), {
        headers: addSecurityHeaders({ ...corsHeaders, 'Content-Type': 'application/json' }),
        status: 400,
      })
    }
    const normalizedPhone = normalizedNumbers[0]
    console.log('[verify-otp] Using normalized phone:', maskSensitiveData(normalizedPhone, 2));

    // Check for test phone number with fixed OTP
    if (normalizedPhone === '0545308505') {
      console.log('[verify-otp] Test phone number detected - checking fixed OTP');
      if (otp === '111111') {
        console.log('[verify-otp] Fixed OTP verified successfully, fetching professional data');
        const { data: professional, error: professionalError } = await supabase
          .from('professionals')
          .select('*')
          .eq('phone_number', normalizedPhone)
          .single()

        if (professionalError || !professional) {
          console.error('[verify-otp] Could not find professional data after OTP verification');
          return new Response(JSON.stringify({ error: 'Could not find professional data' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          })
        }

        // Generate auth token
        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 14); // 14 days

        // Save token to database
        const { error: tokenError } = await supabase
          .from('auth_tokens')
          .insert({
            professional_id: professional.id,
            token,
            expires_at: expiresAt.toISOString(),
            device_info: req.headers.get('user-agent') || 'unknown'
          });

        if (tokenError) {
          console.error('[verify-otp] Failed to create auth token:', tokenError);
          return new Response(JSON.stringify({ error: 'Failed to create session' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          });
        }

        console.log('[verify-otp] Auth token created successfully for test user');
        return new Response(JSON.stringify({ 
          professional,
          token,
          expiresAt: expiresAt.toISOString()
        }), {
          headers: addSecurityHeaders({ ...corsHeaders, 'Content-Type': 'application/json' }),
          status: 200,
        })
      } else {
        console.error('[verify-otp] Invalid fixed OTP for test phone number');
        return new Response(JSON.stringify({ error: 'Invalid or expired OTP' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
    }

    const apiToken = Deno.env.get('SMS_019_API_TOKEN');
    if (!apiToken) {
      console.error('[verify-otp] Error: SMS_019_API_TOKEN is not set in environment variables.');
      return new Response(JSON.stringify({ error: 'SMS service authentication is not configured' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
      });
    }
    console.log(`[verify-otp] Successfully loaded SMS_019_API_TOKEN. Length: ${apiToken.length}`);

    const appId = Deno.env.get('SMS_019_APP_ID')
    if (!appId) {
      console.error('[verify-otp] Error: SMS_019_APP_ID is not set in environment variables.')
      return new Response(JSON.stringify({ error: 'SMS service is not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }
    console.log(`[verify-otp] Successfully loaded SMS_019_APP_ID: ${appId}`);

    const username = Deno.env.get('SMS_019_USERNAME')
    if (!username) {
      console.error('[verify-otp] Error: SMS_019_USERNAME is not set in environment variables.')
      return new Response(JSON.stringify({ error: 'SMS service username is not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }
    console.log(`[verify-otp] Successfully loaded SMS_019_USERNAME: ${username}`);

    // XML format according to validate_otp documentation with <user> block
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<validate_otp>
  <user>
    <username>${username}</username>
  </user>
  <phone>${normalizedPhone}</phone>
  <code>${otp}</code>
</validate_otp>`

    const requestHeaders = {
      'Content-Type': 'application/xml; charset=utf-8',
      'Authorization': `Bearer ${apiToken}`
    };

    console.log(`[verify-otp] Preparing to validate OTP for ${normalizedPhone}.`);
    console.log(`[verify-otp] Request URL: https://019sms.co.il/api`);
    console.log(`[verify-otp] Request Headers: ${JSON.stringify(requestHeaders, null, 2)}`);

    const validationResponse = await fetch('https://019sms.co.il/api', {
      method: 'POST',
      headers: requestHeaders,
      body: xml,
    })

    console.log(`[verify-otp] Received response from 019 SMS API. Status: ${validationResponse.status}`);
    const responseText = await validationResponse.text()
    console.log(`[verify-otp] 019 SMS API Validation Response for ${normalizedPhone}: ${responseText}`)

    if (!validationResponse.ok) {
      console.error('Error validating OTP:', validationResponse.status, responseText)
      return new Response(JSON.stringify({ error: 'Invalid or expired OTP', providerResponse: responseText }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Parse the XML response properly
    const statusMatch = responseText.match(/<status>(\d+)<\/status>/)
    const smsStatus = statusMatch ? parseInt(statusMatch[1], 10) : null

    if (smsStatus !== 0) {
      const messageMatch = responseText.match(/<message>(.*?)<\/message>/)
      const smsMessage = messageMatch ? messageMatch[1] : 'Unknown error'
      console.error(`[verify-otp] OTP validation failed. Status: ${smsStatus}. Message: ${smsMessage}`)
      return new Response(JSON.stringify({ error: 'Invalid or expired OTP' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    console.log('[verify-otp] OTP verified successfully, fetching professional data');
    const { data: professional, error: professionalError } = await supabase
      .from('professionals')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .single()

    if (professionalError || !professional) {
      console.error('[verify-otp] Could not find professional data after OTP verification');
      return new Response(JSON.stringify({ error: 'Could not find professional data' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    console.log('[verify-otp] Successfully verified OTP and fetched professional data.');
    
    // Generate auth token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14); // 14 days

    // Save token to database
    const { error: tokenError } = await supabase
      .from('auth_tokens')
      .insert({
        professional_id: professional.id,
        token,
        expires_at: expiresAt.toISOString(),
        device_info: req.headers.get('user-agent') || 'unknown'
      });

    if (tokenError) {
      console.error('[verify-otp] Failed to create auth token:', tokenError);
      return new Response(JSON.stringify({ error: 'Failed to create session' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log('[verify-otp] Auth token created successfully');
    return new Response(JSON.stringify({ 
      professional,
      token,
      expiresAt: expiresAt.toISOString()
    }), {
      headers: addSecurityHeaders({ ...corsHeaders, 'Content-Type': 'application/json' }),
      status: 200,
    })
  } catch (error) {
    console.error('[verify-otp] CRITICAL: Unexpected error in verify-otp function:', error.message);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: addSecurityHeaders({ ...corsHeaders, 'Content-Type': 'application/json' }),
      status: 500,
    })
  }
})
