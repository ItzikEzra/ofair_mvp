-- Fix remaining search_path security warnings - complete the function definitions

-- Fix create_first_super_admin function with complete body
CREATE OR REPLACE FUNCTION public.create_first_super_admin(admin_email_param text)
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
  WHERE email = admin_email_param;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', admin_email_param;
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

-- Fix create_work_completion_reminder function
CREATE OR REPLACE FUNCTION public.create_work_completion_reminder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  work_datetime TIMESTAMP WITH TIME ZONE;
BEGIN
  -- אם הסטטוס השתנה ל-accepted וניתן תאריך ושעה
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- חישוב זמן העבודה
    IF NEW.scheduled_date IS NOT NULL AND NEW.scheduled_time IS NOT NULL THEN
      work_datetime := (NEW.scheduled_date::TEXT || ' ' || NEW.scheduled_time)::TIMESTAMP WITH TIME ZONE;
      
      -- יצירת רשומה לתזכורת השלמת עבודה
      INSERT INTO public.work_completion_reminders (
        proposal_id,
        proposal_type,
        scheduled_work_time
      ) VALUES (
        NEW.id,
        'proposal',
        work_datetime
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Fix create_work_completion_reminder_quotes function
CREATE OR REPLACE FUNCTION public.create_work_completion_reminder_quotes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  work_datetime TIMESTAMP WITH TIME ZONE;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    IF NEW.scheduled_date IS NOT NULL AND NEW.scheduled_time IS NOT NULL THEN
      work_datetime := (NEW.scheduled_date::TEXT || ' ' || NEW.scheduled_time)::TIMESTAMP WITH TIME ZONE;
      
      INSERT INTO public.work_completion_reminders (
        proposal_id,
        proposal_type,
        scheduled_work_time
      ) VALUES (
        NEW.id,
        'quote',
        work_datetime
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;