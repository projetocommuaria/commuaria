-- Phase 1: create empty, city-specific Curitiba tables in the main Commuaria project.
-- Araucaria's existing tables are untouched. No rows are copied from any project.
-- Keep the new tables inaccessible through the public API until RLS policies and Auth routing are reviewed in a later phase.

CREATE TABLE IF NOT EXISTS public.curitiba_profiles (
  LIKE public.profiles INCLUDING ALL
);
CREATE TABLE IF NOT EXISTS public.curitiba_reports (
  LIKE public.reports INCLUDING ALL
);
CREATE TABLE IF NOT EXISTS public.curitiba_news (
  LIKE public.news INCLUDING ALL
);
CREATE TABLE IF NOT EXISTS public.curitiba_work_orders (
  LIKE public.work_orders INCLUDING ALL
);
CREATE TABLE IF NOT EXISTS public.curitiba_work_order_history (
  LIKE public.work_order_history INCLUDING ALL
);

-- Keep a stable municipal profile id while linking separately to shared Auth.
ALTER TABLE public.curitiba_profiles
  ADD COLUMN IF NOT EXISTS auth_user_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.curitiba_profiles'::regclass
      AND conname = 'curitiba_profiles_auth_user_id_fkey'
  ) THEN
    ALTER TABLE public.curitiba_profiles
      ADD CONSTRAINT curitiba_profiles_auth_user_id_fkey
      FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_curitiba_profiles_auth_user_id
  ON public.curitiba_profiles(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- All rows in these physical tables are constrained to Curitiba.
DO $$
DECLARE
  v_table_name TEXT;
  v_constraint_name TEXT;
BEGIN
  FOREACH v_table_name IN ARRAY ARRAY[
    'curitiba_profiles',
    'curitiba_reports',
    'curitiba_news',
    'curitiba_work_orders',
    'curitiba_work_order_history'
  ] LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN city_id SET DEFAULT %L',
      v_table_name,
      'curitiba-pr'
    );

    v_constraint_name := v_table_name || '_city_id_fkey';
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = format('public.%I', v_table_name)::regclass
        AND conname = v_constraint_name
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (city_id) REFERENCES public.cities(id)',
        v_table_name,
        v_constraint_name
      );
    END IF;

    v_constraint_name := v_table_name || '_city_id_check';
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = format('public.%I', v_table_name)::regclass
        AND conname = v_constraint_name
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (city_id = %L)',
        v_table_name,
        v_constraint_name,
        'curitiba-pr'
      );
    END IF;

    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I(city_id)',
      'idx_' || v_table_name || '_city_id',
      v_table_name
    );
  END LOOP;
END;
$$;

-- Shared Auth-to-city index; remains private until its SELECT policy is added.
CREATE TABLE IF NOT EXISTS public.city_memberships (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  city_id TEXT NOT NULL REFERENCES public.cities(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fail closed while the next phase installs and reviews the matching policies.
DO $$
DECLARE
  v_table_name TEXT;
BEGIN
  FOREACH v_table_name IN ARRAY ARRAY[
    'curitiba_profiles',
    'curitiba_reports',
    'curitiba_news',
    'curitiba_work_orders',
    'curitiba_work_order_history'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', v_table_name);
  END LOOP;
END;
$$;

ALTER TABLE public.city_memberships ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.city_memberships FROM PUBLIC, anon, authenticated;
