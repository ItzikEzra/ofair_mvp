-- Fix get_current_professional_id_secure to use only custom auth tokens
CREATE OR REPLACE FUNCTION public.get_current_professional_id_secure(token_param text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Use only custom auth tokens (for OTP users) - check parameter first, then header
  SELECT p.id 
  FROM public.professionals p
  JOIN public.auth_tokens at ON at.professional_id = p.id
  WHERE at.token = COALESCE(
    token_param,
    TRIM(BOTH ' ' FROM REPLACE(
      COALESCE(
        current_setting('request.headers.authorization', true),
        current_setting('request.header.authorization', true),
        ''
      ), 
      'Bearer ', 
      ''
    ))
  )
  AND at.expires_at > now()
  AND at.is_active = true
  LIMIT 1;
$function$