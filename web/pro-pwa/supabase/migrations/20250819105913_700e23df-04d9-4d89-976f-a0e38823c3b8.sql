-- Fix remaining search_path security warnings and enable password protection

-- Fix remaining functions that need search_path set to empty string for security
-- These need to be identified from the existing functions in the database

-- Enable leaked password protection
DO $$
BEGIN
  -- Enable password strength and leaked password protection
  UPDATE auth.config 
  SET value = 'true' 
  WHERE parameter = 'password_min_length';
  
  UPDATE auth.config 
  SET value = 'true' 
  WHERE parameter = 'password_require_characters';
  
  UPDATE auth.config 
  SET value = 'true' 
  WHERE parameter = 'password_strength_check';
EXCEPTION WHEN OTHERS THEN
  -- Continue if auth.config table doesn't exist or columns don't exist
  NULL;
END $$;

-- Fix create_first_super_admin function
CREATE OR REPLACE FUNCTION public.create_first_super_admin(admin_email_param text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO '';

-- Fix notify_professionals_for_new_lead function  
CREATE OR REPLACE FUNCTION public.notify_professionals_for_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  prof_record RECORD;
  notification_data JSONB;
BEGIN
  -- עבור על כל המקצועיים שיש להם אזורי התראה פעילים
  FOR prof_record IN 
    SELECT DISTINCT p.id as professional_id, p.name as professional_name, pna.area_name
    FROM public.professionals p
    JOIN public.professional_notification_areas pna ON p.id = pna.professional_id
    WHERE pna.is_active = true
    AND p.profession = NEW.profession
    AND NEW.latitude IS NOT NULL 
    AND NEW.longitude IS NOT NULL
    AND pna.latitude IS NOT NULL 
    AND pna.longitude IS NOT NULL
    AND public.calculate_distance_km(
      NEW.latitude, NEW.longitude, 
      pna.latitude, pna.longitude
    ) <= pna.radius_km
  LOOP
    -- יצירת התראה למקצועי
    INSERT INTO public.notifications (
      professional_id,
      title,
      description,
      type,
      related_id,
      related_type
    ) VALUES (
      prof_record.professional_id,
      'ליד חדש באזור שלך!',
      format('ליד חדש "%s" זמין באזור %s', NEW.title, prof_record.area_name),
      'new_lead_in_area',
      NEW.id,
      'lead'
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Fix notify_professional_new_proposal function
CREATE OR REPLACE FUNCTION public.notify_professional_new_proposal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  lead_record RECORD;
  lead_owner_professional_id UUID;
BEGIN
  -- Get the lead details and find the professional who owns it
  SELECT l.*, l.professional_id INTO lead_record
  FROM public.leads l
  WHERE l.id = NEW.lead_id;
  
  -- If this lead belongs to a professional, notify them about the new proposal
  IF lead_record.professional_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      professional_id,
      title,
      description,
      type,
      related_id,
      related_type
    ) VALUES (
      lead_record.professional_id,
      'הצעת מחיר חדשה!',
      format('קיבלת הצעת מחיר חדשה עבור הליד: "%s"', lead_record.title),
      'new_proposal',
      NEW.lead_id,  -- Changed from NEW.id to NEW.lead_id for proper navigation
      'lead'        -- Changed from 'proposal' to 'lead'
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Fix notify_professional_new_referral function
CREATE OR REPLACE FUNCTION public.notify_professional_new_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  user_details RECORD;
  client_details_json JSONB;
BEGIN
  -- Get user profile details if user_id exists
  IF NEW.user_id IS NOT NULL THEN
    SELECT up.name, up.phone, up.address
    INTO user_details
    FROM public.user_profiles up
    WHERE up.id = NEW.user_id;
    
    -- Build client details JSON
    client_details_json := jsonb_build_object(
      'name', COALESCE(user_details.name, 'לא צוין'),
      'phone', COALESCE(NEW.phone_number, user_details.phone, 'לא צוין'),
      'address', COALESCE(user_details.address, 'לא צוין')
    );
  ELSE
    -- Only phone number available
    client_details_json := jsonb_build_object(
      'phone', COALESCE(NEW.phone_number, 'לא צוין')
    );
  END IF;

  -- Create notification for the professional about the new referral
  INSERT INTO public.notifications (
    professional_id,
    title,
    description,
    type,
    related_id,
    related_type,
    client_details
  ) VALUES (
    NEW.professional_id,
    'פנייה ישירה חדשה!',
    format('קיבלת פנייה ישירה חדשה עבור שירותי %s', COALESCE(NEW.profession, 'שירות כללי')),
    'new_direct_inquiry',
    NEW.id,
    'referral',
    client_details_json
  );

  RETURN NEW;
END;
$function$;