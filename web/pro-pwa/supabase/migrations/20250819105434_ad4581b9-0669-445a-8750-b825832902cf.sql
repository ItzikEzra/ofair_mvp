-- Fix search_path security warnings for functions that don't have SET search_path TO 'public'

-- Update check_price_and_share_percentage function
CREATE OR REPLACE FUNCTION public.check_price_and_share_percentage()
RETURNS TRIGGER AS $$
BEGIN
  -- If budget is null or 0, and share_percentage > 10, cap it at 10%
  IF (NEW.budget IS NULL OR NEW.budget = 0) AND NEW.share_percentage > 10 THEN
    NEW.share_percentage := 10;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public';

-- Update sync_quote_status_with_request function
CREATE OR REPLACE FUNCTION public.sync_quote_status_with_request()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'waiting_for_rating' OR NEW.status = 'approved' THEN
    -- Update status AND request_status for all related quotes
    UPDATE public.quotes
      SET status = 'approved', request_status = NEW.status
      WHERE request_id = NEW.id AND status <> 'completed';
  ELSE
    -- Always sync the request_status field for all related quotes
    UPDATE public.quotes
      SET request_status = NEW.status
      WHERE request_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public';

-- Update handle_new_user_profile function
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Function logic here
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path TO 'public';

-- Update update_issue_reports_updated_at function  
CREATE OR REPLACE FUNCTION public.update_issue_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path TO 'public';