-- Drop the current policies
DROP POLICY IF EXISTS "Professionals can create issues" ON public.issue_reports;
DROP POLICY IF EXISTS "Professionals can view their own issues" ON public.issue_reports;

-- Create simpler policies that allow service role and authenticated users
CREATE POLICY "Allow authenticated users to create issues" 
ON public.issue_reports 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL OR 
  auth.role() = 'service_role' OR
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to view their own issues" 
ON public.issue_reports 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL OR 
  auth.role() = 'service_role' OR
  auth.role() = 'authenticated'
);