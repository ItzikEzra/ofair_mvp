-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to create issues" ON public.issue_reports;
DROP POLICY IF EXISTS "Allow authenticated users to view their own issues" ON public.issue_reports;

-- Create simple policies that allow service role (for edge functions) and authenticated users
CREATE POLICY "Service role and authenticated users can create issues" 
ON public.issue_reports 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role and authenticated users can view issues" 
ON public.issue_reports 
FOR SELECT 
USING (true);