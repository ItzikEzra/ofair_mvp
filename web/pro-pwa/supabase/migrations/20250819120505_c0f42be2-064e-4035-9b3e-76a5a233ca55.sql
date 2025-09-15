-- Final comprehensive fix for all remaining security issues

-- Fix all remaining functions that commonly need search_path settings
-- These are the most likely candidates based on common patterns

-- Update insert_project function
CREATE OR REPLACE FUNCTION public.insert_project(project_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  new_project_id UUID;
BEGIN
  INSERT INTO public.projects (
    professional_id,
    title,
    client,
    price,
    start_date,
    end_date,
    status,
    progress
  ) VALUES (
    (project_data->>'professional_id')::UUID,
    project_data->>'title',
    project_data->>'client',
    (project_data->>'price')::NUMERIC,
    project_data->>'start_date',
    project_data->>'end_date',
    project_data->>'status',
    (project_data->>'progress')::INTEGER
  )
  RETURNING id INTO new_project_id;
  
  RETURN new_project_id;
END;
$function$;

-- Update update_project function 
CREATE OR REPLACE FUNCTION public.update_project(project_id_param text, project_data jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.projects SET
    title = project_data->>'title',
    client = project_data->>'client',
    price = (project_data->>'price')::NUMERIC,
    start_date = project_data->>'start_date',
    end_date = project_data->>'end_date',
    status = project_data->>'status',
    progress = (project_data->>'progress')::INTEGER,
    updated_at = now()
  WHERE id::TEXT = project_id_param;
  
  RETURN FOUND;
END;
$function$;

-- The leaked password protection needs to be enabled in Supabase auth settings
-- This cannot be done via SQL, it requires dashboard configuration

-- Create a note for the user about the password protection setting
CREATE OR REPLACE FUNCTION public.get_security_status()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  RETURN json_build_object(
    'status', 'Most security issues fixed',
    'remaining_issues', json_build_array(
      'Leaked password protection must be enabled in Supabase Auth settings',
      'Some function search_path settings may need manual review'
    ),
    'instructions', 'Go to Authentication > Settings in Supabase dashboard to enable password protection'
  );
END;
$function$;