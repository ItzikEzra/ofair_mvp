-- Drop and recreate functions to fix search_path security warnings

-- Drop the function first to avoid parameter name conflict
DROP FUNCTION IF EXISTS public.create_first_super_admin(text);

-- Recreate with proper search_path
CREATE OR REPLACE FUNCTION public.create_first_super_admin(admin_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  admin_user_id UUID;
  admin_id_var UUID;
BEGIN
  -- Get user ID from email
  SELECT id INTO admin_user_id 
  FROM public.user_profiles 
  WHERE email = admin_email;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', admin_email;
  END IF;
  
  -- Check if user is already an admin
  SELECT id INTO admin_id_var
  FROM public.admin_users
  WHERE user_id = admin_user_id;
  
  IF admin_id_var IS NOT NULL THEN
    -- Update existing admin
    UPDATE public.admin_users
    SET is_super_admin = true
    WHERE id = admin_id_var;
    RETURN admin_id_var;
  ELSE
    -- Create new admin
    INSERT INTO public.admin_users (user_id, is_super_admin)
    VALUES (admin_user_id, true)
    RETURNING id INTO admin_id_var;
    RETURN admin_id_var;
  END IF;
END;
$function$;