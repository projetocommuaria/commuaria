-- Multi-municipality hardening: profile and field-history isolation plus a PII-minimized public occurrence RPC.

-- A citizen can read or update only profiles from their municipality; global ADM is the sole cross-city exception.
DROP POLICY IF EXISTS "rls_profiles_city_isolation" ON public.profiles;
CREATE POLICY "rls_profiles_city_isolation"
  ON public.profiles
  AS RESTRICTIVE
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND (public.is_global_admin() OR city_id = public.current_user_city_id())
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (public.is_global_admin() OR city_id = public.current_user_city_id())
  );

-- Keep the immutable operational history in the same municipality as its work order.
ALTER TABLE public.work_order_history
  ADD COLUMN IF NOT EXISTS city_id TEXT REFERENCES public.cities(id) DEFAULT 'araucaria-pr';

UPDATE public.work_order_history h
   SET city_id = COALESCE(wo.city_id, h.city_id, 'araucaria-pr')
  FROM public.work_orders wo
 WHERE wo.id::text = h.work_order_id
   AND (h.city_id IS NULL OR h.city_id IS DISTINCT FROM wo.city_id);

UPDATE public.work_order_history
   SET city_id = 'araucaria-pr'
 WHERE city_id IS NULL;

ALTER TABLE public.work_order_history ALTER COLUMN city_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_work_order_history_city_id ON public.work_order_history(city_id);

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

DROP TRIGGER IF EXISTS trg_work_order_history_assign_city ON public.work_order_history;
CREATE TRIGGER trg_work_order_history_assign_city
  BEFORE INSERT OR UPDATE OF work_order_id, city_id ON public.work_order_history
  FOR EACH ROW EXECUTE FUNCTION public.assign_work_order_history_city_id();

DROP POLICY IF EXISTS "rls_work_order_history_city_isolation" ON public.work_order_history;
CREATE POLICY "rls_work_order_history_city_isolation"
  ON public.work_order_history
  AS RESTRICTIVE
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND (public.is_global_admin() OR city_id = public.current_user_city_id())
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (public.is_global_admin() OR city_id = public.current_user_city_id())
  );

-- The public map does not expose report titles (which are user-entered) or any user/profile columns.
-- It returns only category, a short sanitized description, an address without house number, coordinates, status and date.
CREATE OR REPLACE FUNCTION public.sanitize_public_city_text(p_value TEXT, p_max_length INTEGER DEFAULT 180)
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
              REGEXP_REPLACE(COALESCE(p_value, ''), '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[dado ocultado]', 'g'),
              '\m[0-9]{3}[.\s-]?[0-9]{3}[.\s-]?[0-9]{3}[.\s-]?[0-9]{2}\M',
              '[dado ocultado]', 'g'
            ),
            '\m(\+?55[ -]?)?(\(?[0-9]{2}\)?[ -]?)?9?[0-9]{4}[ -]?[0-9]{4}\M',
            '[dado ocultado]', 'g'
          ),
          '(meu nome( é| e)?|me chamo|telefone|celular|whatsapp|contato|e-mail|cpf)\s*[:=-]?\s*[^.;,]*',
          '[identificação removida]', 'gi'
        ),
        '\s+', ' ', 'g'
      )
    ),
    GREATEST(0, LEAST(COALESCE(p_max_length, 180), 500))
  );
$$;

REVOKE ALL ON FUNCTION public.sanitize_public_city_text(TEXT, INTEGER) FROM PUBLIC;

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
    SELECT 1 FROM public.cities c WHERE c.id = p_city_id AND c.is_active = TRUE
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH safe_rows AS (
    SELECT
      r.id,
      r.city_id,
      public.sanitize_public_city_text(
        COALESCE(NULLIF(TRIM(r.category), ''), NULLIF(TRIM(r.maintenance_type), ''), 'Outros'),
        60
      ) AS safe_category,
      public.sanitize_public_city_text(COALESCE(r.description, ''), 180) AS safe_description,
      public.sanitize_public_city_text(
        REGEXP_REPLACE(COALESCE(r.address, ''), ',?\s*(n[ºo.]?\s*)?[0-9]{1,5}(?=\s*(,|$))', '', 'gi'),
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
  )
  SELECT
    safe_rows.id,
    safe_rows.city_id,
    safe_rows.safe_category,
    CASE
      WHEN LOWER(safe_rows.safe_category) IN ('pavimentação', 'iluminação pública', 'limpeza urbana', 'saneamento', 'arborização', 'outros')
        THEN safe_rows.safe_category || ' urbana'
      ELSE 'Ocorrência urbana'
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

GRANT EXECUTE ON FUNCTION public.get_public_city_reports(TEXT) TO anon, authenticated;
