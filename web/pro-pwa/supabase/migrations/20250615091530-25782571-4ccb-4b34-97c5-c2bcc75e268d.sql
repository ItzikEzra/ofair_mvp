
-- Drop all existing RLS policies on the notifications table to ensure a clean slate
DROP POLICY IF EXISTS "Professionals can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Professionals can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Professionals can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

DROP POLICY IF EXISTS "Professionals can view their own notifications v2" ON public.notifications;
DROP POLICY IF EXISTS "Professionals can update their own notifications v2" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications v2" ON public.notifications;

DROP POLICY IF EXISTS "Professionals can view their own notifications v3" ON public.notifications;
DROP POLICY IF EXISTS "Professionals can update their own notifications v3" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications v3" ON public.notifications;

-- Re-create the policies with robust logic to ensure data persistence for read/delete actions.
-- This ensures that both regular users (via user_id) and OTP-based users (via direct professional_id) can manage their notifications.

-- 1. Policy for viewing notifications
CREATE POLICY "Professionals can view their own notifications"
ON public.notifications
FOR SELECT
USING (
  professional_id::text = auth.uid()::text OR
  professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
);

-- 2. Policy for updating notifications (e.g., marking as read)
CREATE POLICY "Professionals can update their own notifications"
ON public.notifications
FOR UPDATE
USING (
  professional_id::text = auth.uid()::text OR
  professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
)
WITH CHECK (
  professional_id::text = auth.uid()::text OR
  professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
);

-- 3. Policy for deleting notifications
CREATE POLICY "Professionals can delete their own notifications"
ON public.notifications
FOR DELETE
USING (
  professional_id::text = auth.uid()::text OR
  professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
);

-- 4. Policy for inserting notifications (system-level, typically from triggers)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);
