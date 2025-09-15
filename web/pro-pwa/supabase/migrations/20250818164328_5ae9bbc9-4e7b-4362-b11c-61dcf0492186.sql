-- Fix remaining search path security warnings in database functions
-- Update all functions to have proper search_path set

-- Update check_auth_token_for_professional function
CREATE OR REPLACE FUNCTION public.check_auth_token_for_professional(professional_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  auth_token text;
  valid_token boolean;
BEGIN
  -- Get the token from Authorization header (if present)
  auth_token := TRIM(BOTH ' ' FROM REPLACE(
    COALESCE(
      current_setting('request.headers.authorization', true),
      current_setting('request.header.authorization', true),
      ''
    ), 
    'Bearer ', 
    ''
  ));
  
  -- Check if token is valid for this professional
  SELECT EXISTS (
    SELECT 1 
    FROM public.auth_tokens at
    WHERE at.token = auth_token
    AND at.professional_id = professional_id_param
    AND at.expires_at > now()
    AND at.is_active = true
  ) INTO valid_token;
  
  RETURN valid_token;
END;
$$;

-- Update get_professional_by_identifier function
CREATE OR REPLACE FUNCTION public.get_professional_by_identifier(identifier_param text, is_email_param boolean)
RETURNS TABLE(id uuid, user_id uuid, name text, phone_number text, email text, profession text, location text, specialties text[], image text, about text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF is_email_param THEN
    RETURN QUERY
    SELECT p.id, p.user_id, p.name, p.phone_number, p.email, 
           p.profession, p.location, p.specialties, p.image, p.about 
    FROM public.professionals p
    WHERE p.email = identifier_param
    LIMIT 1;
  ELSE
    RETURN QUERY
    SELECT p.id, p.user_id, p.name, p.phone_number, p.email, 
           p.profession, p.location, p.specialties, p.image, p.about
    FROM public.professionals p
    WHERE p.phone_number = identifier_param
    LIMIT 1;
  END IF;
END;
$$;

-- Update check_user_is_admin function
CREATE OR REPLACE FUNCTION public.check_user_is_admin(user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Direct query bypassing RLS to avoid recursion
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = user_id_param
  );
END;
$$;

-- Update check_user_is_super_admin function
CREATE OR REPLACE FUNCTION public.check_user_is_super_admin(user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Direct query bypassing RLS to avoid recursion
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = user_id_param AND is_super_admin = true
  );
END;
$$;

-- Update check_user_is_internal_super_admin function
CREATE OR REPLACE FUNCTION public.check_user_is_internal_super_admin(user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Direct query bypassing RLS to avoid recursion
  RETURN EXISTS (
    SELECT 1 FROM public.internal_crm
    WHERE user_id = user_id_param AND is_super_admin = true
  );
END;
$$;