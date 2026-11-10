-- Phase 2: activate Curitiba in the main project with city-scoped access and shared Auth.
-- The new Curitiba tables remain empty; no records/accounts are copied from another project.
-- Signup creates only a normal user profile and never links/promotes by email.

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


-- Do not derive admin privileges from email: Auth auto-confirm is enabled for this project.
-- Current ADM Global accounts have explicit profile role/is_admin signals; blocks always win.
CREATE OR REPLACE FUNCTION public.is_active_global_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE((
    SELECT (COALESCE(p.is_admin, FALSE) OR p.role = 'admin')
       AND NOT COALESCE(p.is_blocked, FALSE)
    FROM public.profiles p
    WHERE p.id = auth.uid()
  ), FALSE);
$$;

REVOKE ALL ON FUNCTION public.is_active_global_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_global_admin() TO anon, authenticated;

-- Keep existing policies/functions on the same authoritative check.
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

CREATE OR REPLACE FUNCTION public.is_city_active(p_city_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE((
    SELECT c.is_active FROM public.cities c WHERE c.id = p_city_id
  ), FALSE);
$$;

REVOKE ALL ON FUNCTION public.is_city_active(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_city_active(TEXT) TO anon, authenticated;


ALTER TABLE public.city_memberships ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.city_memberships FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.city_memberships TO authenticated;

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
  v_profile_city_id TEXT;
  v_profile_table TEXT;
  v_city_active BOOLEAN;
  v_has_auth_user_id BOOLEAN := FALSE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT cm.city_id
  INTO v_city_id
  FROM public.city_memberships cm
  WHERE cm.user_id = auth.uid();

  IF v_city_id IS NOT NULL THEN
    SELECT c.is_active
    INTO v_city_active
    FROM public.cities c
    WHERE c.id = v_city_id;
    IF v_city_active IS DISTINCT FROM TRUE THEN
      RETURN NULL;
    END IF;

    v_profile_table := public.city_data_table_name(v_city_id, 'profiles');
    IF to_regclass(format('public.%I', v_profile_table)) IS NULL THEN
      RETURN NULL;
    END IF;

    IF v_city_id = 'araucaria-pr' THEN
      SELECT p.city_id
      INTO v_profile_city_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.city_id = v_city_id
        AND NOT COALESCE(p.is_blocked, FALSE);
    ELSE
      SELECT EXISTS (
        SELECT 1
        FROM pg_attribute a
        WHERE a.attrelid = to_regclass(format('public.%I', v_profile_table))
          AND a.attname = 'auth_user_id'
          AND a.attnum > 0
          AND NOT a.attisdropped
      )
      INTO v_has_auth_user_id;

      IF v_has_auth_user_id THEN
        EXECUTE format(
          'SELECT city_id FROM public.%I WHERE (id = $1 OR auth_user_id = $1) AND city_id = $2 AND NOT COALESCE(is_blocked, FALSE) LIMIT 1',
          v_profile_table
        )
        INTO v_profile_city_id
        USING auth.uid(), v_city_id;
      ELSE
        EXECUTE format(
          'SELECT city_id FROM public.%I WHERE id = $1 AND city_id = $2 AND NOT COALESCE(is_blocked, FALSE) LIMIT 1',
          v_profile_table
        )
        INTO v_profile_city_id
        USING auth.uid(), v_city_id;
      END IF;
    END IF;

    RETURN NULLIF(BTRIM(v_profile_city_id), '');
  END IF;

  -- Existing Araucaria accounts keep their legacy profile and need no backfill.
  SELECT NULLIF(BTRIM(p.city_id), '')
  INTO v_city_id
  FROM public.profiles p
  JOIN public.cities c ON c.id = p.city_id AND c.is_active = TRUE
  WHERE p.id = auth.uid()
    AND p.city_id = 'araucaria-pr'
    AND NOT COALESCE(p.is_blocked, FALSE);

  RETURN v_city_id;
END;
$$;

REVOKE ALL ON FUNCTION public.current_user_city_id() FROM PUBLIC, anon, authenticated;
-- Existing legacy RLS expressions invoke this for anonymous requests, where it returns NULL.
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
    SELECT COALESCE(bool_or(p.role IN ('supervisor', 'diretor') AND NOT COALESCE(p.is_blocked, FALSE)), FALSE)
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
        'SELECT COALESCE(bool_or(role IN (''supervisor'', ''diretor'') AND NOT COALESCE(is_blocked, FALSE)), FALSE) FROM public.%I WHERE (id = $1 OR auth_user_id = $1) AND city_id = $2',
        v_table_name
      )
      INTO v_can_manage
      USING auth.uid(), p_city_id;
    ELSE
      EXECUTE format(
        'SELECT COALESCE(bool_or(role IN (''supervisor'', ''diretor'') AND NOT COALESCE(is_blocked, FALSE)), FALSE) FROM public.%I WHERE id = $1 AND city_id = $2',
        v_table_name
      )
      INTO v_can_manage
      USING auth.uid(), p_city_id;
    END IF;
  END IF;

  RETURN COALESCE(v_can_manage, FALSE);
END;
$$;

REVOKE ALL ON FUNCTION public.is_city_data_manager(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_city_data_manager(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_curitiba_work_order_assignee(p_assigned_employee_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL
    AND p_assigned_employee_id IS NOT NULL
    AND public.current_user_city_id() = 'curitiba-pr'
    AND EXISTS (
      SELECT 1
      FROM public.curitiba_profiles p
      WHERE p.city_id = 'curitiba-pr'
        AND (p.auth_user_id = auth.uid() OR p.id = auth.uid())
        AND (p.id::text = p_assigned_employee_id OR p.auth_user_id::text = p_assigned_employee_id)
        AND p.role = 'funcionario'
        AND NOT COALESCE(p.is_blocked, FALSE)
    );
$$;


REVOKE ALL ON FUNCTION public.is_curitiba_work_order_assignee(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_curitiba_work_order_assignee(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.current_user_owns_curitiba_profile(p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL
    AND p_profile_id IS NOT NULL
    AND public.current_user_city_id() = 'curitiba-pr'
    AND EXISTS (
      SELECT 1
      FROM public.curitiba_profiles p
      WHERE p.id = p_profile_id
        AND p.city_id = 'curitiba-pr'
        AND (p.auth_user_id = auth.uid() OR p.id = auth.uid())
        AND NOT COALESCE(p.is_blocked, FALSE)
    );
$$;

REVOKE ALL ON FUNCTION public.current_user_owns_curitiba_profile(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_owns_curitiba_profile(UUID) TO anon, authenticated;


-- New Curitiba Auth users always start with the least-privileged role.
-- No profile or admin privilege is claimed by matching an unverified email address.
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
  v_existing_membership_city_id TEXT;
BEGIN
  v_city_id := NULLIF(BTRIM(COALESCE(NEW.raw_user_meta_data->>'city_id', '')), '');
  IF v_city_id IS NULL THEN
    v_city_id := 'araucaria-pr';
  END IF;

  SELECT c.is_active INTO v_city_active
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

    EXECUTE format(
      'INSERT INTO public.%I (id, auth_user_id, name, email, is_admin, role, city_id) VALUES ($1, $1, $2, $3, FALSE, ''user'', $4) ON CONFLICT (id) DO NOTHING',
      v_profile_table
    )
    USING
      NEW.id,
      COALESCE(NULLIF(BTRIM(NEW.raw_user_meta_data->>'name'), ''), 'Cidadão'),
      NEW.email,
      v_city_id;
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


-- Keep the legacy Araucaria profile table names while protecting identity and admin fields.
CREATE OR REPLACE FUNCTION public.protect_profile_city_and_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_city_active BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT c.is_active INTO v_city_active
    FROM public.cities c
    WHERE c.id = NEW.city_id;
    IF v_city_active IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION 'O município selecionado não está ativo na plataforma.';
    END IF;

    IF public.is_active_global_admin() THEN
      IF NEW.role IS NULL
        OR NEW.role NOT IN ('user', 'funcionario', 'supervisor', 'diretor')
        OR COALESCE(NEW.is_admin, FALSE)
        OR lower(COALESCE(NEW.email, '')) IN (
          'projetocomnuaria@gmail.com', 'antonioadm@gmail.com', 'admin@commuaria.com'
        ) THEN
        RAISE EXCEPTION 'Não é permitido criar outro ADM Global.';
      END IF;
      NEW.is_admin := FALSE;
    ELSE
      IF NEW.id <> auth.uid() THEN
        RAISE EXCEPTION 'Não é permitido criar perfil para outro usuário.';
      END IF;
      NEW.role := 'user';
      NEW.is_admin := FALSE;
    END IF;
    RETURN NEW;
  END IF;

  IF public.is_active_global_admin() THEN
    IF COALESCE(OLD.is_admin, FALSE)
      OR OLD.role = 'admin'
      OR lower(COALESCE(OLD.email, '')) IN (
        'projetocomnuaria@gmail.com', 'antonioadm@gmail.com', 'admin@commuaria.com'
      ) THEN
      RAISE EXCEPTION 'O perfil ADM Global protegido não pode ser alterado.';
    END IF;
    IF NEW.role IS NULL
      OR NEW.role NOT IN ('user', 'funcionario', 'supervisor', 'diretor')
      OR COALESCE(NEW.is_admin, FALSE)
      OR lower(COALESCE(NEW.email, '')) IN (
        'projetocomnuaria@gmail.com', 'antonioadm@gmail.com', 'admin@commuaria.com'
      ) THEN
      RAISE EXCEPTION 'Não é permitido criar ou promover um ADM Global.';
    END IF;

    NEW.id := OLD.id;
    NEW.city_id := OLD.city_id;
    NEW.email := OLD.email;
    NEW.is_admin := FALSE;
    RETURN NEW;
  END IF;

  IF OLD.id <> auth.uid() THEN
    RAISE EXCEPTION 'Não é permitido atualizar o perfil de outro usuário.';
  END IF;

  NEW.id := OLD.id;
  NEW.city_id := OLD.city_id;
  NEW.email := OLD.email;
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

CREATE OR REPLACE FUNCTION public.protect_profile_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN OLD;
  END IF;

  IF COALESCE(OLD.is_admin, FALSE)
    OR OLD.role = 'admin'
    OR lower(COALESCE(OLD.email, '')) IN (
      'projetocomnuaria@gmail.com', 'antonioadm@gmail.com', 'admin@commuaria.com'
    ) THEN
    RAISE EXCEPTION 'O perfil ADM Global protegido não pode ser excluído.';
  END IF;

  IF NOT public.is_active_global_admin() THEN
    RAISE EXCEPTION 'A exclusão de perfis está disponível somente para ADM Global ativo.';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_delete ON public.profiles;
CREATE TRIGGER trg_protect_profile_delete
  BEFORE DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_delete();

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


-- Curitiba profiles are created by the trusted Auth trigger, never by email placeholders.
ALTER TABLE public.curitiba_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.curitiba_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.curitiba_profiles TO authenticated;

DROP POLICY IF EXISTS curitiba_profiles_read ON public.curitiba_profiles;
CREATE POLICY curitiba_profiles_read
  ON public.curitiba_profiles FOR SELECT TO authenticated
  USING (
    city_id = 'curitiba-pr'
    AND (
      public.is_active_global_admin()
      OR public.is_city_data_manager('curitiba-pr')
      OR auth.uid() = id
      OR auth.uid() = auth_user_id
    )
  );

DROP POLICY IF EXISTS curitiba_profiles_insert ON public.curitiba_profiles;

DROP POLICY IF EXISTS curitiba_profiles_update ON public.curitiba_profiles;
CREATE POLICY curitiba_profiles_update
  ON public.curitiba_profiles FOR UPDATE TO authenticated
  USING (
    city_id = 'curitiba-pr'
    AND (
      (
        public.is_active_global_admin()
        AND auth_user_id IS NOT NULL
        AND NOT COALESCE(is_admin, FALSE)
        AND role IS DISTINCT FROM 'admin'
        AND lower(COALESCE(email, '')) NOT IN (
          'projetocomnuaria@gmail.com', 'antonioadm@gmail.com', 'admin@commuaria.com'
        )
      )
      OR auth.uid() = id
      OR auth.uid() = auth_user_id
    )
  )
  WITH CHECK (
    city_id = 'curitiba-pr'
    AND auth_user_id IS NOT NULL
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
    city_id = 'curitiba-pr'
    AND public.is_active_global_admin()
    AND auth_user_id IS NOT NULL
    AND NOT COALESCE(is_admin, FALSE)
    AND role IS DISTINCT FROM 'admin'
    AND lower(COALESCE(email, '')) NOT IN (
      'projetocomnuaria@gmail.com', 'antonioadm@gmail.com', 'admin@commuaria.com'
    )
  );

-- Operational tables stay private; only the sanitizing RPC below is available to the public map.
ALTER TABLE public.curitiba_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curitiba_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curitiba_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curitiba_work_order_history ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.curitiba_reports,
  public.curitiba_news,
  public.curitiba_work_orders,
  public.curitiba_work_order_history
FROM PUBLIC, anon, authenticated;

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
    city_id = 'curitiba-pr'
    AND (
      public.is_active_global_admin()
      OR public.is_city_data_manager('curitiba-pr')
      OR (
        public.current_user_city_id() = 'curitiba-pr'
        AND (
          user_id = auth.uid()
          OR public.current_user_owns_curitiba_profile(user_id)
        )
      )
    )
  );

DROP POLICY IF EXISTS curitiba_reports_insert_city ON public.curitiba_reports;
CREATE POLICY curitiba_reports_insert_city
  ON public.curitiba_reports FOR INSERT TO anon, authenticated
  WITH CHECK (
    city_id = 'curitiba-pr'
    AND public.is_city_active('curitiba-pr')
    AND (
      (auth.uid() IS NULL AND user_id IS NULL)
      OR public.is_active_global_admin()
      OR (
        public.current_user_city_id() = 'curitiba-pr'
        AND (
          user_id IS NULL
          OR user_id = auth.uid()
          OR public.current_user_owns_curitiba_profile(user_id)
        )
      )
    )
  );

DROP POLICY IF EXISTS curitiba_reports_update_city ON public.curitiba_reports;
CREATE POLICY curitiba_reports_update_city
  ON public.curitiba_reports FOR UPDATE TO authenticated
  USING (
    city_id = 'curitiba-pr'
    AND public.is_city_data_manager('curitiba-pr')
  )
  WITH CHECK (
    city_id = 'curitiba-pr'
    AND public.is_city_data_manager('curitiba-pr')
  );

DROP POLICY IF EXISTS curitiba_reports_delete_city ON public.curitiba_reports;
CREATE POLICY curitiba_reports_delete_city
  ON public.curitiba_reports FOR DELETE TO authenticated
  USING (
    city_id = 'curitiba-pr'
    AND public.is_city_data_manager('curitiba-pr')
  );

DROP POLICY IF EXISTS curitiba_news_read_public ON public.curitiba_news;
CREATE POLICY curitiba_news_read_public
  ON public.curitiba_news FOR SELECT TO anon, authenticated
  USING (
    city_id = 'curitiba-pr'
    AND public.is_city_active('curitiba-pr')
  );

DROP POLICY IF EXISTS curitiba_news_manage_city ON public.curitiba_news;
CREATE POLICY curitiba_news_manage_city
  ON public.curitiba_news FOR ALL TO authenticated
  USING (
    city_id = 'curitiba-pr'
    AND public.is_city_data_manager('curitiba-pr')
  )
  WITH CHECK (
    city_id = 'curitiba-pr'
    AND public.is_city_data_manager('curitiba-pr')
  );

DROP POLICY IF EXISTS curitiba_work_orders_read_assigned ON public.curitiba_work_orders;
CREATE POLICY curitiba_work_orders_read_assigned
  ON public.curitiba_work_orders FOR SELECT TO authenticated
  USING (
    city_id = 'curitiba-pr'
    AND (
      public.is_city_data_manager('curitiba-pr')
      OR public.is_curitiba_work_order_assignee(assigned_employee_id)
    )
  );

DROP POLICY IF EXISTS curitiba_work_orders_insert_manager ON public.curitiba_work_orders;
CREATE POLICY curitiba_work_orders_insert_manager
  ON public.curitiba_work_orders FOR INSERT TO authenticated
  WITH CHECK (
    city_id = 'curitiba-pr'
    AND public.is_city_data_manager('curitiba-pr')
  );

DROP POLICY IF EXISTS curitiba_work_orders_update_assigned ON public.curitiba_work_orders;
CREATE POLICY curitiba_work_orders_update_assigned
  ON public.curitiba_work_orders FOR UPDATE TO authenticated
  USING (
    city_id = 'curitiba-pr'
    AND (
      public.is_city_data_manager('curitiba-pr')
      OR public.is_curitiba_work_order_assignee(assigned_employee_id)
    )
  )
  WITH CHECK (
    city_id = 'curitiba-pr'
    AND (
      public.is_city_data_manager('curitiba-pr')
      OR public.is_curitiba_work_order_assignee(assigned_employee_id)
    )
  );

DROP POLICY IF EXISTS curitiba_work_orders_delete_manager ON public.curitiba_work_orders;
CREATE POLICY curitiba_work_orders_delete_manager
  ON public.curitiba_work_orders FOR DELETE TO authenticated
  USING (
    city_id = 'curitiba-pr'
    AND public.is_city_data_manager('curitiba-pr')
  );

DROP POLICY IF EXISTS curitiba_work_order_history_read_assigned ON public.curitiba_work_order_history;
CREATE POLICY curitiba_work_order_history_read_assigned
  ON public.curitiba_work_order_history FOR SELECT TO authenticated
  USING (
    city_id = 'curitiba-pr'
    AND EXISTS (
      SELECT 1
      FROM public.curitiba_work_orders wo
      WHERE wo.id::text = curitiba_work_order_history.work_order_id
        AND wo.city_id = 'curitiba-pr'
        AND (
          public.is_city_data_manager('curitiba-pr')
          OR public.is_curitiba_work_order_assignee(wo.assigned_employee_id)
        )
    )
  );

DROP POLICY IF EXISTS curitiba_work_order_history_insert_assigned ON public.curitiba_work_order_history;
CREATE POLICY curitiba_work_order_history_insert_assigned
  ON public.curitiba_work_order_history FOR INSERT TO authenticated
  WITH CHECK (
    city_id = 'curitiba-pr'
    AND EXISTS (
      SELECT 1
      FROM public.curitiba_work_orders wo
      WHERE wo.id::text = curitiba_work_order_history.work_order_id
        AND wo.city_id = 'curitiba-pr'
        AND (
          public.is_city_data_manager('curitiba-pr')
          OR public.is_curitiba_work_order_assignee(wo.assigned_employee_id)
        )
    )
  );

DROP POLICY IF EXISTS curitiba_work_order_history_update_manager ON public.curitiba_work_order_history;
CREATE POLICY curitiba_work_order_history_update_manager
  ON public.curitiba_work_order_history FOR UPDATE TO authenticated
  USING (
    city_id = 'curitiba-pr'
    AND public.is_city_data_manager('curitiba-pr')
  )
  WITH CHECK (
    city_id = 'curitiba-pr'
    AND public.is_city_data_manager('curitiba-pr')
  );

DROP POLICY IF EXISTS curitiba_work_order_history_delete_manager ON public.curitiba_work_order_history;
CREATE POLICY curitiba_work_order_history_delete_manager
  ON public.curitiba_work_order_history FOR DELETE TO authenticated
  USING (
    city_id = 'curitiba-pr'
    AND public.is_city_data_manager('curitiba-pr')
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

REVOKE ALL ON FUNCTION public.get_public_city_reports(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_city_reports(TEXT) TO anon, authenticated;


-- Register Curitiba only after its routing, Auth trigger, and policies are installed.
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
