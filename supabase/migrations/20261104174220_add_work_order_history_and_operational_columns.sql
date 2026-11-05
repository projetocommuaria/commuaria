-- Colunas complementares para reports (não destrutivas)
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS status_notes TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Colunas complementares para profiles (não destrutivas)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS block_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;

-- Colunas complementares para work_orders (execução em campo, geolocalização e checklist)
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS assigned_employee_id TEXT;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS assigned_employee_name TEXT;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS resolution_photo_url TEXT;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS checklist_state JSONB DEFAULT '{}'::jsonb;

-- Preencher coordenadas nas O.S. existentes vinculadas a chamados reais com GPS
UPDATE public.work_orders wo
SET
  latitude = r.latitude,
  longitude = r.longitude
FROM public.reports r
WHERE (wo.linked_report_id = r.id::text OR wo.order_number = r.work_order_number)
  AND r.is_work_order IS NOT TRUE
  AND wo.latitude IS NULL
  AND r.latitude IS NOT NULL
  AND r.longitude IS NOT NULL;

-- Tabela de histórico imutável e diário de campo de O.S.
CREATE TABLE IF NOT EXISTS public.work_order_history (
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wo_history_order_id ON public.work_order_history(work_order_id);

ALTER TABLE public.work_order_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'work_order_history'
      AND policyname = 'Permitir tudo em work_order_history'
  ) THEN
    CREATE POLICY "Permitir tudo em work_order_history"
      ON public.work_order_history
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
