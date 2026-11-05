-- Public map privacy: normalize category labels, suppress citizen-written descriptions,
-- and round report points to roughly neighborhood-level precision.
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
  WITH input_rows AS (
    SELECT
      r.id,
      r.city_id,
      public.sanitize_public_city_text(COALESCE(NULLIF(TRIM(r.category), ''), NULLIF(TRIM(r.maintenance_type), ''), 'Outros'), 60) AS category_candidate,
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
  ), safe_rows AS (
    SELECT
      input_rows.id,
      input_rows.city_id,
      CASE
        WHEN LOWER(input_rows.category_candidate) IN ('pavimentação', 'iluminação pública', 'limpeza urbana', 'saneamento', 'arborização', 'outros') THEN input_rows.category_candidate
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
    CASE WHEN safe_rows.safe_category = 'Outros' THEN 'Ocorrência urbana' ELSE safe_rows.safe_category || ' urbana' END,
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
