-- =========================================================
-- COMMUÁRIA - SCRIPT COMPLETO DE BANCO DE DADOS (SUPABASE SQL)
-- Copie e cole este script no SQL Editor do seu projeto Supabase
-- =========================================================

-- 1. Tabela de Perfis de Usuário (profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'user', -- 'user' | 'supervisor' | 'admin'
  assigned_category TEXT,   -- Para supervisores: 'Pavimentação', 'Iluminação Pública', etc.
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Ocorrências / Chamados de Zeladoria (reports)
CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'Pavimentação', -- 'Pavimentação' | 'Iluminação Pública' | 'Limpeza Urbana' | 'Saneamento' | 'Arborização' | 'Outros'
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  status TEXT DEFAULT 'unresolved', -- 'unresolved' | 'in_analysis' | 'in_progress' | 'resolved'
  status_notes TEXT, -- Parecer técnico / notas de atendimento do supervisor
  image_url TEXT,
  anonymous BOOLEAN DEFAULT FALSE,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Notícias Municipais (news)
CREATE TABLE IF NOT EXISTS public.news (
  id TEXT PRIMARY KEY DEFAULT ('news_' || substr(md5(random()::text), 1, 8)),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'Comunidade',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- CONFIGURAÇÃO DE SEGURANÇA (RLS - ROW LEVEL SECURITY)
-- Permite leitura e escrita públicas para a aplicação funcionar perfeitamente
-- =========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Permitir tudo em profiles" ON public.profiles;
DROP POLICY IF EXISTS "Permitir tudo em reports" ON public.reports;
DROP POLICY IF EXISTS "Permitir tudo em news" ON public.news;

-- Criar políticas permissivas de leitura e escrita
CREATE POLICY "Permitir tudo em profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo em reports" ON public.reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo em news" ON public.news FOR ALL USING (true) WITH CHECK (true);

-- =========================================================
-- TRIGGER PARA CRIAR PROFILE AUTOMATICAMENTE NO CADASTRO (AUTH.USERS)
-- =========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Cidadão de Araucária'),
    NEW.email,
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- DADOS INICIAIS DE TESTE (NOTÍCIAS E CHAMADOS EXEMPLES)
-- =========================================================

INSERT INTO public.news (id, title, description, category, created_at)
VALUES 
  ('news-3', 'Mutirão de zeladoria melhora praças públicas no centro', 'Em ação cooperativa entre moradores voluntários e equipes públicas municipais, duas praças históricas receberam reparos nos bancos e nova pintura de calçadas.', 'Comunidade', NOW() - INTERVAL '1 day'),
  ('news-2', 'Nova iluminação de LED chega ao bairro Costeira', 'A prefeitura iniciou a substituição de lâmpadas antigas por tecnologia LED na avenida principal do bairro Costeira, garantindo mais segurança e economia.', 'Serviços', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.reports (id, title, description, address, latitude, longitude, status, image_url, anonymous, created_at)
VALUES 
  ('mock-r1', 'Buraco Profundo na Via', 'Buraco profundo na pista na Rua Ceará, oferecendo perigo aos motoristas e pedestres.', 'Rua Ceará, Iguaçu, Araucária - PR', -25.5901, -49.4851, 'unresolved', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?q=80&w=800', false, NOW() - INTERVAL '5 days'),
  ('mock-r2', 'Poste sem Iluminação Pública', 'Lâmpada queimada há mais de uma semana em frente ao número 340.', 'Avenida Victor do Amaral, Centro, Araucária - PR', -25.5925, -49.4812, 'unresolved', 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800', true, NOW() - INTERVAL '3 days'),
  ('mock-r3', 'Vazamento de Água Limpa', 'Vazamento contínuo correndo pela calçada perto do parque municipal.', 'Rua Ceará, Iguaçu, Araucária - PR', -25.5885, -49.4891, 'resolved', 'https://images.unsplash.com/photo-1517436073-3b12361ac952?q=80&w=800', false, NOW() - INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;
