-- ==============================================================================
-- CodeSync AI - Supabase Security Advisor Fix Script
-- Resolves:
--   1. "RLS Disabled in Public" (6 Errors)
--   2. "Extension in Public" (1 Warning for vector extension)
-- Run this script directly in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. FIX WARNING: "Extension in Public" (public.vector)
-- Move pgvector extension from 'public' schema into Supabase's 'extensions' schema
-- ------------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS extensions;

-- Relocate vector extension to extensions schema
ALTER EXTENSION vector SET SCHEMA extensions;

-- Grant usage on extensions schema to all roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;


-- ------------------------------------------------------------------------------
-- 2. FIX ERRORS: "RLS Disabled in Public" (6 Errors)
-- Enable Row Level Security (RLS) on all 6 application tables.
-- Note: Your Express backend connects as 'postgres' (superuser/owner), which
-- automatically BYPASSES RLS. This secures Supabase's public PostgREST API from
-- unauthorized client queries while keeping CodeSync AI functioning seamlessly.
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.code_embeddings ENABLE ROW LEVEL SECURITY;

-- Optional: If you ever access Supabase via the service_role key, grant full access
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Allow service_role full access') THEN
        CREATE POLICY "Allow service_role full access" ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Allow service_role full access') THEN
        CREATE POLICY "Allow service_role full access" ON public.projects FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_members' AND policyname = 'Allow service_role full access') THEN
        CREATE POLICY "Allow service_role full access" ON public.project_members FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'files' AND policyname = 'Allow service_role full access') THEN
        CREATE POLICY "Allow service_role full access" ON public.files FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Allow service_role full access') THEN
        CREATE POLICY "Allow service_role full access" ON public.chat_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'code_embeddings' AND policyname = 'Allow service_role full access') THEN
        CREATE POLICY "Allow service_role full access" ON public.code_embeddings FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;
