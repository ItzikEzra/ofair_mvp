-- CRITICAL SECURITY FIX: Final remaining vulnerabilities
-- Fix customer contact data exposure and private messages access

-- Secure user_messages table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_messages' AND table_schema = 'public') THEN
    -- Drop the overly permissive policy
    DROP POLICY IF EXISTS "Allow all operations" ON public.user_messages;
    DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.user_messages;
    DROP POLICY IF EXISTS "Users can manage all messages" ON public.user_messages;
    
    -- Create secure policies for private messages
    EXECUTE 'CREATE POLICY "Users can view their own sent messages" ON public.user_messages FOR SELECT USING (
      sender_id = auth.uid() OR 
      sender_id IN (
        SELECT id FROM professionals WHERE user_id = auth.uid()
      ) OR
      sender_id IN (
        SELECT professional_id FROM auth_tokens 
        WHERE token = TRIM(BOTH '' '' FROM REPLACE(
          COALESCE(
            current_setting(''request.headers.authorization'', true),
            current_setting(''request.header.authorization'', true),
            ''''
          ), 
          ''Bearer '', 
          ''''
        ))
        AND expires_at > now()
        AND is_active = true
      )
    )';
    
    EXECUTE 'CREATE POLICY "Users can view their own received messages" ON public.user_messages FOR SELECT USING (
      recipient_id = auth.uid() OR 
      recipient_id IN (
        SELECT id FROM professionals WHERE user_id = auth.uid()
      ) OR
      recipient_id IN (
        SELECT professional_id FROM auth_tokens 
        WHERE token = TRIM(BOTH '' '' FROM REPLACE(
          COALESCE(
            current_setting(''request.headers.authorization'', true),
            current_setting(''request.header.authorization'', true),
            ''''
          ), 
          ''Bearer '', 
          ''''
        ))
        AND expires_at > now()
        AND is_active = true
      )
    )';
    
    EXECUTE 'CREATE POLICY "Users can send messages" ON public.user_messages FOR INSERT WITH CHECK (
      sender_id = auth.uid() OR 
      sender_id IN (
        SELECT id FROM professionals WHERE user_id = auth.uid()
      ) OR
      sender_id IN (
        SELECT professional_id FROM auth_tokens 
        WHERE token = TRIM(BOTH '' '' FROM REPLACE(
          COALESCE(
            current_setting(''request.headers.authorization'', true),
            current_setting(''request.header.authorization'', true),
            ''''
          ), 
          ''Bearer '', 
          ''''
        ))
        AND expires_at > now()
        AND is_active = true
      )
    )';
    
    EXECUTE 'CREATE POLICY "Users can update their own sent messages" ON public.user_messages FOR UPDATE USING (
      sender_id = auth.uid() OR 
      sender_id IN (
        SELECT id FROM professionals WHERE user_id = auth.uid()
      ) OR
      sender_id IN (
        SELECT professional_id FROM auth_tokens 
        WHERE token = TRIM(BOTH '' '' FROM REPLACE(
          COALESCE(
            current_setting(''request.headers.authorization'', true),
            current_setting(''request.header.authorization'', true),
            ''''
          ), 
          ''Bearer '', 
          ''''
        ))
        AND expires_at > now()
        AND is_active = true
      )
    )';
    
    EXECUTE 'CREATE POLICY "Users can delete their own sent messages" ON public.user_messages FOR DELETE USING (
      sender_id = auth.uid() OR 
      sender_id IN (
        SELECT id FROM professionals WHERE user_id = auth.uid()
      ) OR
      sender_id IN (
        SELECT professional_id FROM auth_tokens 
        WHERE token = TRIM(BOTH '' '' FROM REPLACE(
          COALESCE(
            current_setting(''request.headers.authorization'', true),
            current_setting(''request.header.authorization'', true),
            ''''
          ), 
          ''Bearer '', 
          ''''
        ))
        AND expires_at > now()
        AND is_active = true
      )
    )';
    
    EXECUTE 'CREATE POLICY "Admins can manage all messages" ON public.user_messages FOR ALL USING (
      EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    )';
  END IF;
END
$$;

-- Additional check: Make sure notifications table client_details are properly restricted
-- Remove any overly permissive notification policies
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow inserting notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow system to insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Enable insert for system" ON public.notifications;

-- Create a more restrictive system insert policy for notifications
CREATE POLICY "System can create notifications for professionals" 
ON public.notifications 
FOR INSERT 
WITH CHECK (
  -- Only allow system inserts for valid professional IDs
  professional_id IS NOT NULL AND 
  EXISTS (SELECT 1 FROM professionals WHERE id = professional_id)
);

-- Ensure projects table is properly secured (this should already be done, but double-check)
-- Make sure there are no overly permissive policies on projects
DROP POLICY IF EXISTS "Users can view all projects" ON public.projects;
DROP POLICY IF EXISTS "Allow all operations on projects" ON public.projects;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.projects;

-- Verify notifications access is properly restricted
-- Remove any policy that allows broad access to notifications
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.notifications;
DROP POLICY IF EXISTS "Allow all operations on notifications" ON public.notifications;