-- Curitiba-specific follow-up: never infer a tenant for an unscoped user or row.
-- The application must provide a city_id; authenticated municipal writes are
-- constrained to the city explicitly stored on their profile.

ALTER TABLE public.profiles ALTER COLUMN city_id DROP DEFAULT;
ALTER TABLE public.reports ALTER COLUMN city_id DROP DEFAULT;
ALTER TABLE public.work_orders ALTER COLUMN city_id DROP DEFAULT;
ALTER TABLE public.news ALTER COLUMN city_id DROP DEFAULT;
ALTER TABLE public.work_order_history ALTER COLUMN city_id DROP DEFAULT;

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

  SELECT NULLIF(BTRIM(p.city_id), '')
  INTO v_city
  FROM public.profiles p
  WHERE p.id = auth.uid();

  RETURN v_city;
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
  v_city_id := NULLIF(BTRIM(COALESCE(NEW.raw_user_meta_data->>'city_id', '')), '');
  IF v_city_id IS NULL THEN
    RAISE EXCEPTION 'Informe explicitamente o município da conta.';
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

CREATE OR REPLACE FUNCTION public.assign_row_city_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_city_id TEXT;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_global_admin() THEN
    v_user_city_id := public.current_user_city_id();
    IF v_user_city_id IS NULL THEN
      RAISE EXCEPTION 'A conta autenticada não possui um município explícito.';
    END IF;
    IF NEW.city_id IS NOT NULL AND BTRIM(NEW.city_id) <> '' AND NEW.city_id <> v_user_city_id THEN
      RAISE EXCEPTION 'Não é permitido gravar um registro em outro município.';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.cities c
      WHERE c.id = v_user_city_id AND c.is_active = TRUE
    ) THEN
      RAISE EXCEPTION 'O município vinculado à conta não está ativo.';
    END IF;
    NEW.city_id := v_user_city_id;
  ELSE
    IF NEW.city_id IS NULL OR BTRIM(NEW.city_id) = '' THEN
      RAISE EXCEPTION 'Informe explicitamente o município do registro.';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.cities c
      WHERE c.id = NEW.city_id AND c.is_active = TRUE
    ) THEN
      RAISE EXCEPTION 'O município informado não existe ou não está ativo.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
