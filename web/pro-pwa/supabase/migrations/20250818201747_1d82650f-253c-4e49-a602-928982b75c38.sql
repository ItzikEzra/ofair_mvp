-- Continue fixing search path security warnings for remaining functions

-- Update additional functions that need search_path set
CREATE OR REPLACE FUNCTION public.is_admin_safe()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.admin_users 
    WHERE user_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin_safe()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.admin_users 
    WHERE user_id = auth.uid()
    AND is_super_admin = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_check()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin_check()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid() AND is_super_admin = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_internal_user_check()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.internal_crm
    WHERE user_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_internal_super_admin_check()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN public.check_user_is_internal_super_admin(auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.check_internal_email(email_param text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_record record;
BEGIN
  SELECT * INTO user_record 
  FROM public.internal_crm 
  WHERE email = email_param;
  
  IF user_record IS NULL THEN
    RETURN json_build_object('exists', false);
  ELSE
    RETURN json_build_object(
      'exists', true, 
      'id', user_record.id, 
      'email', user_record.email,
      'name', user_record.name,
      'is_super_admin', user_record.is_super_admin
    );
  END IF;
END;
$$;