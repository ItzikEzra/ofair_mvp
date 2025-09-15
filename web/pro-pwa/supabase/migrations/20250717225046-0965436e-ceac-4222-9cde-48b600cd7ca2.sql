-- Fix the ambiguous token column reference in the function
DROP FUNCTION IF EXISTS public.check_auth_token_for_professional(uuid);

CREATE OR REPLACE FUNCTION public.check_auth_token_for_professional(professional_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auth_token text;
  valid_token boolean;
BEGIN
  -- Get the token from Authorization header (if present)
  auth_token := TRIM(BOTH ' ' FROM REPLACE(
    COALESCE(
      current_setting('request.headers.authorization', true),
      current_setting('request.header.authorization', true),
      ''
    ), 
    'Bearer ', 
    ''
  ));
  
  -- Check if token is valid for this professional
  SELECT EXISTS (
    SELECT 1 
    FROM public.auth_tokens at
    WHERE at.token = auth_token
    AND at.professional_id = professional_id_param
    AND at.expires_at > now()
    AND at.is_active = true
  ) INTO valid_token;
  
  RETURN valid_token;
END;
$$;