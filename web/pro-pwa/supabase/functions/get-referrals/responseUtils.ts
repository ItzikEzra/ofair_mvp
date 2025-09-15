
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function createResponse(data: any, status: number = 200): Response {
  return new Response(
    JSON.stringify(data),
    { 
      status, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    }
  );
}

export function createErrorResponse(message: string, details?: any, status: number = 500): Response {
  const errorData = details ? { error: message, details } : { error: message };
  return createResponse(errorData, status);
}

export function createCorsResponse(): Response {
  return new Response(null, { headers: corsHeaders });
}
