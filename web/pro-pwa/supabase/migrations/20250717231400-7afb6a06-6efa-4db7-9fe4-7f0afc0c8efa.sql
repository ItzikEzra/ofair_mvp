-- Simply drop all existing policies and recreate with basic service role access
DROP POLICY IF EXISTS "Service role and authenticated users can create issues" ON public.issue_reports;
DROP POLICY IF EXISTS "Service role and authenticated users can view issues" ON public.issue_reports;
DROP POLICY IF EXISTS "Allow authenticated users to create issues" ON public.issue_reports;
DROP POLICY IF EXISTS "Allow authenticated users to view their own issues" ON public.issue_reports;
DROP POLICY IF EXISTS "Admins can update issues" ON public.issue_reports;
DROP POLICY IF EXISTS "Admins can view all issues" ON public.issue_reports;

-- Create very simple policies that allow service role (used by edge functions)
CREATE POLICY "Service role full access" 
ON public.issue_reports 
FOR ALL 
USING (auth.role() = 'service_role');

-- Allow admins to manage all issues
CREATE POLICY "Admins can manage all issues" 
ON public.issue_reports 
FOR ALL 
USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- Allow authenticated users to view their own issues  
CREATE POLICY "Users can view their own issues" 
ON public.issue_reports 
FOR SELECT 
USING (professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid()));