-- DRAFT ONLY: do not apply this file as a migration.
-- It contains pre-staging Auth/RLS work that must be revised and split into later phases.
-- The empty-table phase is already tracked in supabase/migrations/20261110190928_create_curitiba_city_tables.sql.

-- Unified Commuaria Supabase project with physically separated city tables.
--
-- Safety contract:
-- * Existing public.profiles, public.reports, public.news, public.work_orders,
--   public.work_order_history rows are not updated, deleted, or copied.
-- * Araucaria continues to use those existing tables.
-- * Curitiba receives a dedicated, empty table set in this project.
-- * Existing Curitiba-project records are intentionally not copied by this schema
--   migration; data/auth cutover must be a separate, verified operation.

BEGIN;

-- Insert only Curitiba's registry row. A pre-existing row is left untouched.
INSERT INTO public.cities (
  id, ibge_code, name, state, is_active, center_lat, center_lng,
  default_zoom, bounds, boundary_geojson, description
) VALUES (
  'curitiba-pr', '4106902', 'Curitiba', 'PR', TRUE,
  -25.49466, -49.286897, 12,
  $curitiba_bounds$[[-25.6849,-49.4288],[-25.30442,-49.145]]$curitiba_bounds$::jsonb,
  $curitiba_geojson${"type":"Feature","properties":{"id":"curitiba-pr","ibge_code":"4106902","name":"Curitiba","state":"PR"},"geometry":{"type":"Polygon","coordinates":[[[-49.2730027422,-25.3444243332],[-49.239699359,-25.3511014634],[-49.2286393562,-25.3502958512],[-49.221621916,-25.363729866],[-49.2123858105,-25.3615975953],[-49.2082002967,-25.365751758],[-49.2038854118,-25.3819086502],[-49.1945053752,-25.37808889],[-49.1930475732,-25.3900951899],[-49.1974878718,-25.4252421922],[-49.2024336004,-25.4310272236],[-49.1977701292,-25.4501543425],[-49.185039387,-25.4712618235],[-49.1849981945,-25.4774795999],[-49.2082058753,-25.5152097892],[-49.2164993547,-25.5213570423],[-49.2164319701,-25.5301663375],[-49.225310652,-25.5377563198],[-49.2226378835,-25.5475212298],[-49.2260663492,-25.5538070661],[-49.2214937984,-25.5572169278],[-49.2220494019,-25.5611251287],[-49.2366465487,-25.5634164063],[-49.2389755118,-25.5664382168],[-49.2398245613,-25.5676547046],[-49.2447513352,-25.5745644311],[-49.2427257152,-25.5854226073],[-49.2495052679,-25.5870123795],[-49.2495356678,-25.5924347911],[-49.2539072279,-25.5901705397],[-49.2572923793,-25.5968580707],[-49.2702753794,-25.6019856751],[-49.2664522236,-25.6064541894],[-49.2704991203,-25.6117208363],[-49.2853952708,-25.6105317906],[-49.2884082129,-25.6141200037],[-49.2946586342,-25.6135579246],[-49.2951111389,-25.6163954218],[-49.3018453276,-25.6136083887],[-49.3091466414,-25.6189784938],[-49.3114291928,-25.6154854224],[-49.3153968672,-25.6185011143],[-49.3109726719,-25.6236668978],[-49.3153365073,-25.6227219995],[-49.3256593379,-25.6285879669],[-49.322617679,-25.632361494],[-49.3386851081,-25.6307452565],[-49.3427194011,-25.6371755581],[-49.3453892004,-25.6329330371],[-49.3480769094,-25.6382304559],[-49.3515617009,-25.6353198538],[-49.3547981626,-25.6448963003],[-49.3594009873,-25.64296323],[-49.3650490692,-25.6405108987],[-49.356782109,-25.6079722188],[-49.3519507607,-25.604785152],[-49.3450282615,-25.582506733],[-49.3421537798,-25.579045586],[-49.3444361623,-25.5672581689],[-49.3417817812,-25.5541691327],[-49.3456410609,-25.541848846],[-49.3402288644,-25.5353995242],[-49.3434884144,-25.531177298],[-49.3379917449,-25.5145562168],[-49.3485163087,-25.5197505249],[-49.3585273612,-25.5197212667],[-49.3739800783,-25.5129345651],[-49.3715960689,-25.4965104772],[-49.3786259236,-25.4898223131],[-49.3843388043,-25.4822393063],[-49.3818240849,-25.4684118725],[-49.3859682637,-25.4629180019],[-49.3809820678,-25.4521128291],[-49.3879956215,-25.4432568445],[-49.3851434864,-25.4406550348],[-49.3887950395,-25.4346374457],[-49.3830016009,-25.418389535],[-49.3761295576,-25.4114817462],[-49.3736820727,-25.3974312888],[-49.3636668803,-25.394017809],[-49.3593436668,-25.3861716972],[-49.3479039639,-25.3729152733],[-49.3408439296,-25.3593632831],[-49.3401391284,-25.3495033675],[-49.335577758,-25.3551352255],[-49.3146838399,-25.379153031],[-49.3032120756,-25.3841774846],[-49.3037805067,-25.3796710119],[-49.2972563442,-25.3746170131],[-49.2854804217,-25.3786089008],[-49.2867714714,-25.3705433404],[-49.2812366379,-25.364211567],[-49.2838830543,-25.3630873576],[-49.2799669631,-25.3578044385],[-49.2814635905,-25.3546483123],[-49.2730027422,-25.3444243332]]]}}$curitiba_geojson$::jsonb,
  'Capital paranaense limítrofe a nordeste de Araucária.'
)
ON CONFLICT (id) DO NOTHING;

