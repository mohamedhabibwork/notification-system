-- Migration: Add custom configuration parameter for tenant context
-- This allows the application to set app.current_tenant_id for Row-Level Security

-- PostgreSQL allows custom configuration parameters with the format: prefix.parameter_name
-- We use 'app.current_tenant_id' for tenant context in RLS policies

-- Set default value for the custom parameter at database level
-- This makes the parameter available for all connections
DO $$
BEGIN
  -- Try to set the custom parameter for the current database
  EXECUTE 'ALTER DATABASE ' || current_database() || ' SET app.current_tenant_id = ''''';
EXCEPTION
  WHEN others THEN
    -- If it fails (e.g., permissions), log a warning but continue
    RAISE WARNING 'Could not set default app.current_tenant_id parameter. This is optional.';
END $$;

-- Create a helper function to safely set tenant context
-- This provides a SQL function that applications can use
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id_value TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id_value, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a helper function to get current tenant context
CREATE OR REPLACE FUNCTION get_tenant_context()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_tenant_id', true);
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION set_tenant_context(TEXT) TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_tenant_context() TO PUBLIC;

COMMENT ON FUNCTION set_tenant_context(TEXT) IS 'Sets the current tenant context for RLS policies';
COMMENT ON FUNCTION get_tenant_context() IS 'Gets the current tenant context from session';
