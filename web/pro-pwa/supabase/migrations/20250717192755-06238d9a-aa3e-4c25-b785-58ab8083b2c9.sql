-- Drop existing policies for issue_reports
DROP POLICY IF EXISTS "Professionals can view their own issues" ON public.issue_reports;
DROP POLICY IF EXISTS "Professionals can create issues" ON public.issue_reports;
DROP POLICY IF EXISTS "Admins can view all issues" ON public.issue_reports;
DROP POLICY IF EXISTS "Admins can update issues" ON public.issue_reports;

-- Create updated policies that support both regular auth and OTP tokens
CREATE POLICY "Professionals can view their own issues" ON public.issue_reports
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

CREATE POLICY "Professionals can create issues" ON public.issue_reports
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

-- Admin policies remain the same since they use supabase auth
CREATE POLICY "Admins can view all issues" ON public.issue_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can update issues" ON public.issue_reports
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);