-- Final security fix: Update remaining functions missing search_path
-- Query to find and fix all functions without proper search_path settings

-- Fix all remaining security definer functions
CREATE OR REPLACE FUNCTION public.create_first_internal_super_admin(admin_email text, admin_name text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_user_id UUID;
  new_admin_id UUID;
BEGIN
  -- Get user ID from email
  SELECT id INTO admin_user_id FROM auth.users WHERE email = admin_email;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', admin_email;
  END IF;
  
  -- Check if there are any existing internal users
  IF EXISTS (SELECT 1 FROM public.internal_crm) THEN
    RAISE EXCEPTION 'Cannot create first super admin: internal users already exist';
  END IF;
  
  -- Create the super admin record
  INSERT INTO public.internal_crm (user_id, email, name, is_super_admin)
  VALUES (admin_user_id, admin_email, admin_name, true)
  RETURNING id INTO new_admin_id;
  
  RETURN new_admin_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_internal_user(user_email text, user_name text DEFAULT NULL::text, make_super_admin boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller_is_super_admin BOOLEAN;
  target_user_id UUID;
  new_internal_id UUID;
BEGIN
  -- Check if caller is super admin
  SELECT EXISTS (
    SELECT 1 FROM public.internal_crm
    WHERE user_id = auth.uid() AND is_super_admin = true
  ) INTO caller_is_super_admin;
  
  IF NOT caller_is_super_admin THEN
    RAISE EXCEPTION 'Only super admins can add internal users';
  END IF;
  
  -- Get target user ID from email
  SELECT id INTO target_user_id FROM auth.users WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Check if user is already an internal user
  IF EXISTS (SELECT 1 FROM public.internal_crm WHERE user_id = target_user_id) THEN
    RAISE EXCEPTION 'User is already an internal user';
  END IF;
  
  -- Add internal user
  INSERT INTO public.internal_crm (user_id, email, name, is_super_admin)
  VALUES (target_user_id, user_email, user_name, make_super_admin)
  RETURNING id INTO new_internal_id;
  
  RETURN new_internal_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_internal_super_admin_check()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.check_user_is_internal_super_admin(auth.uid());
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ 
BEGIN 
  DELETE FROM auth_tokens WHERE expires_at < NOW() OR is_active = false; 
END; 
$function$;

CREATE OR REPLACE FUNCTION public.insert_lead(p_professional_id uuid, p_title text, p_description text, p_location text, p_budget numeric, p_share_percentage integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_lead_id UUID;
BEGIN
  INSERT INTO public.leads (
    professional_id,
    title,
    description,
    location,
    budget,
    share_percentage,
    status
  ) VALUES (
    p_professional_id,
    p_title,
    p_description,
    p_location,
    p_budget,
    p_share_percentage,
    'active'
  ) RETURNING id INTO new_lead_id;
  
  RETURN new_lead_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_proposal(p_professional_id uuid, p_lead_id uuid, p_price numeric, p_description text, p_estimated_completion text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_lead(p_professional_id uuid, p_title text, p_description text, p_location text, p_budget numeric, p_share_percentage integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.leads (
    professional_id,
    title,
    description,
    location,
    budget,
    share_percentage,
    status
  ) VALUES (
    p_professional_id,
    p_title,
    p_description,
    p_location,
    p_budget,
    p_share_percentage,
    'active'
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$function$;