-- Drop the old version of get_my_professional_ratings without token_param
DROP FUNCTION IF EXISTS public.get_my_professional_ratings();

-- Ensure only the correct version with token_param exists
-- The correct version should already exist from previous migrations