
-- Check if RLS is enabled and create proper policies for notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Professionals can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Professionals can update their own notifications" ON public.notifications;

-- Create policy that allows professionals to view their own notifications
CREATE POLICY "Professionals can view their own notifications" 
  ON public.notifications 
  FOR SELECT 
  USING (professional_id = auth.uid() OR professional_id IN (
    SELECT id FROM public.professionals WHERE user_id = auth.uid()
  ));

-- Create policy that allows professionals to update their own notifications (for marking as read)
CREATE POLICY "Professionals can update their own notifications" 
  ON public.notifications 
  FOR UPDATE 
  USING (professional_id = auth.uid() OR professional_id IN (
    SELECT id FROM public.professionals WHERE user_id = auth.uid()
  ));

-- Create policy for inserting notifications (system-level, typically from triggers)
CREATE POLICY "System can insert notifications" 
  ON public.notifications 
  FOR INSERT 
  WITH CHECK (true);
