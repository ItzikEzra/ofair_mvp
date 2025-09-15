
-- Enable the pg_cron extension to schedule tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage permissions to the postgres role, which is necessary for cron jobs.
GRANT USAGE ON SCHEMA cron TO postgres;
