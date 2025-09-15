-- Fix RLS policies to work with OTP authentication via custom tokens
-- This addresses the issue where OTP users (who don't have auth.uid()) can't upload certificates

-- Drop the current policies that only work with Supabase auth
DROP POLICY IF EXISTS "Professionals can insert their own certificates" ON public.professional_certificates;
DROP POLICY IF EXISTS "Professionals can view their own certificates" ON public.professional_certificates;
DROP POLICY IF EXISTS "Professionals can update their own certificates" ON public.professional_certificates;
DROP POLICY IF EXISTS "Professionals can delete their own certificates" ON public.professional_certificates;

-- Create a helper function to get professional ID from either auth method
CREATE OR REPLACE FUNCTION public.get_current_professional_id_secure()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- First try Supabase auth (for email/password users)
  SELECT id FROM public.professionals 
  WHERE user_id = auth.uid()
  
  UNION
  
  -- Then try custom auth tokens (for OTP users)
  -- Get the authorization header and extract the token
  SELECT p.id 
  FROM public.professionals p
  JOIN public.auth_tokens at ON at.professional_id = p.id
  WHERE at.token = TRIM(BOTH ' ' FROM REPLACE(
    COALESCE(
      current_setting('request.headers.authorization', true),
      current_setting('request.header.authorization', true),
      ''
    ), 
    'Bearer ', 
    ''
  ))
  AND at.expires_at > now()
  
  LIMIT 1;
$$;

-- Create new secure policies that work with both auth methods
CREATE POLICY "Professionals can view their own certificates" 
ON public.professional_certificates 
FOR SELECT 
USING (professional_id = public.get_current_professional_id_secure());

CREATE POLICY "Professionals can insert their own certificates" 
ON public.professional_certificates 
FOR INSERT 
WITH CHECK (professional_id = public.get_current_professional_id_secure());

CREATE POLICY "Professionals can update their own certificates" 
ON public.professional_certificates 
FOR UPDATE 
USING (professional_id = public.get_current_professional_id_secure());

CREATE POLICY "Professionals can delete their own certificates" 
ON public.professional_certificates 
FOR DELETE 
USING (professional_id = public.get_current_professional_id_secure());

-- Also create a helper function to validate tokens (for use in other contexts)
CREATE OR REPLACE FUNCTION public.validate_professional_token(token_param TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id 
  FROM public.professionals p
  JOIN public.auth_tokens at ON at.professional_id = p.id
  WHERE at.token = token_param
  AND at.expires_at > now()
  LIMIT 1;
$$;