
-- Update RLS policies to handle OTP-authenticated users (who might have user_id = null)
-- Drop existing policies
DROP POLICY IF EXISTS "Professionals can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Professionals can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Create updated policy for viewing notifications that works with direct professional_id matching
CREATE POLICY "Professionals can view their own notifications" 
  ON public.notifications 
  FOR SELECT 
  USING (
    professional_id = auth.uid() OR 
    professional_id IN (
      SELECT id FROM public.professionals 
      WHERE user_id = auth.uid() OR id = auth.uid()
    ) OR
    professional_id::text = auth.uid()::text
  );

-- Create updated policy for updating notifications
CREATE POLICY "Professionals can update their own notifications" 
  ON public.notifications 
  FOR UPDATE 
  USING (
    professional_id = auth.uid() OR 
    professional_id IN (
      SELECT id FROM public.professionals 
      WHERE user_id = auth.uid() OR id = auth.uid()
    ) OR
    professional_id::text = auth.uid()::text
  );

-- Create policy for inserting notifications (system-level)
CREATE POLICY "System can insert notifications" 
  ON public.notifications 
  FOR INSERT 
  WITH CHECK (true);
