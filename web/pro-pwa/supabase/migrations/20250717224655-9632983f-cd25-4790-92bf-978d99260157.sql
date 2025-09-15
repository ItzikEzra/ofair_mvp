-- First, drop existing policies if they conflict
DROP POLICY IF EXISTS "Professionals can create issues" ON public.issue_reports;
DROP POLICY IF EXISTS "Professionals can view their own issues" ON public.issue_reports;

-- Create a function to check direct auth token
CREATE OR REPLACE FUNCTION public.check_auth_token_for_professional(professional_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token text;
  valid_token boolean;
BEGIN
  -- Get the token from Authorization header (if present)
  token := TRIM(BOTH ' ' FROM REPLACE(
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
    WHERE at.token = token
    AND at.professional_id = professional_id_param
    AND at.expires_at > now()
    AND at.is_active = true
  ) INTO valid_token;
  
  RETURN valid_token;
END;
$$;

-- Create new policies that properly handle OTP tokens
CREATE POLICY "Professionals can create issues" 
ON public.issue_reports 
FOR INSERT 
WITH CHECK (
  professional_id = auth.uid() OR 
  check_auth_token_for_professional(professional_id)
);

CREATE POLICY "Professionals can view their own issues" 
ON public.issue_reports 
FOR SELECT 
USING (
  professional_id = auth.uid() OR 
  check_auth_token_for_professional(professional_id)
);