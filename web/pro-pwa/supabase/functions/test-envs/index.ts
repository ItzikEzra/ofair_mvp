
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  try {
    console.log("[test-envs] Function invoked");
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    // קריאת כל environment variables הקריטיים
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const apiToken = Deno.env.get('SMS_019_API_TOKEN');
    const appId = Deno.env.get('SMS_019_APP_ID');
    const senderNumber = Deno.env.get('SMS_019_SENDER_NUMBER');

    // הדפסה ללוגים
    console.log("[test-envs] SUPABASE_URL:", !!supabaseUrl ? "SET" : "MISSING");
    console.log("[test-envs] SUPABASE_SERVICE_ROLE_KEY:", !!supabaseServiceKey ? "SET" : "MISSING");
    console.log("[test-envs] SMS_019_API_TOKEN:", !!apiToken ? `SET (length ${apiToken?.length})` : "MISSING");
    console.log("[test-envs] SMS_019_APP_ID:", !!appId ? `SET (${appId})` : "MISSING");
    console.log("[test-envs] SMS_019_SENDER_NUMBER:", !!senderNumber ? `SET (${senderNumber})` : "MISSING");

    // החזרת ערכים (לטסט בלבד – אל תשאירו לפרודקשן)
    return new Response(
      JSON.stringify({
        SUPABASE_URL: !!supabaseUrl,
        SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceKey,
        SMS_019_API_TOKEN: !!apiToken,
        SMS_019_APP_ID: !!appId,
        SMS_019_SENDER_NUMBER: !!senderNumber,
        SMS_019_API_TOKEN_LENGTH: apiToken?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error("[test-envs] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
