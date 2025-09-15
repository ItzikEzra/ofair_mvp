-- Fix RLS policies for professionals table
-- Remove duplicate policies and create comprehensive ones

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Professionals access own complete data" ON public.professionals;
DROP POLICY IF EXISTS "Professionals can access own complete data" ON public.professionals;
DROP POLICY IF EXISTS "Professionals can update own profile" ON public.professionals;

-- Create unified policies that support both auth types
CREATE POLICY "Professionals can view own complete data" ON public.professionals
FOR SELECT USING (
  (auth.uid() = user_id) OR 
  (id IN (
    SELECT professional_id FROM auth_tokens 
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
  ))
);

CREATE POLICY "Professionals can update own complete data" ON public.professionals
FOR UPDATE USING (
  (auth.uid() = user_id) OR 
  (id IN (
    SELECT professional_id FROM auth_tokens 
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
  ))
) WITH CHECK (
  (auth.uid() = user_id) OR 
  (id IN (
    SELECT professional_id FROM auth_tokens 
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
  ))
);

-- Fix notifications policies to ensure proper access
DROP POLICY IF EXISTS "Professional can insert notifications" ON public.notifications;

CREATE POLICY "Professionals can manage own notifications" ON public.notifications
FOR ALL USING (
  (professional_id IN (
    SELECT p.id FROM professionals p WHERE p.user_id = auth.uid()
  )) OR 
  (professional_id IN (
    SELECT at.professional_id FROM auth_tokens at
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
) WITH CHECK (
  (professional_id IN (
    SELECT p.id FROM professionals p WHERE p.user_id = auth.uid()
  )) OR 
  (professional_id IN (
    SELECT at.professional_id FROM auth_tokens at
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