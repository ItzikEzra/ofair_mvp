import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { normalizePhoneNumber } from '../_shared/phone-utils.ts'

Deno.serve(async (req) => {
  // This top-level try-catch is to ensure we always return a valid response, even on unexpected errors.
  try {
    console.log('[send-otp] Function invoked.');
    if (req.method === 'OPTIONS') {
      console.log('[send-otp] Handling OPTIONS request.');
      return new Response('ok', { headers: corsHeaders })
    }

    // --- Environment Variable Check ---
    console.log('[send-otp] --- Checking Environment Variables ---');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const apiToken = Deno.env.get('SMS_019_API_TOKEN');
    const appId = Deno.env.get('SMS_019_APP_ID');
    const username = Deno.env.get('SMS_019_USERNAME');
    const senderNumber = Deno.env.get('SMS_019_SENDER_NUMBER');

    let allVarsOk = true;
    if (!supabaseUrl) { console.error('[send-otp] FATAL: SUPABASE_URL not set.'); allVarsOk = false; } else { console.log('[send-otp] SUPABASE_URL: Loaded.'); }
    if (!supabaseServiceKey) { console.error('[send-otp] FATAL: SUPABASE_SERVICE_ROLE_KEY not set.'); allVarsOk = false; } else { console.log('[send-otp] SUPABASE_SERVICE_ROLE_KEY: Loaded.'); }
    if (!apiToken) { console.error('[send-otp] FATAL: SMS_019_API_TOKEN not set.'); allVarsOk = false; } else { console.log('[send-otp] SMS_019_API_TOKEN: Loaded.'); }
    if (!appId) { console.error('[send-otp] FATAL: SMS_019_APP_ID not set.'); allVarsOk = false; } else { console.log('[send-otp] SMS_019_APP_ID: Loaded.'); }
    if (!username) { console.error('[send-otp] FATAL: SMS_019_USERNAME not set.'); allVarsOk = false; } else { console.log('[send-otp] SMS_019_USERNAME: Loaded.'); }
    if (!senderNumber) { console.error('[send-otp] FATAL: SMS_019_SENDER_NUMBER not set.'); allVarsOk = false; } else { console.log('[send-otp] SMS_019_SENDER_NUMBER: Loaded.'); }
    
    if (!allVarsOk) {
      console.error('[send-otp] Aborting due to missing environment variables.');
      return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    console.log('[send-otp] --- Environment Variables OK ---');
    // --- End Environment Variable Check ---

    const { phone } = await req.json()
    
    // Input validation and sanitization
    if (!phone || typeof phone !== 'string') {
      console.error('[send-otp] Error: Phone number is required and must be a string.');
      return new Response(JSON.stringify({ error: 'Phone number is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Validate phone length to prevent attacks
    if (phone.length > 20) {
      console.error('[send-otp] Error: Phone number too long.');
      return new Response(JSON.stringify({ error: 'Invalid phone number format' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Mask phone number in logs for security
    console.log('[send-otp] Received request for phone:', phone.replace(/\d/g, '*'));

    console.log('[send-otp] Creating Supabase client...');
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    console.log('[send-otp] Supabase client created successfully.');

    const normalizedNumbers = normalizePhoneNumber(phone)
    if (normalizedNumbers.length === 0) {
      console.error('[send-otp] Invalid phone number after normalization');
      return new Response(JSON.stringify({ error: 'Invalid phone number' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }
    const normalizedPhone = normalizedNumbers[0]
    console.log('[send-otp] Using normalized phone:', normalizedPhone.replace(/\d/g, '*'));

    console.log('[send-otp] Searching for professional...');
    const { data: professional, error: professionalError } = await supabase
      .from('professionals')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .single()

    if (professionalError || !professional) {
      console.error('[send-otp] Professional not found');
      return new Response(JSON.stringify({ error: 'Professional not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }
    console.log('[send-otp] Found professional with ID:', professional.id);
    
    // Check for test phone number - skip SMS for this specific number
    if (normalizedPhone === '0545308505') {
      console.log('[send-otp] Test phone number detected - skipping SMS sending');
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }
    
    // According to documentation, phone can be 5xxxxxxx or 05xxxxxxx
    // Keep the original normalized format
    const phoneFor019 = normalizedPhone;
    console.log('[send-otp] Preparing SMS request');

    // XML format according to documentation with <user> block
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<send_otp>
  <user>
    <username>${username}</username>
  </user>
  <phone>${phoneFor019}</phone>
  <source>${senderNumber}</source>
  <max_tries>3</max_tries>
  <text>הקוד שלך לכניסה ל-אפליקציית עופר הוא: [code]</text>
</send_otp>`
    
    const requestHeaders = { 
      'Content-Type': 'application/xml; charset=utf-8',
      'Authorization': `Bearer ${apiToken}`
    };

    console.log('[send-otp] Sending request to 019 SMS API.');

    const smsResponse = await fetch('https://019sms.co.il/api', {
      method: 'POST',
      headers: requestHeaders,
      body: xml,
    })

    console.log(`[send-otp] Received response from 019 SMS API. Status: ${smsResponse.status}`);
    const responseText = await smsResponse.text();
    
    // DO NOT LOG FULL RESPONSE - may contain OTP code
    console.log('[send-otp] 019 SMS API Response received');

    if (!smsResponse.ok) {
      console.error('Error sending SMS:', smsResponse.status)
      return new Response(JSON.stringify({ error: 'Failed to send SMS' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }
    
    // Parse the XML response properly
    const statusMatch = responseText.match(/<status>(\d+)<\/status>/)
    const smsStatus = statusMatch ? parseInt(statusMatch[1], 10) : null
    
    if (smsStatus !== 0) {
      const messageMatch = responseText.match(/<message>(.*?)<\/message>/)
      const smsMessage = messageMatch ? messageMatch[1] : 'Unknown error'
      console.error(`SMS provider returned error. Status: ${smsStatus}`)
      return new Response(JSON.stringify({ error: 'Failed to send SMS' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // SMS sent successfully - DO NOT LOG OTP CODE FOR SECURITY
    console.log('[send-otp] SMS sent successfully');

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('[send-otp] CRITICAL: Unexpected error in send-otp function:', error.message);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
