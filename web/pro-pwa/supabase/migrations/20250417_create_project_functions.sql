
-- Create function to get projects for a professional
CREATE OR REPLACE FUNCTION public.get_projects_for_professional(professional_id_param UUID)
RETURNS SETOF public.projects
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.projects 
  WHERE professional_id = professional_id_param
  ORDER BY created_at DESC;
$$;

-- Create function to insert a new project
CREATE OR REPLACE FUNCTION public.insert_project(project_data JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create function to update an existing project
CREATE OR REPLACE FUNCTION public.update_project(project_id_param TEXT, project_data JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;
