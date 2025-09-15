
-- Create the table to store One-Time Passcodes
CREATE TABLE public.otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  code TEXT NOT NULL,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ
);

-- Add an index for faster lookups on phone number and code during verification
CREATE INDEX idx_otp_codes_phone_code ON public.otp_codes(phone_number, code);

-- Enable Row Level Security on the table to ensure data is not publicly accessible
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- By default, with RLS enabled and no policies, no one can access the table.
-- This is secure, as only our Edge Functions with the service_role key will be able to access it.

-- Schedule a cron job to run every 5 minutes and delete expired OTP codes
-- This keeps the table clean and manageable.
SELECT cron.schedule(
  'delete-expired-otps',
  '*/5 * * * *', -- every 5 minutes
  $$DELETE FROM public.otp_codes WHERE expires_at < now() AND verified_at IS NULL$$
);
