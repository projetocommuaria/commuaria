-- Curitiba Supabase bootstrap, modeled on the current Commuaria/Araucaria schema.
-- This creates structure and Curitiba's municipal metadata only. It intentionally
-- does not copy auth users, profiles, reports, news, work orders, or history rows.
-- Tenant defaults are Curitiba-specific; the Araucaria project is not modified.

CREATE TABLE public.cities (
  id TEXT PRIMARY KEY,
  ibge_code TEXT UNIQUE,
  name TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'PR',
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  default_zoom INTEGER NOT NULL DEFAULT 12,
  bounds JSONB,
  boundary_geojson JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cities_is_active ON public.cities(is_active);
CREATE INDEX idx_cities_state ON public.cities(state);

INSERT INTO public.cities (
  id, ibge_code, name, state, is_active, center_lat, center_lng,
  default_zoom, bounds, boundary_geojson, description
) VALUES (
  'curitiba-pr', '4106902', 'Curitiba', 'PR', TRUE,
  -25.49466, -49.286897, 12,
  $curitiba_bounds$[[-25.6849,-49.4288],[-25.30442,-49.145]]$curitiba_bounds$::jsonb,
  $curitiba_geojson${"type":"Feature","properties":{"id":"curitiba-pr","ibge_code":"4106902","name":"Curitiba","state":"PR"},"geometry":{"type":"Polygon","coordinates":[[[-49.2730027422,-25.3444243332],[-49.239699359,-25.3511014634],[-49.2286393562,-25.3502958512],[-49.221621916,-25.363729866],[-49.2123858105,-25.3615975953],[-49.2082002967,-25.365751758],[-49.2038854118,-25.3819086502],[-49.1945053752,-25.37808889],[-49.1930475732,-25.3900951899],[-49.1974878718,-25.4252421922],[-49.2024336004,-25.4310272236],[-49.1977701292,-25.4501543425],[-49.185039387,-25.4712618235],[-49.1849981945,-25.4774795999],[-49.2082058753,-25.5152097892],[-49.2164993547,-25.5213570423],[-49.2164319701,-25.5301663375],[-49.225310652,-25.5377563198],[-49.2226378835,-25.5475212298],[-49.2260663492,-25.5538070661],[-49.2214937984,-25.5572169278],[-49.2220494019,-25.5611251287],[-49.2366465487,-25.5634164063],[-49.2389755118,-25.5664382168],[-49.2398245613,-25.5676547046],[-49.2447513352,-25.5745644311],[-49.2427257152,-25.5854226073],[-49.2495052679,-25.5870123795],[-49.2495356678,-25.5924347911],[-49.2539072279,-25.5901705397],[-49.2572923793,-25.5968580707],[-49.2702753794,-25.6019856751],[-49.2664522236,-25.6064541894],[-49.2704991203,-25.6117208363],[-49.2853952708,-25.6105317906],[-49.2884082129,-25.6141200037],[-49.2946586342,-25.6135579246],[-49.2951111389,-25.6163954218],[-49.3018453276,-25.6136083887],[-49.3091466414,-25.6189784938],[-49.3114291928,-25.6154854224],[-49.3153968672,-25.6185011143],[-49.3109726719,-25.6236668978],[-49.3153365073,-25.6227219995],[-49.3256593379,-25.6285879669],[-49.322617679,-25.632361494],[-49.3386851081,-25.6307452565],[-49.3427194011,-25.6371755581],[-49.3453892004,-25.6329330371],[-49.3480769094,-25.6382304559],[-49.3515617009,-25.6353198538],[-49.3547981626,-25.6448963003],[-49.3594009873,-25.64296323],[-49.3650490692,-25.6405108987],[-49.356782109,-25.6079722188],[-49.3519507607,-25.604785152],[-49.3450282615,-25.582506733],[-49.3421537798,-25.579045586],[-49.3444361623,-25.5672581689],[-49.3417817812,-25.5541691327],[-49.3456410609,-25.541848846],[-49.3402288644,-25.5353995242],[-49.3434884144,-25.531177298],[-49.3379917449,-25.5145562168],[-49.3485163087,-25.5197505249],[-49.3585273612,-25.5197212667],[-49.3739800783,-25.5129345651],[-49.3715960689,-25.4965104772],[-49.3786259236,-25.4898223131],[-49.3843388043,-25.4822393063],[-49.3818240849,-25.4684118725],[-49.3859682637,-25.4629180019],[-49.3809820678,-25.4521128291],[-49.3879956215,-25.4432568445],[-49.3851434864,-25.4406550348],[-49.3887950395,-25.4346374457],[-49.3830016009,-25.418389535],[-49.3761295576,-25.4114817462],[-49.3736820727,-25.3974312888],[-49.3636668803,-25.394017809],[-49.3593436668,-25.3861716972],[-49.3479039639,-25.3729152733],[-49.3408439296,-25.3593632831],[-49.3401391284,-25.3495033675],[-49.335577758,-25.3551352255],[-49.3146838399,-25.379153031],[-49.3032120756,-25.3841774846],[-49.3037805067,-25.3796710119],[-49.2972563442,-25.3746170131],[-49.2854804217,-25.3786089008],[-49.2867714714,-25.3705433404],[-49.2812366379,-25.364211567],[-49.2838830543,-25.3630873576],[-49.2799669631,-25.3578044385],[-49.2814635905,-25.3546483123],[-49.2730027422,-25.3444243332]]]}}$curitiba_geojson$::jsonb,
  'Capital paranaense limítrofe a nordeste de Araucária.'
);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  role TEXT DEFAULT 'user',
  assigned_category TEXT,
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_until TIMESTAMPTZ,
  block_reason TEXT,
  blocked_at TIMESTAMPTZ,
  city_id TEXT NOT NULL DEFAULT 'curitiba-pr' REFERENCES public.cities(id)
);

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'unresolved',
  image_url TEXT,
  anonymous BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_email TEXT,
  user_name TEXT,
  is_work_order BOOLEAN DEFAULT FALSE,
  work_order_number TEXT,
  assigned_team TEXT,
  priority TEXT DEFAULT 'medium',
  deadline TEXT,
  maintenance_type TEXT,
  technical_instructions TEXT,
  category TEXT,
  status_notes TEXT,
  resolved_at TIMESTAMPTZ,
  city_id TEXT NOT NULL DEFAULT 'curitiba-pr' REFERENCES public.cities(id)
);

