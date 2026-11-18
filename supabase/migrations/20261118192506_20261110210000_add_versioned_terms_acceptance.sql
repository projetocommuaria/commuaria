-- Shared, versioned Terms of Use for all municipal tenants.
-- Only the active global ADM can publish new versions; non-admin users must
-- accept the current version before continuing in the client.

CREATE TABLE IF NOT EXISTS public.terms_documents (
  version INTEGER PRIMARY KEY CHECK (version > 0),
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 180),
  content TEXT NOT NULL CHECK (char_length(trim(content)) BETWEEN 1 AND 50000),
  published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_current BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS terms_documents_one_current_idx
  ON public.terms_documents (is_current)
  WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS terms_documents_published_at_idx
  ON public.terms_documents (published_at DESC);

INSERT INTO public.terms_documents (version, title, content, is_current)
VALUES (
  1,
  'Termos de Uso — versão demonstrativa',
  $terms$Esta é uma versão demonstrativa dos Termos de Uso, preparada para o trabalho escolar da Commuária. Não é um documento jurídico operacional, não representa contratação municipal nem prestação real de serviço. O conteúdo deve ser revisado pelo ADM para a apresentação e validado antes de qualquer uso real.

1. Use o protótipo somente com dados fictícios. Não informe dados pessoais, senhas, endereços precisos ou imagens de pessoas reais.
2. Ocorrências, contas e resultados exibidos na demonstração são exemplos e não constituem solicitações oficiais de serviços municipais.
3. O protótipo não substitui canais oficiais de emergência, atendimento urgente ou serviços públicos.
4. A política de privacidade e as configurações técnicas também devem ser consultadas. O aceite destes Termos não substitui consentimentos específicos eventualmente necessários.
5. Quando uma nova versão for publicada, usuários que não sejam ADM deverão lê-la e aceitá-la para continuar usando a aplicação. O aceite será registrado com a versão e a data.$terms$,
  TRUE
)
ON CONFLICT (version) DO NOTHING;

ALTER TABLE public.terms_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.terms_documents FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.terms_documents TO authenticated;

DROP POLICY IF EXISTS terms_documents_read_current_or_global_admin ON public.terms_documents;
CREATE POLICY terms_documents_read_current_or_global_admin
  ON public.terms_documents
  FOR SELECT
  TO authenticated
  USING (is_current OR public.is_active_global_admin());

CREATE TABLE IF NOT EXISTS public.terms_acceptances (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version INTEGER NOT NULL REFERENCES public.terms_documents(version) ON DELETE RESTRICT,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, terms_version)
);

CREATE INDEX IF NOT EXISTS terms_acceptances_version_idx
  ON public.terms_acceptances (terms_version, accepted_at DESC);

ALTER TABLE public.terms_acceptances ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.terms_acceptances FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.terms_acceptances TO authenticated;

DROP POLICY IF EXISTS terms_acceptances_read_own ON public.terms_acceptances;
CREATE POLICY terms_acceptances_read_own
  ON public.terms_acceptances
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.publish_terms(p_title TEXT, p_content TEXT)
RETURNS public.terms_documents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_next_version INTEGER;
  v_document public.terms_documents%ROWTYPE;
BEGIN
  IF NOT public.is_active_global_admin() THEN
    RAISE EXCEPTION 'Somente o ADM Global pode publicar os Termos de Uso.'
      USING ERRCODE = '42501';
  END IF;

  IF char_length(trim(COALESCE(p_title, ''))) NOT BETWEEN 1 AND 180 THEN
    RAISE EXCEPTION 'O título deve ter entre 1 e 180 caracteres.'
      USING ERRCODE = '22023';
  END IF;

  IF char_length(trim(COALESCE(p_content, ''))) NOT BETWEEN 1 AND 50000 THEN
    RAISE EXCEPTION 'O texto dos Termos deve ter entre 1 e 50000 caracteres.'
      USING ERRCODE = '22023';
  END IF;

  -- Serialize concurrent publications so version numbers remain monotonic.
  PERFORM pg_advisory_xact_lock(771234567890123);

  UPDATE public.terms_documents
  SET is_current = FALSE
  WHERE is_current = TRUE;

  SELECT COALESCE(MAX(version), 0) + 1
  INTO v_next_version
  FROM public.terms_documents;

  INSERT INTO public.terms_documents (
    version,
    title,
    content,
    published_by,
    is_current
  )
  VALUES (
    v_next_version,
    trim(p_title),
    trim(p_content),
    auth.uid(),
    TRUE
  )
  RETURNING * INTO v_document;

  RETURN v_document;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_terms(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_terms(TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_current_terms(p_terms_version INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É necessário entrar na conta para aceitar os Termos.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.terms_documents
    WHERE version = p_terms_version
      AND is_current = TRUE
  ) THEN
    RAISE EXCEPTION 'Esta versão dos Termos não está mais vigente. Atualize e tente novamente.'
      USING ERRCODE = '40001';
  END IF;

  INSERT INTO public.terms_acceptances (user_id, terms_version)
  VALUES (auth.uid(), p_terms_version)
  ON CONFLICT (user_id, terms_version) DO NOTHING;

  RETURN p_terms_version;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_current_terms(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_current_terms(INTEGER) TO authenticated;

-- Publish current-term insert events to clients that are online. The client also
-- rechecks on focus and periodically, so acceptance gating still works if Realtime
-- is not available in a particular environment.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'terms_documents'
     ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.terms_documents';
  END IF;
END;
$$;
