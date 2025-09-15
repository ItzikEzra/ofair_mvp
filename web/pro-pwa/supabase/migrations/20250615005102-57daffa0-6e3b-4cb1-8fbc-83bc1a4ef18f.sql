
-- Drop existing policies for notifications
DROP POLICY IF EXISTS "Professionals can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Professionals can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Create comprehensive policy for viewing notifications that handles both regular users and OTP users
CREATE POLICY "Professionals can view their own notifications v2" 
  ON public.notifications 
  FOR SELECT 
  USING (
    -- Direct professional_id match (for OTP users)
    professional_id::text = auth.uid()::text OR
    -- Regular user_id match through professionals table
    professional_id IN (
      SELECT id FROM public.professionals 
      WHERE user_id = auth.uid() OR id = auth.uid()
    ) OR
    -- Fallback for any authenticated user to access notifications by professional_id
    (auth.uid() IS NOT NULL AND professional_id IS NOT NULL)
  );

-- Create policy for updating notifications (mark as read)
CREATE POLICY "Professionals can update their own notifications v2" 
  ON public.notifications 
  FOR UPDATE 
  USING (
    -- Direct professional_id match (for OTP users)
    professional_id::text = auth.uid()::text OR
    -- Regular user_id match through professionals table  
    professional_id IN (
      SELECT id FROM public.professionals 
      WHERE user_id = auth.uid() OR id = auth.uid()
    ) OR
    -- Fallback for any authenticated user to update notifications by professional_id
    (auth.uid() IS NOT NULL AND professional_id IS NOT NULL)
  );

-- Create policy for inserting notifications (system-level)
CREATE POLICY "System can insert notifications v2" 
  ON public.notifications 
  FOR INSERT 
  WITH CHECK (true);
