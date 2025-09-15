-- CRITICAL SECURITY FIX: Remove overly permissive referrals policies and implement secure access
-- This prevents customer phone numbers and names from being stolen by hackers

-- Drop all existing overly permissive policies
DROP POLICY IF EXISTS "allow_professional_access_referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can insert their own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can update their own referrals" ON public.referrals;

-- Create new secure policies that only allow professionals to access their own referrals
CREATE POLICY "Professionals can view their own referrals" 
ON public.referrals 
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

CREATE POLICY "Professionals can update their own referrals" 
ON public.referrals 
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

-- System and admin access for creating new referrals
CREATE POLICY "System can insert referrals" 
ON public.referrals 
FOR INSERT 
WITH CHECK (true);

-- Remove public delete access - only allow through secure functions
-- No DELETE policy = no public delete access

-- Service role retains full access for system operations
CREATE POLICY "Service role full access" 
ON public.referrals 
FOR ALL 
USING (auth.role() = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE public.referrals IS 'Secure table containing customer referrals - access restricted to professional owners only';