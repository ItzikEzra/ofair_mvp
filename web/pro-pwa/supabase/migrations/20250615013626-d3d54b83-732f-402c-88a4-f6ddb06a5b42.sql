
-- Fix RLS policies for notifications table to ensure proper persistence

-- Drop existing policies that are too broad
DROP POLICY IF EXISTS "Professionals can view their own notifications v2" ON public.notifications;
DROP POLICY IF EXISTS "Professionals can update their own notifications v2" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications v2" ON public.notifications;

-- Create precise policy for viewing notifications
CREATE POLICY "Professionals can view their own notifications v3" 
  ON public.notifications 
  FOR SELECT 
  USING (
    -- Direct professional_id match (for OTP users)
    professional_id::text = auth.uid()::text OR
    -- Regular user_id match through professionals table
    professional_id IN (
      SELECT id FROM public.professionals 
      WHERE user_id = auth.uid()
    )
  );

-- Create precise policy for updating notifications (mark as read)
CREATE POLICY "Professionals can update their own notifications v3" 
  ON public.notifications 
  FOR UPDATE 
  USING (
    -- Direct professional_id match (for OTP users)
    professional_id::text = auth.uid()::text OR
    -- Regular user_id match through professionals table  
    professional_id IN (
      SELECT id FROM public.professionals 
      WHERE user_id = auth.uid()
    )
  );

-- Create policy for deleting notifications (was missing before)
CREATE POLICY "Professionals can delete their own notifications" 
  ON public.notifications 
  FOR DELETE 
  USING (
    -- Direct professional_id match (for OTP users)
    professional_id::text = auth.uid()::text OR
    -- Regular user_id match through professionals table
    professional_id IN (
      SELECT id FROM public.professionals 
      WHERE user_id = auth.uid()
    )
  );

-- Keep system insert policy for triggers
CREATE POLICY "System can insert notifications v3" 
  ON public.notifications 
  FOR INSERT 
  WITH CHECK (true);
