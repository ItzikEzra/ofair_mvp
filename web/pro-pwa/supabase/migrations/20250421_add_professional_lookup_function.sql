
-- Create a function to safely look up professionals by identifier
-- This avoids RLS recursion issues
CREATE OR REPLACE FUNCTION public.get_professional_by_identifier(
  identifier_param TEXT,
  is_email_param BOOLEAN
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  phone_number TEXT,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF is_email_param THEN
    RETURN QUERY
    SELECT p.id, p.user_id, p.name, p.phone_number, p.email FROM public.professionals p
    WHERE p.email = identifier_param
    LIMIT 1;
  ELSE
    RETURN QUERY
    SELECT p.id, p.user_id, p.name, p.phone_number, p.email FROM public.professionals p
    WHERE p.phone_number = identifier_param
    LIMIT 1;
  END IF;
END;
$$;
