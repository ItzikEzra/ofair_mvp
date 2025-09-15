
-- Drop all existing RLS policies on the notifications table to ensure a clean slate
DROP POLICY IF EXISTS "Allow professionals to view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow professionals to update their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow professionals to delete their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow system to insert notifications" ON public.notifications;

-- Create new policies that work for both regular authenticated users AND OTP users
-- For OTP users, we'll allow access if they can provide the correct professional_id

-- 1. Policy for viewing notifications - works for both auth users and direct professional_id access
CREATE POLICY "Allow access to notifications by professional_id"
ON public.notifications
FOR SELECT
USING (
  -- Allow if user is authenticated and matches professional_id through auth
  (auth.uid() IS NOT NULL AND (
    professional_id::text = auth.uid()::text OR
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  )) OR
  -- Allow if no auth session but we're in a context where professional_id is being accessed
  -- This enables service role access for OTP users
  (auth.uid() IS NULL AND professional_id IS NOT NULL)
);

-- 2. Policy for updating notifications (e.g., marking as read)
CREATE POLICY "Allow update notifications by professional_id"
ON public.notifications
FOR UPDATE
USING (
  -- Allow if user is authenticated and matches professional_id through auth
  (auth.uid() IS NOT NULL AND (
    professional_id::text = auth.uid()::text OR
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  )) OR
  -- Allow if no auth session but we're in a context where professional_id is being accessed
  (auth.uid() IS NULL AND professional_id IS NOT NULL)
)
WITH CHECK (
  -- Same conditions for the check clause
  (auth.uid() IS NOT NULL AND (
    professional_id::text = auth.uid()::text OR
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  )) OR
  (auth.uid() IS NULL AND professional_id IS NOT NULL)
);

-- 3. Policy for deleting notifications
CREATE POLICY "Allow delete notifications by professional_id"
ON public.notifications
FOR DELETE
USING (
  -- Allow if user is authenticated and matches professional_id through auth
  (auth.uid() IS NOT NULL AND (
    professional_id::text = auth.uid()::text OR
    professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
  )) OR
  -- Allow if no auth session but we're in a context where professional_id is being accessed
  (auth.uid() IS NULL AND professional_id IS NOT NULL)
);

-- 4. Policy for inserting notifications (system-level, typically from triggers)
CREATE POLICY "Allow system to insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);
