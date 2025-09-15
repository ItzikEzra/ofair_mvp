
-- Enable realtime for notifications table
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Enable realtime for referrals table  
ALTER TABLE public.referrals REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;

-- Enable realtime for proposals table
ALTER TABLE public.proposals REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.proposals;

-- Create trigger for new proposals (when someone submits a proposal to a lead)
CREATE OR REPLACE FUNCTION public.notify_professional_new_proposal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
      format('קיבלת הצעת מחיר חדשה עבור "%s"', lead_record.title),
      'new_proposal',
      NEW.id,
      'proposal'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for new proposal notifications
CREATE TRIGGER trigger_notify_professional_new_proposal
  AFTER INSERT ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_professional_new_proposal();

-- Update the existing referral notification trigger to include client details
CREATE OR REPLACE FUNCTION public.notify_professional_new_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Drop and recreate the referral trigger to use the updated function
DROP TRIGGER IF EXISTS trigger_notify_professional_new_referral ON public.referrals;
CREATE TRIGGER trigger_notify_professional_new_referral
  AFTER INSERT ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_professional_new_referral();
