-- Fix critical security issues in remaining tables (corrected)

-- 1. Fix projects table - restrict to professionals only
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;  
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;

CREATE POLICY "Professionals can insert their own projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (
  professional_id IN (
    SELECT p.id FROM public.professionals p 
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Professionals can update their own projects" 
ON public.projects 
FOR UPDATE 
USING (
  professional_id IN (
    SELECT p.id FROM public.professionals p 
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Professionals can view their own projects" 
ON public.projects 
FOR SELECT 
USING (
  professional_id IN (
    SELECT p.id FROM public.professionals p 
    WHERE p.user_id = auth.uid()
  )
);

-- 2. Fix notifications table - secure client_details access
DROP POLICY IF EXISTS "Allow access to notifications by professional_id" ON public.notifications;
DROP POLICY IF EXISTS "Allow delete notifications by professional_id" ON public.notifications;
DROP POLICY IF EXISTS "Allow update notifications by professional_id" ON public.notifications;
DROP POLICY IF EXISTS "Can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Enable read access for own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Enable update for own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Professional can read notifications" ON public.notifications;

-- Secure notifications access
CREATE POLICY "Professionals can view their own notifications"
ON public.notifications
FOR SELECT
USING (
  professional_id IN (
    SELECT p.id FROM public.professionals p 
    WHERE p.user_id = auth.uid()
  ) OR
  professional_id IN (
    SELECT at.professional_id FROM public.auth_tokens at
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
  )
);

CREATE POLICY "Professionals can update their own notifications"
ON public.notifications
FOR UPDATE
USING (
  professional_id IN (
    SELECT p.id FROM public.professionals p 
    WHERE p.user_id = auth.uid()
  ) OR
  professional_id IN (
    SELECT at.professional_id FROM public.auth_tokens at
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
  )
);

CREATE POLICY "Professionals can delete their own notifications"
ON public.notifications
FOR DELETE
USING (
  professional_id IN (
    SELECT p.id FROM public.professionals p 
    WHERE p.user_id = auth.uid()
  ) OR
  professional_id IN (
    SELECT at.professional_id FROM public.auth_tokens at
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
  )
);

-- 3. Secure professional_ratings - remove update access for non-admins
DROP POLICY IF EXISTS "Users can update their own ratings" ON public.professional_ratings;

-- Only admins can update ratings to prevent manipulation
CREATE POLICY "Only admins can update ratings"
ON public.professional_ratings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- 4. Add security logging for sensitive operations
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accessor_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on security audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
ON public.security_audit_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Service role can insert audit logs
CREATE POLICY "Service role can insert audit logs"
ON public.security_audit_log
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- 5. Create secure function for customer data access auditing
CREATE OR REPLACE FUNCTION public.audit_customer_data_access(
  accessor_id uuid,
  access_type text,
  table_name text,
  record_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    accessor_id, 
    action, 
    table_name, 
    record_id
  ) VALUES (
    accessor_id,
    'customer_data_access_' || access_type,
    table_name,
    record_id
  );
END;
$$;