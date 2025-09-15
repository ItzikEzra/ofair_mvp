
-- Disable the automatic trigger that creates duplicate notifications
-- since we now handle notification creation manually in the edge function
DROP TRIGGER IF EXISTS trigger_notify_professional_new_proposal ON public.proposals;
DROP FUNCTION IF EXISTS public.notify_professional_new_proposal();

-- Keep only the referral notification trigger as it's still needed
-- (The proposal notifications are now handled in the submit-proposal edge function)
