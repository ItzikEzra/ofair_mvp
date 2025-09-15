
-- Add client_details column to notifications table
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS client_details JSONB;
