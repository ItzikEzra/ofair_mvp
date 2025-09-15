-- Update work_completions policies to support OTP authentication
DROP POLICY IF EXISTS "Professionals can insert their own work completions" ON public.work_completions;
DROP POLICY IF EXISTS "Professionals can update their own work completions" ON public.work_completions;
DROP POLICY IF EXISTS "Professionals can view their own work completions" ON public.work_completions;

-- Create updated policies that support both regular auth and OTP tokens
CREATE POLICY "Professionals can insert their own work completions" ON public.work_completions
FOR INSERT
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

CREATE POLICY "Professionals can update their own work completions" ON public.work_completions
FOR UPDATE
USING (
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

CREATE POLICY "Professionals can view their own work completions" ON public.work_completions
FOR SELECT
USING (
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