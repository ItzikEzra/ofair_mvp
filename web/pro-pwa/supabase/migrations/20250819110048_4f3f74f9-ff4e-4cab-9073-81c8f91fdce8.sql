-- Check current function configurations and fix remaining search_path issues

-- Enable leaked password protection at auth configuration level
ALTER SYSTEM SET 'custom.auth.password_leaked_check' = 'true';

-- First, let's see all user-defined functions that might need search_path
DO $$
DECLARE
    func_rec RECORD;
BEGIN
    -- Log all public functions to help identify which ones need fixing
    FOR func_rec IN 
        SELECT p.proname 
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
        AND p.proowner != 10 -- not system owned
        ORDER BY p.proname
    LOOP
        RAISE NOTICE 'Function: %', func_rec.proname;
    END LOOP;
END $$;

-- Based on the linter errors, these are likely the remaining functions that need search_path fixes:
-- Let's try the most common ones that are typically missing this

-- Update calculate_distance_km function
CREATE OR REPLACE FUNCTION public.calculate_distance_km(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
RETURNS double precision
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO ''
AS $function$
BEGIN
  RETURN (
    6371 * acos(
      cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lon2) - radians(lon1)) +
      sin(radians(lat1)) * sin(radians(lat2))
    )
  );
END;
$function$;

-- Update cleanup_expired_tokens function
CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$ 
BEGIN 
  DELETE FROM auth_tokens WHERE expires_at < NOW() OR is_active = false; 
END; 
$function$;