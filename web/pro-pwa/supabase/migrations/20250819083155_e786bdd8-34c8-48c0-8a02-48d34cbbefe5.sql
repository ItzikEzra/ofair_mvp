-- CRITICAL SECURITY FIX: Remove public access to professional certificates
-- This prevents competitors from stealing professional certificates

-- Drop all existing dangerous policies that allow unauthenticated access
DROP POLICY IF EXISTS "Allow authenticated professionals to view certificates" ON public.professional_certificates;
DROP POLICY IF EXISTS "Allow authenticated professionals to insert certificates" ON public.professional_certificates;
DROP POLICY IF EXISTS "Allow authenticated professionals to update certificates" ON public.professional_certificates;
DROP POLICY IF EXISTS "Allow authenticated professionals to delete certificates" ON public.professional_certificates;

-- Create secure policies that ONLY allow professional owners to access their certificates
CREATE POLICY "Professionals can view their own certificates" 
ON public.professional_certificates 
FOR SELECT 
USING (
  professional_id IN (
    SELECT id FROM public.professionals 
    WHERE user_id = auth.uid()
  ) OR 
  professional_id IN (
    SELECT auth_tokens.professional_id
    FROM auth_tokens
    WHERE auth_tokens.token = TRIM(BOTH ' ' FROM REPLACE(
      COALESCE(
        current_setting('request.headers.authorization', true),
        current_setting('request.header.authorization', true),
        ''
      ), 
      'Bearer ', 
      ''
    ))
    AND auth_tokens.expires_at > now()
    AND auth_tokens.is_active = true
  )
);

CREATE POLICY "Professionals can insert their own certificates" 
ON public.professional_certificates 
FOR INSERT 
WITH CHECK (
  professional_id IN (
    SELECT id FROM public.professionals 
    WHERE user_id = auth.uid()
  ) OR 
  professional_id IN (
    SELECT auth_tokens.professional_id
    FROM auth_tokens
    WHERE auth_tokens.token = TRIM(BOTH ' ' FROM REPLACE(
      COALESCE(
        current_setting('request.headers.authorization', true),
        current_setting('request.header.authorization', true),
        ''
      ), 
      'Bearer ', 
      ''
    ))
    AND auth_tokens.expires_at > now()
    AND auth_tokens.is_active = true
  )
);

CREATE POLICY "Professionals can update their own certificates" 
ON public.professional_certificates 
FOR UPDATE 
USING (
  professional_id IN (
    SELECT id FROM public.professionals 
    WHERE user_id = auth.uid()
  ) OR 
  professional_id IN (
    SELECT auth_tokens.professional_id
    FROM auth_tokens
    WHERE auth_tokens.token = TRIM(BOTH ' ' FROM REPLACE(
      COALESCE(
        current_setting('request.headers.authorization', true),
        current_setting('request.header.authorization', true),
        ''
      ), 
      'Bearer ', 
      ''
    ))
    AND auth_tokens.expires_at > now()
    AND auth_tokens.is_active = true
  )
);

CREATE POLICY "Professionals can delete their own certificates" 
ON public.professional_certificates 
FOR DELETE 
USING (
  professional_id IN (
    SELECT id FROM public.professionals 
    WHERE user_id = auth.uid()
  ) OR 
  professional_id IN (
    SELECT auth_tokens.professional_id
    FROM auth_tokens
    WHERE auth_tokens.token = TRIM(BOTH ' ' FROM REPLACE(
      COALESCE(
        current_setting('request.headers.authorization', true),
        current_setting('request.header.authorization', true),
        ''
      ), 
      'Bearer ', 
      ''
    ))
    AND auth_tokens.expires_at > now()
    AND auth_tokens.is_active = true
  )
);

-- Administrators can view all certificates for moderation
CREATE POLICY "Administrators can view all certificates" 
ON public.professional_certificates 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Service role retains full access for system operations
CREATE POLICY "Service role full access" 
ON public.professional_certificates 
FOR ALL 
USING (auth.role() = 'service_role');

-- Add security comment
COMMENT ON TABLE public.professional_certificates IS 'Secure table for professional certificates - access restricted to certificate owners and administrators only';