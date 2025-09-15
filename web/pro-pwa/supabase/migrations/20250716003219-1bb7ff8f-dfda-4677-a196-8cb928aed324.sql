-- Drop the current policy and create a simplified one that matches working policies
DROP POLICY IF EXISTS "allow_professional_access_referrals" ON public.referrals;

-- Create a simpler policy similar to quotes table which already works with OTP
CREATE POLICY "allow_professional_access_referrals" ON public.referrals
FOR ALL
USING (
  -- Standard auth users
  (professional_id IN (
    SELECT id FROM public.professionals 
    WHERE user_id = auth.uid()
  ))
  OR
  -- OTP token users (using the same pattern as quotes table)
  (professional_id IN (
    SELECT auth_tokens.professional_id
    FROM public.auth_tokens
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
  ))
  OR
  -- Fallback for users without session (like service calls)
  ((auth.uid() IS NULL) AND (professional_id IS NOT NULL))
)
WITH CHECK (
  -- Standard auth users
  (professional_id IN (
    SELECT id FROM public.professionals 
    WHERE user_id = auth.uid()
  ))
  OR
  -- OTP token users
  (professional_id IN (
    SELECT auth_tokens.professional_id
    FROM public.auth_tokens
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
  ))
  OR
  -- Fallback for users without session
  ((auth.uid() IS NULL) AND (professional_id IS NOT NULL))
);