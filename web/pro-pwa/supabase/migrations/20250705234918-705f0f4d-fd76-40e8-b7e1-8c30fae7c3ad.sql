-- Create triggers for work completion reminders

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS proposals_work_completion_reminder ON public.proposals;
DROP TRIGGER IF EXISTS quotes_work_completion_reminder ON public.quotes;

-- Create trigger for proposals table
CREATE TRIGGER proposals_work_completion_reminder
  AFTER UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.create_work_completion_reminder();

-- Create trigger for quotes table  
CREATE TRIGGER quotes_work_completion_reminder
  AFTER UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.create_work_completion_reminder_quotes();