-- Fix remaining security functions with missing search_path settings
-- This prevents search path attacks on database functions

-- Update all remaining security definer functions to have proper search_path
CREATE OR REPLACE FUNCTION public.check_admin_status(user_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = user_id_param
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_super_admin_status(user_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = user_id_param AND is_super_admin = true
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_auth_token_for_professional(professional_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.is_admin_safe()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.admin_users 
    WHERE user_id = auth.uid()
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_professional_by_identifier(identifier_param text, is_email_param boolean)
 RETURNS TABLE(id uuid, user_id uuid, name text, phone_number text, email text, profession text, location text, specialties text[], image text, about text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.check_professional_ownership(professional_id_param uuid, user_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.professionals
    WHERE id = professional_id_param AND user_id = user_id_param
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_input_length(input_text text, max_length integer, field_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF input_text IS NULL THEN
    RETURN true;
  END IF;
  
  IF length(input_text) > max_length THEN
    RAISE EXCEPTION 'Field % exceeds maximum length of % characters', field_name, max_length;
  END IF;
  
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sanitize_phone_number(phone_input text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sanitized_phone text;
BEGIN
  IF phone_input IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove all non-digit characters
  sanitized_phone := regexp_replace(phone_input, '[^0-9]', '', 'g');
  
  -- Validate Israeli phone number format
  IF NOT (sanitized_phone ~ '^0[2-9][0-9]{7,8}$' OR sanitized_phone ~ '^[2-9][0-9]{7,8}$') THEN
    RAISE EXCEPTION 'Invalid phone number format';
  END IF;
  
  RETURN sanitized_phone;
END;
$function$;

CREATE OR REPLACE FUNCTION public.insert_proposal(p_professional_id uuid, p_lead_id uuid, p_price numeric, p_description text, p_estimated_completion text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_proposal_id UUID;
BEGIN
  INSERT INTO public.proposals (
    professional_id,
    lead_id,
    price,
    description,
    estimated_completion,
    status
  ) VALUES (
    p_professional_id,
    p_lead_id,
    p_price,
    p_description,
    p_estimated_completion,
    'pending'
  ) RETURNING id INTO new_proposal_id;
  
  RETURN new_proposal_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_internal_user_check()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.internal_crm
    WHERE user_id = auth.uid()
  );
END;
$function$;