CREATE TABLE public.work_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  address TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  deadline TEXT,
  assigned_team TEXT,
  maintenance_type TEXT,
  description TEXT,
  technical_instructions TEXT,
  status TEXT DEFAULT 'dispatched',
  status_notes TEXT,
  supervisor_name TEXT,
  supervisor_email TEXT,
  linked_report_id TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()),
  completed_at TIMESTAMPTZ,
  assigned_employee_id TEXT,
  assigned_employee_name TEXT,
  resolution_notes TEXT,
  resolution_photo_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  checklist_state JSONB DEFAULT '{}'::jsonb,
  city_id TEXT NOT NULL DEFAULT 'curitiba-pr' REFERENCES public.cities(id)
);

CREATE TABLE public.news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  city_id TEXT NOT NULL DEFAULT 'curitiba-pr' REFERENCES public.cities(id)
);

CREATE TABLE public.work_order_history (
  id TEXT PRIMARY KEY DEFAULT ('woh_' || substr(md5(random()::text), 1, 10)),
  work_order_id TEXT NOT NULL,
  user_id TEXT,
  user_name TEXT,
  user_role TEXT,
  action_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  message TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  city_id TEXT NOT NULL DEFAULT 'curitiba-pr' REFERENCES public.cities(id)
);

CREATE INDEX idx_profiles_city_id ON public.profiles(city_id);
CREATE INDEX idx_reports_city_id ON public.reports(city_id);
CREATE INDEX idx_work_orders_city_id ON public.work_orders(city_id);
CREATE INDEX idx_news_city_id ON public.news(city_id);
CREATE INDEX idx_wo_history_order_id ON public.work_order_history(work_order_id);
CREATE INDEX idx_work_order_history_city_id ON public.work_order_history(city_id);

CREATE OR REPLACE FUNCTION public.is_global_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN := FALSE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT (
    COALESCE(p.is_admin, FALSE) = TRUE
    OR p.role = 'admin'
    OR lower(COALESCE(p.email, '')) IN (
      'projetocomnuaria@gmail.com',
      'antonioadm@gmail.com',
      'admin@commuaria.com'
    )
  )
  INTO v_is_admin
  FROM public.profiles p
  WHERE p.id = auth.uid();

  RETURN COALESCE(v_is_admin, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_city_id()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_city TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT p.city_id
  INTO v_city
  FROM public.profiles p
  WHERE p.id = auth.uid();

  RETURN COALESCE(v_city, 'curitiba-pr');
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_city_id TEXT;
  v_city_active BOOLEAN;
BEGIN
  v_city_id := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'city_id', '')), '');
  IF v_city_id IS NULL THEN
    v_city_id := 'curitiba-pr';
  END IF;

  SELECT c.is_active
  INTO v_city_active
  FROM public.cities c
  WHERE c.id = v_city_id;

  IF v_city_active IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Município "%" não está disponível para cadastro na plataforma Commuária.', v_city_id;
  END IF;

  INSERT INTO public.profiles (id, name, email, role, city_id)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''), 'Cidadão'),
    NEW.email,
    'user',
    v_city_id
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    email = EXCLUDED.email,
    city_id = COALESCE(EXCLUDED.city_id, public.profiles.city_id);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_profile_city_and_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_city_active BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_global_admin() THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.id <> auth.uid() THEN
        RAISE EXCEPTION 'Operação não permitida: não é possível criar perfil para outro usuário.';
      END IF;
      SELECT c.is_active INTO v_city_active
      FROM public.cities c
      WHERE c.id = NEW.city_id;
      IF v_city_active IS DISTINCT FROM TRUE THEN
        RAISE EXCEPTION 'O município selecionado não está ativo na plataforma.';
      END IF;
      NEW.role := COALESCE(NEW.role, 'user');
      IF NEW.role <> 'user' OR COALESCE(NEW.is_admin, FALSE) = TRUE THEN
        RAISE EXCEPTION 'Elevação de permissão não autorizada.';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF OLD.id <> auth.uid() THEN
        RAISE EXCEPTION 'Operação não permitida em perfil de terceiros.';
      END IF;
      NEW.city_id := OLD.city_id;
      NEW.role := OLD.role;
      NEW.is_admin := OLD.is_admin;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_row_city_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_global_admin() THEN
    NEW.city_id := public.current_user_city_id();
  ELSIF NEW.city_id IS NULL OR TRIM(NEW.city_id) = '' THEN
    NEW.city_id := COALESCE(public.current_user_city_id(), 'curitiba-pr');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_work_order_history_city_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_city_id TEXT;
