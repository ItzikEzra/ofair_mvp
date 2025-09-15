
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  try {
    console.log('[test-019-api] Function invoked.');
    if (req.method === 'OPTIONS') {
      console.log('[test-019-api] Handling OPTIONS request.');
      return new Response('ok', { headers: corsHeaders });
    }

    // --- Environment Variable Check ---
    console.log('[test-019-api] --- Checking Environment Variables ---');
    const apiToken = Deno.env.get('SMS_019_API_TOKEN');
    const appId = Deno.env.get('SMS_019_APP_ID');
    const username = Deno.env.get('SMS_019_USERNAME');
    const senderNumber = Deno.env.get('SMS_019_SENDER_NUMBER');

    if (!apiToken || !appId || !username || !senderNumber) {
      const error = 'Missing one or more required environment variables: SMS_019_API_TOKEN, SMS_019_APP_ID, SMS_019_USERNAME, SMS_019_SENDER_NUMBER';
      console.error(`[test-019-api] FATAL: ${error}`);
      return new Response(JSON.stringify({ error }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    console.log('[test-019-api] --- Environment Variables OK ---');
    console.log(`[test-019-api] App ID: ${appId}, Username: ${username}, Sender Number: ${senderNumber}`);

    const { phone } = await req.json();
    if (!phone) {
        return new Response(JSON.stringify({ error: 'Phone number is required' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
    console.log(`[test-019-api] Received request for phone: ${phone}`);

    // According to documentation, phone can be 5xxxxxxx or 05xxxxxxx
    // Keep the original format
    const phoneFor019 = phone;
    console.log(`[test-019-api] Phone number for 019 API: ${phoneFor019}`);

    // XML format according to documentation with <user> block
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<send_otp>
  <user>
    <username>${username}</username>
  </user>
  <phone>${phoneFor019}</phone>
  <source>${senderNumber}</source>
  <max_tries>3</max_tries>
  <text>קוד בדיקה מאפליקציית עופר: [code]</text>
</send_otp>`;

    const requestHeaders = { 
      'Content-Type': 'application/xml; charset=utf-8',
      'Authorization': `Bearer ${apiToken}`
    };

    console.log('[test-019-api] Preparing to send request to 019 SMS API.');
    console.log(`[test-019-api] Request URL: https://019sms.co.il/api`);
    console.log(`[test-019-api] Request Headers: ${JSON.stringify(requestHeaders, null, 2)}`);
    console.log(`[test-019-api] Request Body (XML): ${xml}`);

    const smsResponse = await fetch('https://019sms.co.il/api', {
      method: 'POST',
      headers: requestHeaders,
      body: xml,
    });

    const responseText = await smsResponse.text();
    console.log(`[test-019-api] Received response from 019 SMS API. Status: ${smsResponse.status}`);
    console.log(`[test-019-api] 019 SMS API Response Body: ${responseText}`);

    return new Response(JSON.stringify({
        status: smsResponse.status,
        statusText: smsResponse.statusText,
        body: responseText,
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    });

  } catch (error) {
    console.error('[test-019-api] CRITICAL: Unexpected error:', error.message, error.stack);
    const errorDetails = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) };
    return new Response(JSON.stringify({ error: 'Internal server error', details: errorDetails }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
    });
  }
})
