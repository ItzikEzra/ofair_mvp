-- Update the get_current_professional_id_secure function to handle OTP tokens correctly
CREATE OR REPLACE FUNCTION public.get_current_professional_id_secure(token_param text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- First try custom auth tokens (for OTP users) - check parameter first, then header
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
  
  UNION
  
  -- Then try Supabase auth (for email/password users) - only if no token parameter provided
  SELECT id FROM public.professionals 
  WHERE user_id = auth.uid() AND token_param IS NULL
  
  LIMIT 1;
$function$