BEGIN
  SELECT wo.city_id
  INTO v_order_city_id
  FROM public.work_orders wo
  WHERE wo.id::text = NEW.work_order_id
  LIMIT 1;

  IF v_order_city_id IS NULL THEN
    RAISE EXCEPTION 'A O.S. vinculada ao histórico não foi encontrada.';
  END IF;

  IF auth.uid() IS NOT NULL AND NOT public.is_global_admin() THEN
    IF v_order_city_id <> public.current_user_city_id() THEN
      RAISE EXCEPTION 'Não é permitido registrar histórico em outro município.';
    END IF;
    NEW.city_id := v_order_city_id;
  ELSE
    NEW.city_id := COALESCE(NEW.city_id, v_order_city_id);
    IF NEW.city_id <> v_order_city_id THEN
      RAISE EXCEPTION 'O município do histórico deve corresponder ao da O.S.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sanitize_public_city_text(
  p_value TEXT,
  p_max_length INTEGER DEFAULT 180
)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT LEFT(
    TRIM(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(COALESCE(p_value, ''), '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+[.][A-Za-z]{2,}', '[dado ocultado]', 'gi'),
              '(^|[^0-9])[0-9]{3}[.[:space:]-]?[0-9]{3}[.[:space:]-]?[0-9]{3}[.[:space:]-]?[0-9]{2}([^0-9]|$)',
              '[dado ocultado]', 'g'
            ),
            '(^|[^0-9])([+]55[-[:space:]]?)?([(]?[0-9]{2}[)]?[-[:space:]]?)?9?[0-9]{4}[-[:space:]]?[0-9]{4}([^0-9]|$)',
            '[dado ocultado]', 'g'
          ),
          '(meu nome( é| e)?|me chamo|telefone|celular|whatsapp|contato|e-mail|cpf)[[:space:]]*[:=-]?[[:space:]]*[^.;,]*',
          '[identificação removida]', 'gi'
        ),
        '[[:space:]]+', ' ', 'g'
      )
    ),
    GREATEST(0, LEAST(COALESCE(p_max_length, 180), 500))
  );
