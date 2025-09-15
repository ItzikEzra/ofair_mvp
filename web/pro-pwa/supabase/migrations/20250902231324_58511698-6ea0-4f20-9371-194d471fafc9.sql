-- Fix security warnings by setting search_path for existing functions
ALTER FUNCTION public.handle_new_user_profile() SET search_path = public;

ALTER FUNCTION public.update_issue_reports_updated_at() SET search_path = public;