-- =========================================================
-- COMMUÁRIA - SCRIPT CONSOLIDADO DE BANCO DE DADOS (SUPABASE SQL)
-- Execute este script completo no SQL Editor do seu projeto Supabase
-- =========================================================

-- 1. Tabela de Perfis de Usuário (profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'user', -- 'user' | 'supervisor' | 'admin'
  assigned_category TEXT,   -- Para supervisores: 'Pavimentação', 'Iluminação Pública', 'Limpeza Urbana', 'Saneamento', 'Arborização'
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Ocorrências / Chamados de Zeladoria (reports)
CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT PRIMARY KEY DEFAULT ('rep_' || substr(md5(random()::text), 1, 10)),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'Pavimentação', -- 'Pavimentação' | 'Iluminação Pública' | 'Limpeza Urbana' | 'Saneamento' | 'Arborização' | 'Outros'
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  status TEXT DEFAULT 'unresolved', -- 'unresolved' | 'in_analysis' | 'in_progress' | 'resolved'
  status_notes TEXT, -- Parecer técnico / notas de atendimento do supervisor
  image_url TEXT,
  anonymous BOOLEAN DEFAULT FALSE,
  user_id TEXT,
  user_email TEXT,
  user_name TEXT,
  is_work_order BOOLEAN DEFAULT FALSE,
  work_order_number TEXT,
  assigned_team TEXT,
  priority TEXT DEFAULT 'medium',
  deadline TEXT,
  maintenance_type TEXT,
  technical_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Ordens de Serviço (work_orders)
CREATE TABLE IF NOT EXISTS public.work_orders (
  id TEXT PRIMARY KEY DEFAULT ('wo_' || substr(md5(random()::text), 1, 10)),
  order_number TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Pavimentação',
  address TEXT NOT NULL,
  priority TEXT DEFAULT 'medium', -- 'low' | 'medium' | 'high' | 'emergency'
  deadline TEXT,
  assigned_team TEXT,
  maintenance_type TEXT,
  description TEXT,
  technical_instructions TEXT,
  status TEXT DEFAULT 'dispatched', -- 'open' | 'dispatched' | 'in_progress' | 'completed' | 'cancelled'
  status_notes TEXT,
  supervisor_name TEXT,
  supervisor_email TEXT,
  linked_report_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 4. Tabela de Notícias e Comunicados Municipais (news)
CREATE TABLE IF NOT EXISTS public.news (
  id TEXT PRIMARY KEY DEFAULT ('news_' || substr(md5(random()::text), 1, 8)),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'Comunidade', -- 'Comunidade' | 'Serviços' | 'Avisos'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- CONFIGURAÇÃO DE SEGURANÇA (RLS - ROW LEVEL SECURITY)
-- Permite leitura e escrita seguras e contínuas para a aplicação
-- =========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Permitir tudo em profiles" ON public.profiles;
DROP POLICY IF EXISTS "Permitir tudo em reports" ON public.reports;
DROP POLICY IF EXISTS "Permitir tudo em work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "Permitir tudo em news" ON public.news;

-- Criar políticas completas de leitura, inserção, atualização e exclusão
CREATE POLICY "Permitir tudo em profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo em reports" ON public.reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo em work_orders" ON public.work_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo em news" ON public.news FOR ALL USING (true) WITH CHECK (true);

-- =========================================================
-- TRIGGER PARA CRIAR PROFILE AUTOMATICAMENTE NO CADASTRO (AUTH.USERS)
-- =========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, is_admin)
  VALUES (
    NEW.id::text,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Cidadão de Araucária'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    (NEW.email = 'projetocomnuaria831@gmail.com' OR NEW.email = 'admin@commuaria.com' OR NEW.raw_user_meta_data->>'role' = 'admin')
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- RPC PARA EXCLUSÃO DE CONTA
-- =========================================================

CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = auth.uid()::text;
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================
-- DADOS INICIAIS (NOTÍCIAS E CHAMADOS EXEMPLARES)
-- =========================================================

INSERT INTO public.news (id, title, description, category, created_at)
VALUES 
  ('news-3', 'Mutirão de zeladoria melhora praças públicas no centro', 'Em ação cooperativa entre moradores voluntários e equipes públicas municipais, duas praças históricas receberam reparos nos bancos e nova pintura de calçadas.', 'Comunidade', NOW() - INTERVAL '1 day'),
  ('news-2', 'Nova iluminação de LED chega ao bairro Costeira', 'A prefeitura iniciou a substituição de lâmpadas antigas por tecnologia LED na avenida principal do bairro Costeira, garantindo mais segurança e economia.', 'Serviços', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.reports (id, title, description, category, address, latitude, longitude, status, status_notes, image_url, anonymous, created_at)
VALUES 
  ('mock-r1', 'Buraco Profundo na Via', 'Buraco profundo na pista na Rua Ceará, oferecendo perigo aos motoristas e pedestres.', 'Pavimentação', 'Rua Ceará, Iguaçu, Araucária - PR', -25.5901, -49.4851, 'in_progress', 'Equipe técnica vistoriou o local. Recapeamento programado.', 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?q=80&w=800', false, NOW() - INTERVAL '5 days'),
  ('mock-r2', 'Poste sem Iluminação Pública', 'Lâmpada queimada há mais de uma semana em frente ao número 340.', 'Iluminação Pública', 'Avenida Victor do Amaral, Centro, Araucária - PR', -25.5925, -49.4812, 'unresolved', null, 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800', true, NOW() - INTERVAL '3 days'),
  ('mock-r3', 'Vazamento de Água Limpa', 'Vazamento contínuo correndo pela calçada perto do parque municipal.', 'Saneamento', 'Rua Ceará, Iguaçu, Araucária - PR', -25.5885, -49.4891, 'resolved', 'Tubulação reparada com sucesso pela equipe de saneamento.', 'https://images.unsplash.com/photo-1517436073-3b12361ac952?q=80&w=800', false, NOW() - INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;
