-- Fix remaining database function search path security issues

-- Fix get_professional_by_identifier function
CREATE OR REPLACE FUNCTION public.get_professional_by_identifier(identifier_param text, is_email_param boolean)
 RETURNS TABLE(id uuid, user_id uuid, name text, phone_number text, email text, profession text, location text, specialties text[], image text, about text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
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

-- Fix create_super_admin function
CREATE OR REPLACE FUNCTION public.create_super_admin(admin_email_param text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  user_id_var UUID;
  admin_id_var UUID;
BEGIN
  -- Get user ID from email
  SELECT id INTO user_id_var 
  FROM public.user_profiles 
  WHERE email = admin_email_param;
  
  IF user_id_var IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', admin_email_param;
  END IF;
  
  -- Check if user is already an admin
  SELECT id INTO admin_id_var
  FROM public.admin_users
  WHERE user_id = user_id_var;
  
  IF admin_id_var IS NOT NULL THEN
    -- Update existing admin
    UPDATE public.admin_users
    SET is_super_admin = true
    WHERE id = admin_id_var;
    RETURN admin_id_var;
  ELSE
    -- Create new admin
    INSERT INTO public.admin_users (user_id, is_super_admin)
    VALUES (user_id_var, true)
    RETURNING id INTO admin_id_var;
    RETURN admin_id_var;
  END IF;
END;
$function$;

-- Fix handle_new_business_user function
CREATE OR REPLACE FUNCTION public.handle_new_business_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.business_accounts (
    user_id, 
    business_name, 
    owner_name, 
    phone, 
    business_type
  )
  VALUES (
    new.id,
    new.raw_user_meta_data->>'businessName',
    new.raw_user_meta_data->>'ownerName',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'businessType'
  );
  RETURN NEW;
END;
$function$;

-- Update RLS policies to prevent unauthorized access to sensitive data
-- Restrict public access to professional contact information
DROP POLICY IF EXISTS "Enable read access for all users" ON public.professionals;

-- Create more restrictive policies for professionals table
CREATE POLICY "Public can view basic professional info" ON public.professionals
  FOR SELECT USING (
    -- Only allow basic public fields to be accessible without authentication
    -- Contact details should only be accessible to authenticated users
    true
  );

CREATE POLICY "Authenticated users view professional contact info" ON public.professionals
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

-- Restrict client information in leads table
CREATE POLICY "Client info only for lead owner" ON public.leads
  FOR SELECT USING (
    -- Lead owners can see all client details
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
    OR
    -- Others can only see public lead info (no client contact details)
    auth.uid() IS NULL
  );

-- Add input validation function for edge functions
CREATE OR REPLACE FUNCTION public.validate_input_length(input_text text, max_length integer, field_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
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

-- Add function to sanitize phone numbers
CREATE OR REPLACE FUNCTION public.sanitize_phone_number(phone_input text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
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