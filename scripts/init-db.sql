-- Initialize OFAIR database
-- Enable required PostgreSQL extensions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create application user if not exists (for RLS policies)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_user WHERE usename = 'ofair_app') THEN
        CREATE USER ofair_app WITH PASSWORD 'ofair_app_password';
    END IF;
END
$$;

-- Grant necessary permissions
GRANT CONNECT ON DATABASE ofair_dev TO ofair_app;
GRANT USAGE ON SCHEMA public TO ofair_app;
GRANT CREATE ON SCHEMA public TO ofair_app;

-- Set up Row Level Security context functions
CREATE OR REPLACE FUNCTION set_current_user_context(user_id UUID, professional_id UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_id::text, false);
    PERFORM set_config('app.current_professional_id', 
        COALESCE(professional_id::text, ''), false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get current user ID
CREATE OR REPLACE FUNCTION current_app_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN current_setting('app.current_user_id', true)::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get current professional ID
CREATE OR REPLACE FUNCTION current_app_professional_id()
RETURNS UUID AS $$
BEGIN
    RETURN nullif(current_setting('app.current_professional_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;