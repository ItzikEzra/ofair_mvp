-- Update the new proposal notification trigger to use lead_id as related_id for proper navigation
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
      format('קיבלת הצעת מחיר חדשה עבור הליד: "%s"', lead_record.title),
      'new_proposal',
      NEW.lead_id,  -- Changed from NEW.id to NEW.lead_id for proper navigation
      'lead'        -- Changed from 'proposal' to 'lead'
    );
  END IF;

  RETURN NEW;
END;
$$;