$$;

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
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.cities c
    WHERE c.id = p_city_id AND c.is_active = TRUE
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH input_rows AS (
    SELECT
      r.id,
      r.city_id,
      public.sanitize_public_city_text(
        COALESCE(NULLIF(TRIM(r.category), ''), NULLIF(TRIM(r.maintenance_type), ''), 'Outros'), 60
      ) AS category_candidate,
      public.sanitize_public_city_text(
        REGEXP_REPLACE(COALESCE(r.address, ''), ',?[[:space:]]*(n[ºo.]?[[:space:]]*)?[0-9]{1,5}(?=[[:space:]]*(,|$))', '', 'gi'),
        160
      ) AS safe_location,
      r.latitude,
      r.longitude,
      COALESCE(r.status, 'unresolved') AS safe_status,
      r.created_at
    FROM public.reports r
    WHERE r.city_id = p_city_id
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
        WHEN LOWER(input_rows.category_candidate) IN ('pavimentação', 'iluminação pública', 'limpeza urbana', 'saneamento', 'arborização', 'outros')
          THEN input_rows.category_candidate
        ELSE 'Outros'
      END AS safe_category,
      CASE
        WHEN LOWER(input_rows.category_candidate) IN ('pavimentação', 'iluminação pública', 'limpeza urbana', 'saneamento', 'arborização', 'outros')
          THEN input_rows.category_candidate || ' registrada nesta região.'
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
    safe_rows.id,
    safe_rows.city_id,
    safe_rows.safe_category,
    CASE
      WHEN safe_rows.safe_category = 'Outros' THEN 'Ocorrência urbana'
      ELSE safe_rows.safe_category || ' urbana'
    END,
    safe_rows.safe_description,
    safe_rows.safe_location,
    safe_rows.latitude,
    safe_rows.longitude,
    safe_rows.safe_status,
    safe_rows.created_at
  FROM safe_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_global_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_city_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_city_reports(TEXT) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.sanitize_public_city_text(TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user() TO authenticated;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER trg_protect_profile_city_and_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_city_and_role();

CREATE TRIGGER trg_reports_assign_city
  BEFORE INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.assign_row_city_id();

CREATE TRIGGER trg_work_orders_assign_city
  BEFORE INSERT ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.assign_row_city_id();

CREATE TRIGGER trg_news_assign_city
  BEFORE INSERT ON public.news
  FOR EACH ROW EXECUTE FUNCTION public.assign_row_city_id();

CREATE TRIGGER trg_work_order_history_assign_city
  BEFORE INSERT OR UPDATE OF work_order_id, city_id ON public.work_order_history
  FOR EACH ROW EXECUTE FUNCTION public.assign_work_order_history_city_id();

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de cidades"
  ON public.cities FOR SELECT USING (TRUE);
CREATE POLICY "ADM Global gerencia cidades"
  ON public.cities FOR ALL TO authenticated
  USING (public.is_global_admin())
  WITH CHECK (public.is_global_admin());

CREATE POLICY "Permitir acesso completo profiles"
  ON public.profiles FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Permitir inserção e atualização de perfis"
  ON public.profiles FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Permitir leitura total de perfis"
  ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "Qualquer um pode ler perfis para identificação"
  ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "Users can read their own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Usuários podem atualizar seus próprios perfis"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY rls_profiles_city_isolation
  ON public.profiles AS RESTRICTIVE FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND (public.is_global_admin() OR city_id = public.current_user_city_id())
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (public.is_global_admin() OR city_id = public.current_user_city_id())
  );

CREATE POLICY "Admins can delete any reports"
  ON public.reports FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );
CREATE POLICY "Anyone can insert reports"
  ON public.reports FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone can read reports"
  ON public.reports FOR SELECT USING (TRUE);
CREATE POLICY "Permitir criação e atualização de chamados"
  ON public.reports FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Permitir inserções de relatos a qualquer um"
  ON public.reports FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Permitir leitura de chamados"
  ON public.reports FOR SELECT USING (TRUE);
CREATE POLICY "Permitir leitura de relatos aberta a todos"
  ON public.reports FOR SELECT USING (TRUE);
CREATE POLICY "Users can delete their own reports"
  ON public.reports FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own reports"
  ON public.reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários e administradores podem atualizar relatos"
  ON public.reports FOR UPDATE
  USING (
    auth.uid() = user_id
    OR (
      SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()
    ) = TRUE
  );
CREATE POLICY rls_reports_city_isolation
  ON public.reports AS RESTRICTIVE FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND (public.is_global_admin() OR city_id = public.current_user_city_id())
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (public.is_global_admin() OR city_id = public.current_user_city_id())
  );

CREATE POLICY "Permitir gestão de ordens de serviço"
  ON public.work_orders FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Permitir leitura de ordens de serviço"
  ON public.work_orders FOR SELECT USING (TRUE);
CREATE POLICY rls_work_orders_city_isolation
  ON public.work_orders AS RESTRICTIVE FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND (public.is_global_admin() OR city_id = public.current_user_city_id())
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (public.is_global_admin() OR city_id = public.current_user_city_id())
  );

CREATE POLICY "Admins can delete news"
  ON public.news FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );
CREATE POLICY "Admins can insert news"
  ON public.news FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );
CREATE POLICY "Admins can update news"
  ON public.news FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );
CREATE POLICY "Anyone can read news"
  ON public.news FOR SELECT USING (TRUE);
CREATE POLICY rls_news_city_isolation
  ON public.news AS RESTRICTIVE FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND (public.is_global_admin() OR city_id = public.current_user_city_id())
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (public.is_global_admin() OR city_id = public.current_user_city_id())
  );

CREATE POLICY "Permitir tudo em work_order_history"
  ON public.work_order_history FOR ALL USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY rls_work_order_history_city_isolation
  ON public.work_order_history AS RESTRICTIVE FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND (public.is_global_admin() OR city_id = public.current_user_city_id())
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (public.is_global_admin() OR city_id = public.current_user_city_id())
  );

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE
  public.cities,
  public.profiles,
  public.reports,
  public.work_orders,
  public.news,
  public.work_order_history
TO anon, authenticated, service_role;
