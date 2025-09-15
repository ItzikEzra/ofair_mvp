-- Create issue_reports table
CREATE TABLE public.issue_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('app_bug', 'user_behavior')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed_by_user')),
  admin_response TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign key constraint
  CONSTRAINT fk_issue_reports_professional_id 
    FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_issue_reports_professional_id ON issue_reports(professional_id);
CREATE INDEX idx_issue_reports_status ON issue_reports(status);
CREATE INDEX idx_issue_reports_created_at ON issue_reports(created_at DESC);

-- Enable RLS
ALTER TABLE issue_reports ENABLE ROW LEVEL SECURITY;

-- Create policies that support both regular auth and OTP tokens
CREATE POLICY "Professionals can view their own issues" ON public.issue_reports
FOR SELECT
USING (
  -- Standard auth users
  (professional_id IN (
    SELECT id FROM public.professionals 
    WHERE user_id = auth.uid()
  ))
  OR
  -- OTP token users
  (professional_id IN (
    SELECT at.professional_id 
    FROM public.auth_tokens at
    WHERE at.token = TRIM(BOTH ' ' FROM REPLACE(
      COALESCE(
        current_setting('request.headers.authorization', true),
        current_setting('request.header.authorization', true),
        ''
      ), 
      'Bearer ', 
      ''
    ))
    AND at.expires_at > now()
    AND at.is_active = true
  ))
);

CREATE POLICY "Professionals can create issues" ON public.issue_reports
FOR INSERT
WITH CHECK (
  -- Standard auth users
  (professional_id IN (
    SELECT id FROM public.professionals 
    WHERE user_id = auth.uid()
  ))
  OR
  -- OTP token users
  (professional_id IN (
    SELECT at.professional_id 
    FROM public.auth_tokens at
    WHERE at.token = TRIM(BOTH ' ' FROM REPLACE(
      COALESCE(
        current_setting('request.headers.authorization', true),
        current_setting('request.header.authorization', true),
        ''
      ), 
      'Bearer ', 
      ''
    ))
    AND at.expires_at > now()
    AND at.is_active = true
  ))
);

-- Admin policies for managing issues
CREATE POLICY "Admins can view all issues" ON public.issue_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can update issues" ON public.issue_reports
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_issue_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_issue_reports_updated_at
  BEFORE UPDATE ON public.issue_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_issue_reports_updated_at();