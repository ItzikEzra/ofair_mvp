-- Drop the existing policy and create a new one that supports both auth types
DROP POLICY IF EXISTS "allow_professional_access_referrals" ON public.referrals;

-- Create updated policy that supports both regular auth and OTP tokens
CREATE POLICY "allow_professional_access_referrals" ON public.referrals
FOR ALL
USING (
  -- Standard auth users
  (professional_id IN (
    SELECT id FROM public.professionals 
    WHERE user_id = auth.uid()
  ))
  OR
  -- OTP token users
  (professional_id IN (
    SELECT at.professional_id 
    FROM public.auth_tokens at
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
    AND at.is_active = true
  ))
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
    SELECT at.professional_id 
    FROM public.auth_tokens at
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
    AND at.is_active = true
  ))
);