-- Start each Curitiba table from the current Araucaria-compatible shape, without
-- copying any rows or foreign keys from the source tables.
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

-- Profiles copied from another Auth project may exist before their account is
-- re-established in the shared Auth project. Keep their stable profile id and use
-- auth_user_id as the optional link to the unified Auth identity.
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

-- A city table can only contain rows for its own tenant. These changes apply to
-- the new Curitiba tables only; no existing Araucaria table is altered.
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

-- Future city ids use the same naming convention. Araucaria remains mapped to its
-- original public tables; e.g. campo-largo-pr -> campo_largo_profiles.
CREATE OR REPLACE FUNCTION public.city_data_table_name(
  p_city_id TEXT,
  p_resource TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_prefix TEXT;
BEGIN
  IF p_resource NOT IN (
    'profiles', 'reports', 'news', 'work_orders', 'work_order_history'
  ) THEN
    RAISE EXCEPTION 'Recurso municipal inválido.';
  END IF;

  IF p_city_id = 'araucaria-pr' THEN
    RETURN p_resource;
  END IF;

  IF p_city_id IS NULL OR p_city_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'Identificador municipal inválido.';
  END IF;

  v_prefix := regexp_replace(lower(p_city_id), '-[a-z]{2}$', '');
  v_prefix := trim(both '_' from regexp_replace(v_prefix, '[^a-z0-9]+', '_', 'g'));
  IF v_prefix = '' OR v_prefix !~ '^[a-z][a-z0-9_]*$' THEN
    RAISE EXCEPTION 'Prefixo municipal inválido.';
  END IF;

  RETURN v_prefix || '_' || p_resource;
END;
$$;

REVOKE ALL ON FUNCTION public.city_data_table_name(TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- Minimal shared membership index for automatic city identification. No existing
-- profiles are copied into this table; current_user_city_id falls back to the
-- current Araucaria profile for existing users.
CREATE TABLE IF NOT EXISTS public.city_memberships (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  city_id TEXT NOT NULL REFERENCES public.cities(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.city_memberships ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.city_memberships TO authenticated;

-- Keep the existing global-admin flags and allowlist, honor account blocks, and
-- require an allowlisted identity to match a verified Auth email (profile.email is
-- user-editable in the legacy table and is not an authorization credential by itself).
CREATE OR REPLACE FUNCTION public.is_active_global_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_active_admin BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT (
    (
      COALESCE(p.is_admin, FALSE) = TRUE
      OR p.role = 'admin'
      OR (
        lower(COALESCE(p.email, '')) IN (
          'projetocomnuaria@gmail.com', 'antonioadm@gmail.com', 'admin@commuaria.com'
        )
        AND lower(COALESCE(u.email, '')) = lower(COALESCE(p.email, ''))
        AND u.email_confirmed_at IS NOT NULL
      )
    )
    AND COALESCE(p.is_blocked, FALSE) = FALSE
  )
  INTO v_is_active_admin
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.id = auth.uid();

  RETURN COALESCE(v_is_active_admin, FALSE);
END;
$$;

REVOKE ALL ON FUNCTION public.is_active_global_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_global_admin() TO anon, authenticated;

-- Keep legacy policies and database functions on the same authoritative active-admin check.
CREATE OR REPLACE FUNCTION public.is_global_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_active_global_admin();
$$;

REVOKE ALL ON FUNCTION public.is_global_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_global_admin() TO anon, authenticated;

DROP POLICY IF EXISTS city_memberships_read_own_or_global ON public.city_memberships;
CREATE POLICY city_memberships_read_own_or_global
  ON public.city_memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_active_global_admin());

CREATE OR REPLACE FUNCTION public.current_user_city_id()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_city_id TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT cm.city_id
  INTO v_city_id
  FROM public.city_memberships cm
  WHERE cm.user_id = auth.uid();

  IF v_city_id IS NOT NULL THEN
    RETURN v_city_id;
  END IF;

  -- Compatibility for every existing Araucaria account; this is read-only and
  -- avoids backfilling or changing any current profile rows.
  SELECT NULLIF(BTRIM(p.city_id), '')
  INTO v_city_id
  FROM public.profiles p
  WHERE p.id = auth.uid();

  RETURN v_city_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_city_id() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_city_data_manager(p_city_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_table_name TEXT;
  v_has_auth_user_id BOOLEAN := FALSE;
  v_can_manage BOOLEAN := FALSE;
BEGIN
  IF auth.uid() IS NULL OR p_city_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF public.is_active_global_admin() THEN
    RETURN TRUE;
  END IF;
  IF public.current_user_city_id() IS DISTINCT FROM p_city_id THEN
    RETURN FALSE;
  END IF;

  v_table_name := public.city_data_table_name(p_city_id, 'profiles');
  IF to_regclass(format('public.%I', v_table_name)) IS NULL THEN
    RETURN FALSE;
  END IF;

  IF p_city_id = 'araucaria-pr' THEN
    SELECT COALESCE(bool_or(p.role IN ('supervisor', 'diretor')), FALSE)
    INTO v_can_manage
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.city_id = p_city_id;
  ELSE
    SELECT EXISTS (
      SELECT 1
      FROM pg_attribute a
      WHERE a.attrelid = to_regclass(format('public.%I', v_table_name))
        AND a.attname = 'auth_user_id'
        AND a.attnum > 0
        AND NOT a.attisdropped
    )
    INTO v_has_auth_user_id;

    IF v_has_auth_user_id THEN
      EXECUTE format(
        'SELECT COALESCE(bool_or(role IN (''supervisor'', ''diretor'')), FALSE) FROM public.%I WHERE (id = $1 OR auth_user_id = $1) AND city_id = $2',
        v_table_name
      )
      INTO v_can_manage
      USING auth.uid(), p_city_id;
    ELSE
      EXECUTE format(
        'SELECT COALESCE(bool_or(role IN (''supervisor'', ''diretor'')), FALSE) FROM public.%I WHERE id = $1 AND city_id = $2',
        v_table_name
      )
      INTO v_can_manage
      USING auth.uid(), p_city_id;
    END IF;
  END IF;

  RETURN COALESCE(v_can_manage, FALSE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_city_data_manager(TEXT) TO authenticated;

-- Auth signups continue to create Araucaria profiles in the unchanged legacy
-- table. Other cities write only to their prefixed profiles table and membership.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_city_id TEXT;
  v_city_active BOOLEAN;
  v_profile_table TEXT;
  v_profile_id UUID;
  v_profile_auth_user_id UUID;
  v_match_count BIGINT;
  v_existing_membership_city_id TEXT;
BEGIN
  v_city_id := NULLIF(BTRIM(COALESCE(NEW.raw_user_meta_data->>'city_id', '')), '');
  IF v_city_id IS NULL THEN
    v_city_id := 'araucaria-pr';
  END IF;

  SELECT c.is_active
  INTO v_city_active
  FROM public.cities c
  WHERE c.id = v_city_id;
  IF v_city_active IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'O município informado não está ativo na plataforma.';
  END IF;

  IF v_city_id = 'araucaria-pr' THEN
    INSERT INTO public.profiles (id, name, email, role, city_id)
    VALUES (
      NEW.id,
      COALESCE(NULLIF(BTRIM(NEW.raw_user_meta_data->>'name'), ''), 'Cidadão'),
      NEW.email,
      'user',
      v_city_id
    )
    ON CONFLICT (id) DO NOTHING;
  ELSE
    v_profile_table := public.city_data_table_name(v_city_id, 'profiles');
    IF to_regclass(format('public.%I', v_profile_table)) IS NULL THEN
      RAISE EXCEPTION 'As tabelas do município % ainda não foram preparadas.', v_city_id;
    END IF;

    -- If a Curitiba profile was imported before its Auth account, link it by
    -- email without replacing its stable profile id or municipal role.
    IF NEW.email IS NOT NULL THEN
      EXECUTE format(
        'SELECT id, auth_user_id, count(*) OVER () FROM public.%I WHERE id = $1 OR auth_user_id = $1 OR (email IS NOT NULL AND lower(email) = lower($2)) ORDER BY COALESCE(auth_user_id = $1, FALSE) DESC, (id = $1) DESC LIMIT 2',
        v_profile_table
      )
      INTO v_profile_id, v_profile_auth_user_id, v_match_count
      USING NEW.id, NEW.email;
    ELSE
      EXECUTE format(
        'SELECT id, auth_user_id, count(*) OVER () FROM public.%I WHERE id = $1 OR auth_user_id = $1 LIMIT 2',
        v_profile_table
      )
      INTO v_profile_id, v_profile_auth_user_id, v_match_count
      USING NEW.id;
    END IF;

    IF COALESCE(v_match_count, 0) > 1 THEN
      RAISE EXCEPTION 'Mais de um perfil corresponde a esta conta no município %.', v_city_id;
    ELSIF v_profile_id IS NOT NULL THEN
      IF v_profile_auth_user_id IS NOT NULL AND v_profile_auth_user_id <> NEW.id THEN
        RAISE EXCEPTION 'O perfil municipal já está vinculado a outra conta.';
      END IF;
      EXECUTE format(
        'UPDATE public.%I SET auth_user_id = $1 WHERE id = $2 AND (auth_user_id IS NULL OR auth_user_id = $1)',
        v_profile_table
      )
      USING NEW.id, v_profile_id;
    ELSE
      EXECUTE format(
        'INSERT INTO public.%I (id, auth_user_id, name, email, is_admin, role, city_id) VALUES ($1, $1, $2, $3, FALSE, ''user'', $4)',
        v_profile_table
      )
      USING
        NEW.id,
        COALESCE(NULLIF(BTRIM(NEW.raw_user_meta_data->>'name'), ''), 'Cidadão'),
        NEW.email,
        v_city_id;
    END IF;
  END IF;

  SELECT cm.city_id
  INTO v_existing_membership_city_id
  FROM public.city_memberships cm
  WHERE cm.user_id = NEW.id;
  IF v_existing_membership_city_id IS NOT NULL
    AND v_existing_membership_city_id <> v_city_id THEN
    RAISE EXCEPTION 'A conta já está vinculada a outro município.';
  END IF;

  INSERT INTO public.city_memberships (user_id, city_id)
  VALUES (NEW.id, v_city_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Global ADM can manage municipal profiles but cannot rewrite protected global-admin
-- identities, create another global ADM, or change a profile's tenant/auth identity.
-- Other users may only update their own display name and cannot alter authorization data.
CREATE OR REPLACE FUNCTION public.protect_city_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.is_active_global_admin() THEN
    IF COALESCE(OLD.is_admin, FALSE)
      OR OLD.role = 'admin'
      OR lower(COALESCE(OLD.email, '')) IN (
        'projetocomnuaria@gmail.com', 'antonioadm@gmail.com', 'admin@commuaria.com'
      ) THEN
      RAISE EXCEPTION 'O perfil ADM Global está protegido e não pode ser alterado.';
    END IF;

    IF NEW.role IS NULL
      OR NEW.role NOT IN ('user', 'funcionario', 'supervisor', 'diretor')
      OR COALESCE(NEW.is_admin, FALSE)
      OR lower(COALESCE(NEW.email, '')) IN (
        'projetocomnuaria@gmail.com', 'antonioadm@gmail.com', 'admin@commuaria.com'
      ) THEN
      RAISE EXCEPTION 'Não é permitido criar ou promover um ADM Global neste município.';
    END IF;

    NEW.id := OLD.id;
    NEW.auth_user_id := OLD.auth_user_id;
    NEW.email := OLD.email;
    NEW.city_id := OLD.city_id;
    NEW.is_admin := FALSE;
    RETURN NEW;
  END IF;

  IF OLD.id <> auth.uid() AND OLD.auth_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Não é permitido atualizar o perfil de outro usuário.';
  END IF;

  NEW.id := OLD.id;
  NEW.auth_user_id := OLD.auth_user_id;
  NEW.email := OLD.email;
  NEW.city_id := OLD.city_id;
  NEW.role := OLD.role;
  NEW.assigned_category := OLD.assigned_category;
  NEW.is_admin := OLD.is_admin;
  NEW.is_blocked := OLD.is_blocked;
  NEW.blocked_until := OLD.blocked_until;
  NEW.block_reason := OLD.block_reason;
  NEW.blocked_at := OLD.blocked_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_curitiba_profile_update ON public.curitiba_profiles;
CREATE TRIGGER trg_protect_curitiba_profile_update
  BEFORE UPDATE ON public.curitiba_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_city_profile_update();

-- Curitiba profile access is explicit: global ADM, municipal managers, and the
-- account owner can read. Only active global ADM can manage other accounts.
ALTER TABLE public.curitiba_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.curitiba_profiles TO authenticated;

DROP POLICY IF EXISTS curitiba_profiles_read ON public.curitiba_profiles;
CREATE POLICY curitiba_profiles_read
  ON public.curitiba_profiles FOR SELECT TO authenticated
  USING (
    public.is_active_global_admin()
    OR public.is_city_data_manager(city_id)
    OR auth.uid() = id
    OR auth.uid() = auth_user_id
  );

DROP POLICY IF EXISTS curitiba_profiles_insert ON public.curitiba_profiles;
CREATE POLICY curitiba_profiles_insert
  ON public.curitiba_profiles FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_global_admin()
    AND city_id = 'curitiba-pr'
    AND auth_user_id IS NULL
    AND role IN ('user', 'funcionario', 'supervisor', 'diretor')
    AND COALESCE(is_admin, FALSE) = FALSE
    AND lower(COALESCE(email, '')) NOT IN (
      'projetocomnuaria@gmail.com', 'antonioadm@gmail.com', 'admin@commuaria.com'
    )
  );

DROP POLICY IF EXISTS curitiba_profiles_update ON public.curitiba_profiles;
CREATE POLICY curitiba_profiles_update
  ON public.curitiba_profiles FOR UPDATE TO authenticated
  USING (
    (
      public.is_active_global_admin()
      AND NOT COALESCE(is_admin, FALSE)
      AND role IS DISTINCT FROM 'admin'
      AND lower(COALESCE(email, '')) NOT IN (
        'projetocomnuaria@gmail.com', 'antonioadm@gmail.com', 'admin@commuaria.com'
      )
    )
    OR auth.uid() = id
    OR auth.uid() = auth_user_id
  )
  WITH CHECK (
    city_id = 'curitiba-pr'
    AND role IN ('user', 'funcionario', 'supervisor', 'diretor')
    AND COALESCE(is_admin, FALSE) = FALSE
    AND lower(COALESCE(email, '')) NOT IN (
      'projetocomnuaria@gmail.com', 'antonioadm@gmail.com', 'admin@commuaria.com'
    )
    AND (
      public.is_active_global_admin()
      OR auth.uid() = id
      OR auth.uid() = auth_user_id
    )
  );

DROP POLICY IF EXISTS curitiba_profiles_delete ON public.curitiba_profiles;
CREATE POLICY curitiba_profiles_delete
  ON public.curitiba_profiles FOR DELETE TO authenticated
  USING (
    public.is_active_global_admin()
    AND NOT COALESCE(is_admin, FALSE)
    AND role IS DISTINCT FROM 'admin'
    AND lower(COALESCE(email, '')) NOT IN (
      'projetocomnuaria@gmail.com', 'antonioadm@gmail.com', 'admin@commuaria.com'
    )
  );

-- City-private operational tables. The public map uses the sanitized RPC below;
-- it never gets direct access to report owner, email, or unredacted address fields.
ALTER TABLE public.curitiba_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curitiba_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curitiba_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curitiba_work_order_history ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.curitiba_reports TO authenticated;
GRANT INSERT ON public.curitiba_reports TO anon;
GRANT SELECT ON public.curitiba_news TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.curitiba_news TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.curitiba_work_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.curitiba_work_order_history TO authenticated;

DROP POLICY IF EXISTS curitiba_reports_read_city ON public.curitiba_reports;
CREATE POLICY curitiba_reports_read_city
  ON public.curitiba_reports FOR SELECT TO authenticated
  USING (
    public.is_active_global_admin()
    OR public.current_user_city_id() = 'curitiba-pr'
  );

DROP POLICY IF EXISTS curitiba_reports_insert_city ON public.curitiba_reports;
CREATE POLICY curitiba_reports_insert_city
  ON public.curitiba_reports FOR INSERT TO anon, authenticated
  WITH CHECK (
    city_id = 'curitiba-pr'
    AND (
      (auth.uid() IS NULL AND user_id IS NULL)
      OR public.is_active_global_admin()
      OR (
        public.current_user_city_id() = 'curitiba-pr'
        AND (
          user_id IS NULL
          OR user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.curitiba_profiles p
            WHERE p.id = curitiba_reports.user_id
              AND p.auth_user_id = auth.uid()
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS curitiba_reports_update_city ON public.curitiba_reports;
CREATE POLICY curitiba_reports_update_city
  ON public.curitiba_reports FOR UPDATE TO authenticated
  USING (
    public.is_active_global_admin()
    OR public.current_user_city_id() = 'curitiba-pr'
  )
  WITH CHECK (
    city_id = 'curitiba-pr'
    AND (
      public.is_active_global_admin()
      OR public.current_user_city_id() = 'curitiba-pr'
    )
  );

DROP POLICY IF EXISTS curitiba_reports_delete_city ON public.curitiba_reports;
CREATE POLICY curitiba_reports_delete_city
  ON public.curitiba_reports FOR DELETE TO authenticated
  USING (
    public.is_active_global_admin()
    OR public.current_user_city_id() = 'curitiba-pr'
  );

DROP POLICY IF EXISTS curitiba_news_read_public ON public.curitiba_news;
CREATE POLICY curitiba_news_read_public
  ON public.curitiba_news FOR SELECT TO anon, authenticated
  USING (city_id = 'curitiba-pr');

DROP POLICY IF EXISTS curitiba_news_manage_city ON public.curitiba_news;
CREATE POLICY curitiba_news_manage_city
  ON public.curitiba_news FOR ALL TO authenticated
  USING (
    city_id = 'curitiba-pr'
    AND (
      public.is_active_global_admin()
      OR public.is_city_data_manager('curitiba-pr')
    )
  )
  WITH CHECK (
    city_id = 'curitiba-pr'
    AND (
      public.is_active_global_admin()
      OR public.is_city_data_manager('curitiba-pr')
    )
  );

DROP POLICY IF EXISTS curitiba_work_orders_city_access ON public.curitiba_work_orders;
CREATE POLICY curitiba_work_orders_city_access
  ON public.curitiba_work_orders FOR ALL TO authenticated
  USING (
    city_id = 'curitiba-pr'
    AND (
      public.is_active_global_admin()
      OR public.current_user_city_id() = 'curitiba-pr'
    )
  )
  WITH CHECK (
    city_id = 'curitiba-pr'
    AND (
      public.is_active_global_admin()
      OR public.current_user_city_id() = 'curitiba-pr'
    )
  );

DROP POLICY IF EXISTS curitiba_work_order_history_city_access ON public.curitiba_work_order_history;
CREATE POLICY curitiba_work_order_history_city_access
  ON public.curitiba_work_order_history FOR ALL TO authenticated
  USING (
    city_id = 'curitiba-pr'
    AND (
      public.is_active_global_admin()
      OR public.current_user_city_id() = 'curitiba-pr'
    )
  )
  WITH CHECK (
    city_id = 'curitiba-pr'
    AND (
      public.is_active_global_admin()
      OR public.current_user_city_id() = 'curitiba-pr'
    )
  );

-- Route the existing privacy-safe public map RPC to the table set selected by city.
CREATE OR REPLACE FUNCTION public.get_public_city_reports(p_city_id TEXT)
RETURNS TABLE (
  id UUID,
  city_id TEXT,
  category TEXT,
  title TEXT,
  short_description TEXT,
  public_location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_table_name TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.cities c
    WHERE c.id = p_city_id AND c.is_active = TRUE
  ) THEN
    RETURN;
  END IF;

  v_table_name := public.city_data_table_name(p_city_id, 'reports');
  IF to_regclass(format('public.%I', v_table_name)) IS NULL THEN
    RETURN;
  END IF;

  -- Match the existing privacy projection: no user-written title/description,
  -- PII-scrubbed location, allowlisted category, and neighborhood-level points.
  RETURN QUERY EXECUTE format($query$
    WITH input_rows AS (
      SELECT
        r.id,
        r.city_id,
        public.sanitize_public_city_text(
          COALESCE(NULLIF(TRIM(r.category), ''), NULLIF(TRIM(r.maintenance_type), ''), 'Outros'),
          60
        ) AS category_candidate,
        public.sanitize_public_city_text(
          REGEXP_REPLACE(
            COALESCE(r.address, ''),
            ',?[[:space:]]*(n[ºo.]?[[:space:]]*)?[0-9]{1,5}(?=[[:space:]]*(,|$))',
            '',
            'gi'
          ),
          160
        ) AS safe_location,
        r.latitude,
        r.longitude,
        COALESCE(r.status, 'unresolved') AS safe_status,
        r.created_at
      FROM public.%I r
      WHERE r.city_id = $1
        AND COALESCE(r.is_work_order, FALSE) = FALSE
        AND r.latitude IS NOT NULL
        AND r.longitude IS NOT NULL
      ORDER BY r.created_at DESC
      LIMIT 250
    ), safe_rows AS (
      SELECT
        input_rows.id,
        input_rows.city_id,
        CASE
          WHEN LOWER(input_rows.category_candidate) IN (
            'pavimentação', 'iluminação pública', 'limpeza urbana',
            'saneamento', 'arborização', 'outros'
          ) THEN input_rows.category_candidate
          ELSE 'Outros'
        END AS safe_category,
        CASE
          WHEN LOWER(input_rows.category_candidate) IN (
            'pavimentação', 'iluminação pública', 'limpeza urbana',
            'saneamento', 'arborização', 'outros'
          ) THEN input_rows.category_candidate || ' registrada nesta região.'
          ELSE 'Ocorrência urbana registrada nesta região.'
        END AS safe_description,
        input_rows.safe_location,
        ROUND(input_rows.latitude::numeric, 3)::double precision AS latitude,
        ROUND(input_rows.longitude::numeric, 3)::double precision AS longitude,
        input_rows.safe_status,
        input_rows.created_at
      FROM input_rows
    )
    SELECT
      safe_rows.id::uuid,
      safe_rows.city_id::text,
      safe_rows.safe_category::text,
      CASE
        WHEN safe_rows.safe_category = 'Outros' THEN 'Ocorrência urbana'
        ELSE safe_rows.safe_category || ' urbana'
      END::text,
      safe_rows.safe_description::text,
      safe_rows.safe_location::text,
      safe_rows.latitude,
      safe_rows.longitude,
      safe_rows.safe_status::text,
      safe_rows.created_at
    FROM safe_rows
  $query$, v_table_name)
  USING p_city_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_city_reports(TEXT) TO anon, authenticated;

COMMIT;
