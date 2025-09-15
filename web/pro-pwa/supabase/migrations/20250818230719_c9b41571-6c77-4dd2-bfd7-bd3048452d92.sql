-- Fix the final set of functions with search path issues

CREATE OR REPLACE FUNCTION public.add_internal_user_by_email(caller_email text, new_user_email text, user_name text DEFAULT NULL::text, make_super_admin boolean DEFAULT false)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.calculate_distance_km(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
RETURNS double precision
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $$
BEGIN
  RETURN (
    6371 * acos(
      cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lon2) - radians(lon1)) +
      sin(radians(lat1)) * sin(radians(lat2))
    )
  );
END;
$$;

-- Update notification and other trigger functions
CREATE OR REPLACE FUNCTION public.notify_professionals_for_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;