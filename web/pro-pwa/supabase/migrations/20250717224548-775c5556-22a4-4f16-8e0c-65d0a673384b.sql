-- Update RLS policies for issue_reports to better handle OTP tokens
-- First, drop existing policies if they conflict
DROP POLICY IF EXISTS "Professionals can create issues" ON public.issue_reports;
DROP POLICY IF EXISTS "Professionals can view their own issues" ON public.issue_reports;

-- Create new policies that properly handle OTP tokens
CREATE POLICY "Professionals can create issues" 
ON public.issue_reports 
FOR INSERT 
WITH CHECK (
  professional_id IN (
    SELECT get_current_professional_id_secure()
  )
);

CREATE POLICY "Professionals can view their own issues" 
ON public.issue_reports 
FOR SELECT 
USING (
  professional_id IN (
    SELECT get_current_professional_id_secure()
  )
);

-- Ensure issue_reports table has the updated_at trigger
DROP TRIGGER IF EXISTS update_issue_reports_updated_at_trigger ON public.issue_reports;

CREATE TRIGGER update_issue_reports_updated_at_trigger
BEFORE UPDATE ON public.issue_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_issue_reports_updated_at();