import React, { useState, useEffect } from "react";
import {
  X,
  Database,
  CheckCircle2,
  AlertTriangle,
  Copy,
  RefreshCw,
  UploadCloud,
  FileCode,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Layers,
  Wrench,
  Check,
} from "lucide-react";
import { useTheme } from "../ThemeContext";
import {
  supabase,
  isRealSupabase,
  syncAllDataToSupabase,
  setCustomSupabaseConfig,
  getSupabaseConfig,
} from "../lib/supabase";

interface DatabaseManagerModalProps {
  onClose: () => void;
  newsDbError?: string | null;
  onRefresh?: () => Promise<void>;
}

export const DatabaseManagerModal: React.FC<DatabaseManagerModalProps> = ({
  onClose,
  newsDbError,
  onRefresh,
}) => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<"status" | "sync" | "sql" | "credentials">("status");
  const [copiedSql, setCopiedSql] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    reportsSynced: number;
    workOrdersSynced: number;
    newsSynced: number;
    profilesSynced: number;
  } | null>(null);

  const [supabaseUrlInput, setSupabaseUrlInput] = useState("");
  const [supabaseKeyInput, setSupabaseKeyInput] = useState("");
  const [savedCredentialsMessage, setSavedCredentialsMessage] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    const cfg = getSupabaseConfig();
    setSupabaseUrlInput(cfg.url);
    setSupabaseKeyInput(cfg.key);
  }, []);

  const handleCopySql = () => {
    const sql = `-- =========================================================
-- COMMUÁRIA - SCRIPT CONSOLIDADO DE BANCO DE DADOS (SUPABASE SQL)
-- Execute este script no SQL Editor do seu projeto Supabase:
-- =========================================================

-- 1. Tabela de Perfis de Usuário (profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  assigned_category TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_until TIMESTAMPTZ,
  block_reason TEXT,
  blocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrações automáticas de colunas para perfis existentes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS block_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;

-- 2. Tabela de Ocorrências / Chamados de Zeladoria (reports)
CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT PRIMARY KEY DEFAULT ('rep_' || substr(md5(random()::text), 1, 10)),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'Pavimentação',
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  status TEXT DEFAULT 'unresolved',
  status_notes TEXT,
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 4. Tabela de Notícias e Comunicados (news)
CREATE TABLE IF NOT EXISTS public.news (
  id TEXT PRIMARY KEY DEFAULT ('news_' || substr(md5(random()::text), 1, 8)),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'Comunidade',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- ROW LEVEL SECURITY (RLS) - POLÍTICAS DE ACESSO LIVRE E SEGURO
-- =========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir tudo em profiles" ON public.profiles;
DROP POLICY IF EXISTS "Permitir tudo em reports" ON public.reports;
DROP POLICY IF EXISTS "Permitir tudo em work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "Permitir tudo em news" ON public.news;

CREATE POLICY "Permitir tudo em profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo em reports" ON public.reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo em work_orders" ON public.work_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo em news" ON public.news FOR ALL USING (true) WITH CHECK (true);
`;
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncAllDataToSupabase();
      setSyncResult(res);
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err.message || "Erro desconhecido durante a sincronização.",
        reportsSynced: 0,
        workOrdersSynced: 0,
        newsSynced: 0,
        profilesSynced: 0,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveCredentials = () => {
    setCustomSupabaseConfig(supabaseUrlInput.trim(), supabaseKeyInput.trim());
    setSavedCredentialsMessage("Credenciais salvas! A página será atualizada em instantes.");
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      if (!supabase) {
        setTestResult({ ok: false, message: "Cliente Supabase não inicializado." });
        return;
      }
      const { error: rErr } = await supabase.from("reports").select("id").limit(1);
      const { error: wErr } = await supabase.from("work_orders").select("id").limit(1);
      
      if (rErr || wErr) {
        setTestResult({
          ok: false,
          message: `Conexão atingida, porém uma das tabelas retornou erro: ${rErr?.message || wErr?.message}. Verifique se executou o script SQL na aba 'Script SQL'.`,
        });
      } else {
        setTestResult({
          ok: true,
          message: "Conexão com o Supabase testada com sucesso! As tabelas 'reports' e 'work_orders' estão acessíveis.",
        });
      }
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message || "Falha ao conectar com o Supabase." });
    } finally {
      setIsTesting(false);
    }
  };

  const localReportsCount = (() => {
    try {
      return JSON.parse(localStorage.getItem("commuaria_reports") || "[]").length;
    } catch {
      return 0;
    }
  })();

  const localWorkOrdersCount = (() => {
    try {
      return JSON.parse(localStorage.getItem("commuaria_work_orders") || "[]").length;
    } catch {
      return 0;
    }
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
      <div
        className={`w-full max-w-2xl rounded-[32px] border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors duration-300 ${
          isDark ? "bg-[#454d46] border-white/20 text-white" : "bg-white border-black/15 text-[#183a2b]"
        }`}
      >
        {/* Header */}
        <div
          className={`p-6 border-b flex items-center justify-between ${
            isDark ? "border-white/10 bg-black/20" : "border-black/10 bg-emerald-50/50"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-300">
              <Database size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-serif font-bold">Gerenciador de Banco de Dados</h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                    isRealSupabase
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                  }`}
                >
                  {isRealSupabase ? "Supabase Ativo" : "Modo Offline"}
                </span>
              </div>
              <p className={`text-xs ${isDark ? "text-white/60" : "text-[#2d4a3b]/70"}`}>
                Sincronização de chamados, ordens de serviço e script SQL da plataforma.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${
              isDark ? "hover:bg-white/10 text-white/70" : "hover:bg-black/10 text-black/70"
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          className={`flex border-b text-xs font-bold overflow-x-auto ${
            isDark ? "border-white/10 bg-black/10" : "border-black/10 bg-black/5"
          }`}
        >
          <button
            onClick={() => setActiveTab("status")}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "status"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                : "border-transparent opacity-70 hover:opacity-100"
            }`}
          >
            <ShieldCheck size={14} />
            <span>Diagnóstico & Status</span>
          </button>

          <button
            onClick={() => setActiveTab("sync")}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "sync"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                : "border-transparent opacity-70 hover:opacity-100"
            }`}
          >
            <UploadCloud size={14} />
            <span>Sincronizar Dados</span>
          </button>

          <button
            onClick={() => setActiveTab("sql")}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "sql"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                : "border-transparent opacity-70 hover:opacity-100"
            }`}
          >
            <FileCode size={14} />
            <span>Script SQL (Tabelas)</span>
          </button>

          <button
            onClick={() => setActiveTab("credentials")}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "credentials"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                : "border-transparent opacity-70 hover:opacity-100"
            }`}
          >
            <Wrench size={14} />
            <span>Configurar Chaves</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: DIAGNOSTIC & STATUS */}
          {activeTab === "status" && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3 ${
                  isRealSupabase
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200"
                }`}
              >
                {isRealSupabase ? (
                  <CheckCircle2 size={22} className="text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={22} className="text-amber-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-bold text-sm">
                    {isRealSupabase
                      ? "Conexão com Supabase Ativa"
                      : "Modo Local / Armazenamento Offline Ativo"}
                  </h4>
                  <p className="text-xs mt-1 leading-relaxed opacity-90">
                    {isRealSupabase
                      ? "O aplicativo está configurado para ler e gravar dados em nuvem. Se alguma tabela ainda estiver vazia no painel, use a aba 'Sincronizar Dados' para subir os dados locais."
                      : "O aplicativo está salvando chamados e ordens de serviço localmente no navegador. Para persistir de forma definitiva no Supabase, insira sua URL e Anon Key na aba 'Configurar Chaves'."}
                  </p>
                </div>
              </div>

              {/* Counts Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div
                  className={`p-3.5 rounded-2xl border text-center ${
                    isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
                  }`}
                >
                  <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {localReportsCount}
                  </span>
                  <span className="text-[11px] block opacity-75 font-semibold mt-1">
                    Chamados Locais
                  </span>
                </div>

                <div
                  className={`p-3.5 rounded-2xl border text-center ${
                    isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
                  }`}
                >
                  <span className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
                    {localWorkOrdersCount}
                  </span>
                  <span className="text-[11px] block opacity-75 font-semibold mt-1">
                    Ordens de Serviço
                  </span>
                </div>

                <div
                  className={`p-3.5 rounded-2xl border text-center col-span-2 sm:col-span-1 ${
                    isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
                  }`}
                >
                  <span className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
                    5
                  </span>
                  <span className="text-[11px] block opacity-75 font-semibold mt-1">
                    Setores Municipais
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
                >
                  {isTesting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Testando Conexão...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} />
                      Testar Acesso às Tabelas
                    </>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("sync")}
                  className={`flex-1 py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    isDark
                      ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
                      : "bg-neutral-100 border-neutral-300 text-[#183a2b] hover:bg-neutral-200"
                  }`}
                >
                  <UploadCloud size={14} />
                  Ir para Sincronização
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs font-semibold flex items-start gap-2 ${
                    testResult.ok
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                      : "bg-red-500/15 border-red-500/30 text-red-800 dark:text-red-200"
                  }`}
                >
                  {testResult.ok ? (
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SYNC NOW */}
          {activeTab === "sync" && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-2xl border ${
                  isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
                }`}
              >
                <h4 className="font-bold text-sm mb-1 flex items-center gap-2">
                  <UploadCloud size={18} className="text-emerald-500" />
                  Sincronização em Massa (Local ➔ Supabase Nuvem)
                </h4>
                <p className="text-xs leading-relaxed opacity-80">
                  Esta ferramenta lê todos os chamados da população, ordens de serviço (O.S.), perfis de supervisores e notícias armazenados no navegador e envia diretamente para o banco de dados Supabase.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Sincronizando com Supabase...
                    </>
                  ) : (
                    <>
                      <UploadCloud size={18} />
                      Sincronizar Todos os Chamados e O.S. Agora
                    </>
                  )}
                </button>
              </div>

              {syncResult && (
                <div
                  className={`p-5 rounded-2xl border text-xs space-y-2 ${
                    syncResult.success
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                      : "bg-red-500/15 border-red-500/30 text-red-800 dark:text-red-200"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {syncResult.success ? (
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    ) : (
                      <AlertTriangle size={18} className="text-red-500" />
                    )}
                    <span>{syncResult.message}</span>
                  </div>

                  {syncResult.success && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-500/20">
                      <div className="p-2 rounded-xl bg-black/10 dark:bg-white/10 text-center">
                        <span className="font-bold text-sm block">{syncResult.reportsSynced}</span>
                        <span className="text-[10px] opacity-80">Chamados</span>
                      </div>
                      <div className="p-2 rounded-xl bg-black/10 dark:bg-white/10 text-center">
                        <span className="font-bold text-sm block">{syncResult.workOrdersSynced}</span>
                        <span className="text-[10px] opacity-80">Ordens de Serviço</span>
                      </div>
                      <div className="p-2 rounded-xl bg-black/10 dark:bg-white/10 text-center">
                        <span className="font-bold text-sm block">{syncResult.newsSynced}</span>
                        <span className="text-[10px] opacity-80">Notícias</span>
                      </div>
                      <div className="p-2 rounded-xl bg-black/10 dark:bg-white/10 text-center">
                        <span className="font-bold text-sm block">{syncResult.profilesSynced}</span>
                        <span className="text-[10px] opacity-80">Perfis</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SQL SCRIPT */}
          {activeTab === "sql" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm">Script de Inicialização das Tabelas</h4>
                  <p className="text-xs opacity-75">
                    Execute no <strong>SQL Editor</strong> do painel do Supabase para criar as tabelas <code className="font-mono bg-black/10 px-1 py-0.5 rounded">reports</code> e <code className="font-mono bg-black/10 px-1 py-0.5 rounded">work_orders</code>.
                  </p>
                </div>

                <button
                  onClick={handleCopySql}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all shrink-0"
                >
                  {copiedSql ? (
                    <>
                      <Check size={14} />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copiar SQL
                    </>
                  )}
                </button>
              </div>

              <div
                className={`p-3 rounded-2xl font-mono text-[11px] max-h-64 overflow-y-auto overflow-x-auto whitespace-pre border ${
                  isDark ? "bg-black/50 border-white/15 text-white/90" : "bg-black/90 border-black/20 text-emerald-300"
                }`}
              >
{`CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  assigned_category TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT PRIMARY KEY DEFAULT ('rep_' || substr(md5(random()::text), 1, 10)),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'Pavimentação',
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  status TEXT DEFAULT 'unresolved',
  status_notes TEXT,
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.work_orders (
  id TEXT PRIMARY KEY DEFAULT ('wo_' || substr(md5(random()::text), 1, 10)),
  order_number TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Pavimentação',
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir tudo em reports" ON public.reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo em work_orders" ON public.work_orders FOR ALL USING (true) WITH CHECK (true);`}
              </div>
            </div>
          )}

          {/* TAB 4: CREDENTIALS CONFIG */}
          {activeTab === "credentials" && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-2xl border ${
                  isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
                }`}
              >
                <h4 className="font-bold text-sm mb-1">Configuração de Chaves do Supabase</h4>
                <p className="text-xs opacity-75">
                  Insira ou atualize o URL do seu projeto Supabase e a chave pública (Anon Key).
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold block mb-1">
                    Supabase Project URL (https://xxxx.supabase.co)
                  </label>
                  <input
                    type="text"
                    placeholder="https://seu-projeto.supabase.co"
                    value={supabaseUrlInput}
                    onChange={(e) => setSupabaseUrlInput(e.target.value)}
                    className={`w-full p-3 rounded-xl text-xs border font-mono focus:outline-none ${
                      isDark
                        ? "bg-black/30 border-white/20 text-white"
                        : "bg-white border-black/20 text-[#183a2b]"
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">
                    Supabase Anon / Public Key
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOi..."
                    value={supabaseKeyInput}
                    onChange={(e) => setSupabaseKeyInput(e.target.value)}
                    className={`w-full p-3 rounded-xl text-xs border font-mono focus:outline-none ${
                      isDark
                        ? "bg-black/30 border-white/20 text-white"
                        : "bg-white border-black/20 text-[#183a2b]"
                    }`}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveCredentials}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
                >
                  Salvar Credenciais & Recarregar
                </button>

                {savedCredentialsMessage && (
                  <p className="text-xs font-bold text-emerald-600 text-center animate-pulse">
                    {savedCredentialsMessage}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`p-4 border-t flex justify-end ${
            isDark ? "border-white/10 bg-black/20" : "border-black/10 bg-neutral-50"
          }`}
        >
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
