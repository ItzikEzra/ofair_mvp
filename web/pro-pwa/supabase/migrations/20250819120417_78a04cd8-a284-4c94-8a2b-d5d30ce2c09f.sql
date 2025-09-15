-- Fix remaining search_path issues for the last functions

-- Update calculate_distance_km function
CREATE OR REPLACE FUNCTION public.calculate_distance_km(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
RETURNS double precision
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO ''
AS $function$
BEGIN
  RETURN (
    6371 * acos(
      cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lon2) - radians(lon1)) +
      sin(radians(lat1)) * sin(radians(lat2))
    )
  );
END;
$function$;

-- Update cleanup_expired_tokens function
CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$ 
BEGIN 
  DELETE FROM public.auth_tokens WHERE expires_at < NOW() OR is_active = false; 
END; 
$function$;

-- Since we can't identify specific functions easily, let's update some common ones that might be missing search_path

-- Check if add_internal_user_by_email exists and update it
CREATE OR REPLACE FUNCTION public.add_internal_user_by_email(caller_email text, new_user_email text, user_name text DEFAULT NULL::text, make_super_admin boolean DEFAULT false)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  caller_is_super_admin BOOLEAN;
  new_internal_id UUID;
BEGIN
  -- Check if caller is super admin
  SELECT is_super_admin INTO caller_is_super_admin 
  FROM public.internal_crm
  WHERE email = caller_email;
  
  IF NOT caller_is_super_admin OR caller_is_super_admin IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Only super admins can add internal users');
  END IF;
  
  -- Check if user is already an internal user
  IF EXISTS (SELECT 1 FROM public.internal_crm WHERE email = new_user_email) THEN
    RETURN json_build_object('success', false, 'message', 'User is already an internal user');
  END IF;
  
  -- Add internal user
  INSERT INTO public.internal_crm (email, name, is_super_admin)
  VALUES (new_user_email, user_name, make_super_admin)
  RETURNING id INTO new_internal_id;
  
  RETURN json_build_object('success', true, 'id', new_internal_id);
END;
$function$;

-- Update check_internal_email function
CREATE OR REPLACE FUNCTION public.check_internal_email(email_param text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
$function$;