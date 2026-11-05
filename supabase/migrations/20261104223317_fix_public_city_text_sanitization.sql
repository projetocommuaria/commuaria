-- Correct PII scrubbing for the existing public reports RPC using POSIX character classes.
-- Titles remain generic; only the existing report projection is updated (no duplicate tables).
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
  IF NOT EXISTS (SELECT 1 FROM public.cities c WHERE c.id = p_city_id AND c.is_active = TRUE) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH safe_rows AS (
    SELECT
      r.id,
      r.city_id,
      public.sanitize_public_city_text(COALESCE(NULLIF(TRIM(r.category), ''), NULLIF(TRIM(r.maintenance_type), ''), 'Outros'), 60) AS safe_category,
      public.sanitize_public_city_text(COALESCE(r.description, ''), 180) AS safe_description,
      public.sanitize_public_city_text(REGEXP_REPLACE(COALESCE(r.address, ''), ',?[[:space:]]*(n[ºo.]?[[:space:]]*)?[0-9]{1,5}(?=[[:space:]]*(,|$))', '', 'gi'), 160) AS safe_location,
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
      WHEN LOWER(safe_rows.safe_category) IN ('pavimentação', 'iluminação pública', 'limpeza urbana', 'saneamento', 'arborização', 'outros') THEN safe_rows.safe_category || ' urbana'
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
REVOKE ALL ON FUNCTION public.sanitize_public_city_text(TEXT, INTEGER) FROM PUBLIC;
