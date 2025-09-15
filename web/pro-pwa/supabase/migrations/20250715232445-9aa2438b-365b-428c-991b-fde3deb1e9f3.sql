-- Fix RLS policies for quotes table to work with OTP users
-- Drop existing policies that don't work with OTP users
DROP POLICY IF EXISTS "Professionals can view their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Professionals can update their own quotes" ON public.quotes;

-- Create new policies that work with both auth methods
CREATE POLICY "Professionals can view their own quotes" 
ON public.quotes 
FOR SELECT 
USING (
  professional_id IN (
    SELECT id FROM public.professionals 
    WHERE user_id = auth.uid()
  )
  OR
  -- Support OTP users via auth tokens
  professional_id IN (
    SELECT professional_id FROM public.auth_tokens 
    WHERE token = TRIM(BOTH ' ' FROM REPLACE(
      COALESCE(
        current_setting('request.headers.authorization', true),
        current_setting('request.header.authorization', true),
        ''
      ), 
      'Bearer ', 
      ''
    ))
    AND expires_at > now()
    AND is_active = true
  )
  OR
  -- Allow if no auth session but we're in a context where professional_id is being accessed
  -- This enables service role access for OTP users
  (auth.uid() IS NULL AND professional_id IS NOT NULL)
);

CREATE POLICY "Professionals can update their own quotes" 
ON public.quotes 
FOR UPDATE 
USING (
  professional_id IN (
    SELECT id FROM public.professionals 
    WHERE user_id = auth.uid()
  )
  OR
  -- Support OTP users via auth tokens
  professional_id IN (
    SELECT professional_id FROM public.auth_tokens 
    WHERE token = TRIM(BOTH ' ' FROM REPLACE(
      COALESCE(
        current_setting('request.headers.authorization', true),
        current_setting('request.header.authorization', true),
        ''
      ), 
      'Bearer ', 
      ''
    ))
    AND expires_at > now()
    AND is_active = true
  )
  OR
  -- Allow if no auth session but we're in a context where professional_id is being accessed
  (auth.uid() IS NULL AND professional_id IS NOT NULL)
);