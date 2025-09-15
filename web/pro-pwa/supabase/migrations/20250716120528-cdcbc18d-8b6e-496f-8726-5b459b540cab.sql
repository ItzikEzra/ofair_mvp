-- Create a function to get client details for proposals
CREATE OR REPLACE FUNCTION public.get_client_details_for_proposal(
  proposal_id_param uuid,
  proposal_type_param text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  request_id_var uuid;
  professional_id_var uuid;
  current_professional_id uuid;
BEGIN
  -- Get the current professional ID
  SELECT get_current_professional_id_secure() INTO current_professional_id;
  
  IF current_professional_id IS NULL THEN
    RAISE EXCEPTION 'לא ניתן לזהות מקצוען';
  END IF;
  
  -- Handle lead proposals
  IF proposal_type_param = 'lead' THEN
    -- Verify the professional owns this proposal
    SELECT p.professional_id INTO professional_id_var
    FROM proposals p
    WHERE p.id = proposal_id_param;
    
    IF professional_id_var != current_professional_id THEN
      RAISE EXCEPTION 'אין הרשאה לגשת לנתונים אלה';
    END IF;
    
    -- Get lead client details
    SELECT jsonb_build_object(
      'name', l.client_name,
      'phone', l.client_phone,
      'address', l.client_address,
      'workDate', l.work_date,
      'workTime', l.work_time,
      'notes', l.notes
    ) INTO result
    FROM proposals p
    JOIN leads l ON l.id = p.lead_id
    WHERE p.id = proposal_id_param;
    
  ELSE
    -- Handle request proposals (quotes)
    -- Verify the professional owns this quote
    SELECT q.professional_id, q.request_id INTO professional_id_var, request_id_var
    FROM quotes q
    WHERE q.id = proposal_id_param;
    
    IF professional_id_var != current_professional_id THEN
      RAISE EXCEPTION 'אין הרשאה לגשת לנתונים אלה';
    END IF;
    
    -- Get request and user profile details
    SELECT jsonb_build_object(
      'name', COALESCE(up.name, 'לא זמין'),
      'phone', COALESCE(up.phone, 'לא זמין'),
      'address', COALESCE(up.address, 'לא זמין'),
      'date', r.date,
      'time', r.timing
    ) INTO result
    FROM requests r
    LEFT JOIN user_profiles up ON up.id = r.user_id
    WHERE r.id = request_id_var;
  END IF;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;