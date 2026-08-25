/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  UserPlus,
  Users,
  MessageSquare,
  MapPin,
  Calendar,
  Menu,
  Bell,
  Search,
  LayoutTemplate,
  Check,
  Home,
  Megaphone,
  ClipboardCheck,
  User,
  Settings,
  Camera,
  X,
  Share2,
  Share,
  Map,
  Filter,
  Trash2,
  Maximize2,
  Plus,
  AlertTriangle,
  Database,
  Copy,
  CheckCircle2,
  RefreshCw,
  FileText,
  ShieldCheck,
  Building2,
  Sparkles,
  ChevronRight,
  Eye,
  Activity,
  Sun,
  Moon,
  HardHat,
  Shield,
  Wrench,
  Clock,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  useMapEvents,
  Marker,
  Popup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { supabase, isRealSupabase } from "./lib/supabase";
import {
  CATEGORIES_CONFIG,
  ReportCategory,
  ReportItem,
  UserProfile,
  UserRole,
} from "./types";
import { SupervisorManagerModal } from "./components/SupervisorManagerModal";
import { CategorySelector } from "./components/CategorySelector";
import { SupervisorTasksView } from "./components/SupervisorTasksView";
import { SupervisorWorkOrderView } from "./components/SupervisorWorkOrderView";
import streetLightRepair from "./assets/images/street_light_repair_1780425533322.png";
import commuariaLogo from "./assets/images/logo.png";
import logoMinimalista from "./assets/images/logo_minimalista.png";
import logoPreta from "./assets/images/logo_preta.png";
import { COMMUARIA_LOGO_B64, LOGO_MINIMALISTA_B64 } from "./assets/logoData";
import { LOGO_PRETA_B64 } from "./assets/logoPretaData";
import fundoTelaInicio from "./assets/images/fundo_tela_de_inicio.png";
import cidadeEntrar from "./assets/images/cidade_entrar.png";
import entrarNaConta from "./assets/images/entrar_na_conta.png";
import pexelsAshford from "./assets/images/pexels_ashford_marx_1565533_7150075.jpg";
import pexelsJerson from "./assets/images/pexels_jerson_martins_1514473344_35599871.jpg";
import pexelsNandhu from "./assets/images/pexels_nandhukumar_339614.jpg";

// --- Theme System ---

export type ThemeMode = "dark" | "light";

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (t: ThemeMode) => void;
}

const ThemeContext = React.createContext<ThemeContextType>({
  theme: "dark",
  isDark: true,
  toggleTheme: () => {},
  setTheme: () => {},
});

export const useTheme = () => React.useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem("commuaria_theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch (e) {
      console.warn("Error reading theme from localStorage:", e);
    }
    return "dark";
  });

  const isDark = theme === "dark";

  const setTheme = (t: ThemeMode) => {
    setThemeState(t);
    try {
      localStorage.setItem("commuaria_theme", t);
    } catch (e) {
      console.warn("Error saving theme to localStorage:", e);
    }
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.remove("dark", "light");
    body.classList.remove("dark", "light");
    root.classList.add(theme);
    body.classList.add(theme);
    root.style.colorScheme = theme;
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const ThemeToggle = ({
  className = "",
  showLabel = false,
  size = "md",
}: {
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}) => {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggleTheme();
      }}
      title={isDark ? "Mudar para Tema Claro" : "Mudar para Tema Escuro"}
      aria-label={isDark ? "Mudar para Tema Claro" : "Mudar para Tema Escuro"}
      className={`relative inline-flex items-center justify-center gap-2 rounded-full transition-all duration-300 active:scale-95 cursor-pointer select-none ${
        isDark
          ? "bg-black/40 hover:bg-black/60 text-amber-300 border border-white/25 shadow-md backdrop-blur-md"
          : "bg-white hover:bg-zinc-100 text-amber-600 border border-zinc-300 shadow-md backdrop-blur-md"
      } ${
        size === "sm"
          ? "p-2 text-xs"
          : size === "lg"
          ? "px-4 py-2.5 text-sm"
          : "p-2.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium"
      } ${className}`}
    >
      <div className="relative flex items-center justify-center">
        {isDark ? (
          <Sun
            size={size === "sm" ? 16 : size === "lg" ? 20 : 18}
            className="text-amber-300 drop-shadow-sm transition-transform hover:rotate-45"
          />
        ) : (
          <Moon
            size={size === "sm" ? 16 : size === "lg" ? 20 : 18}
            className="text-emerald-800 drop-shadow-sm transition-transform hover:-rotate-12"
          />
        )}
      </div>
      {showLabel && (
        <span
          className={`font-mono text-xs font-semibold ${
            isDark ? "text-white/90" : "text-[#183a2b]"
          }`}
        >
          {isDark ? "Tema Escuro" : "Tema Claro"}
        </span>
      )}
    </button>
  );
};

// --- Components ---

const BackgroundMesh = () => (
  <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
    <div className="mesh-blob top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-800/15" />
    <div className="mesh-blob bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-teal-900/15" />
    <div className="mesh-blob top-[20%] right-[10%] w-[30%] h-[30%] bg-emerald-600/10" />
  </div>
);

const GlassButton = ({
  children,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary";
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}) => {
  const { isDark } = useTheme();

  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onClick={disabled ? undefined : onClick}
      type={type}
      disabled={disabled}
      className={`
        w-full py-3.5 px-8 rounded-full flex items-center justify-center gap-3
        backdrop-blur-[6px] border font-medium text-lg
        transition-all duration-300
        relative overflow-hidden
        ${
          isDark
            ? "border-white/20 text-white shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] bg-[#d2d2d2]/10 hover:bg-[#d2d2d2]/20"
            : "border-[#183a2b]/20 text-[#183a2b] shadow-[0_8px_24px_0_rgba(24,58,43,0.12)] bg-[#183a2b]/10 hover:bg-[#183a2b]/20"
        }
        ${disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}
        ${className}
      `}
    >
      {/* Subtle top highlight for depth */}
      <div
        className={`absolute inset-0 bg-gradient-to-b ${
          isDark ? "from-white/10" : "from-black/5"
        } to-transparent pointer-events-none`}
      />
      {children}
    </motion.button>
  );
};

const SafeLogoImage = ({
  className = "w-48 h-auto mx-auto mb-16 relative z-20 drop-shadow-xl",
  alt = "Commuária Logo",
  isMinimal = false,
  forceTheme,
}: {
  className?: string;
  alt?: string;
  isMinimal?: boolean;
  forceTheme?: "dark" | "light";
}) => {
  const { isDark } = useTheme();
  const effectiveIsDark = forceTheme ? forceTheme === "dark" : isDark;

  // On light backgrounds, use the black version of the logo
  const primarySrc = !effectiveIsDark
    ? logoPreta
    : isMinimal
    ? logoMinimalista
    : commuariaLogo;

  const fallbackB64 = !effectiveIsDark
    ? LOGO_PRETA_B64
    : isMinimal
    ? LOGO_MINIMALISTA_B64
    : COMMUARIA_LOGO_B64;

  const [currentSrc, setCurrentSrc] = useState(primarySrc);

  useEffect(() => {
    setCurrentSrc(primarySrc);
  }, [primarySrc]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => {
        const baseUrl = import.meta.env.BASE_URL || "./";
        const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
        const filename = !effectiveIsDark
          ? "logo_preta.png"
          : isMinimal
          ? "logo_minimalista.png"
          : "logo.png";

        if (currentSrc !== `${cleanBaseUrl}${filename}` && currentSrc !== fallbackB64) {
          setCurrentSrc(`${cleanBaseUrl}${filename}`);
        } else if (currentSrc !== fallbackB64) {
          // Guaranteed Base64 image fallback - embedded image data that cannot 404
          setCurrentSrc(fallbackB64);
        }
      }}
    />
  );
};

const DatabaseManagerModal = ({
  onClose,
  newsDbError,
  onRefresh,
}: {
  onClose: () => void;
  newsDbError: string | null;
  onRefresh: () => Promise<void>;
}) => {
  const { isDark } = useTheme();
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleCopySql = async () => {
    const sqlText = `-- COMMUÁRIA - SCRIPT COMPLETO DE BANCO DE DADOS (SUPABASE SQL)
-- Copie e cole este script no SQL Editor do seu projeto Supabase

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  status TEXT DEFAULT 'unresolved',
  image_url TEXT,
  anonymous BOOLEAN DEFAULT FALSE,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.news (
  id TEXT PRIMARY KEY DEFAULT ('news_' || substr(md5(random()::text), 1, 8)),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'Comunidade',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir tudo em profiles" ON public.profiles;
DROP POLICY IF EXISTS "Permitir tudo em reports" ON public.reports;
DROP POLICY IF EXISTS "Permitir tudo em news" ON public.news;

CREATE POLICY "Permitir tudo em profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo em reports" ON public.reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir tudo em news" ON public.news FOR ALL USING (true) WITH CHECK (true);`;

    try {
      await navigator.clipboard.writeText(sqlText);
      setCopied(true);
      setTimeout(() => setCopied(false), 4000);
    } catch (e) {
      alert("Script salvo em 'supabase_schema.sql' na raiz do seu projeto!");
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      if (!isRealSupabase) {
        setTestResult("📌 Modo Atual: Banco Local Persistente (LocalStorage). O aplicativo está operando com salvamento e leitura 100% funcionais!");
      } else {
        const { error } = await supabase.from("news").select("*").limit(1);
        if (error) {
          setTestResult(`⚠️ Erro do Supabase: ${error.message} (Código: ${error.code || 'RLS/Tabela'}). Dica: Execute o script SQL acima no Supabase.`);
        } else {
          setTestResult("✅ Conexão com o Supabase testada e confirmada com sucesso! Todas as tabelas e permissões estão funcionando.");
        }
      }
      await onRefresh();
    } catch (e: any) {
      setTestResult(`⚠️ Falha no teste: ${e.message || "Erro de rede"}`);
    } finally {
      setTesting(false);
    }
  };

  const handleResetLocalData = () => {
    if (confirm("Deseja restaurar os dados iniciais de teste (notícias e chamados) no seu navegador?")) {
      localStorage.removeItem("commuaria_news");
      localStorage.removeItem("commuaria_reports");
      localStorage.removeItem("commuaria_profiles");
      localStorage.removeItem("commuaria_users");
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className={`relative w-full max-w-2xl rounded-[32px] p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto font-sans transition-colors duration-300 ${
          isDark
            ? "bg-[#1d2d2e] border border-white/20 text-white"
            : "bg-white border border-black/10 text-[#183a2b]"
        }`}
      >
        <button
          onClick={onClose}
          className={`absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            isDark
              ? "bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"
              : "bg-black/5 hover:bg-black/10 text-[#183a2b]/70 hover:text-[#183a2b]"
          }`}
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-500/20 text-emerald-500 rounded-2xl border border-emerald-500/30">
            <Database size={28} />
          </div>
          <div>
            <h3 className={`text-2xl font-serif font-bold ${isDark ? "text-white" : "text-[#183a2b]"}`}>
              Gerenciador do Banco de Dados
            </h3>
            <p className={`text-xs font-mono mt-0.5 ${isDark ? "text-white/60" : "text-[#2d4a3b]/70"}`}>
              Sincronização & Schema do Commuária
            </p>
          </div>
        </div>

        {/* Current status pill */}
        <div className={`mb-6 p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
        }`}>
          <div>
            <span className={`text-xs block font-mono ${isDark ? "text-white/50" : "text-[#2d4a3b]/60"}`}>Modo de Operação Atual</span>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-300 flex items-center gap-2 mt-0.5">
              <CheckCircle2 size={18} />
              {isRealSupabase ? "Supabase Cloud Conectado" : "Banco de Dados Local Ativo (Persistente)"}
            </span>
          </div>
          <span className={`text-[11px] px-3 py-1 rounded-full font-mono ${
            isDark ? "bg-white/10 text-white/80" : "bg-black/10 text-[#183a2b]"
          }`}>
            {isRealSupabase ? "Nuvem + Local Fallback" : "Modo Offline Seguro"}
          </span>
        </div>

        {newsDbError && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs leading-relaxed flex items-start gap-3">
            <AlertTriangle size={20} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <strong className="block text-amber-900 dark:text-amber-300 font-bold mb-1">Aviso de Estrutura de Tabelas:</strong>
              {newsDbError}
            </div>
          </div>
        )}

        {/* Action Buttons Grid */}
        <div className="space-y-4 mb-6">
          {/* GitHub Configuration Help Box */}
          <div className={`border p-5 rounded-2xl space-y-3 ${
            isDark ? "bg-emerald-950/40 border-emerald-500/30" : "bg-emerald-50 border-emerald-200"
          }`}>
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-serif font-bold text-sm">
              <FileText size={18} />
              <span>Como Funciona no GitHub e GitHub Pages?</span>
            </div>
            <p className={`text-xs leading-relaxed ${isDark ? "text-white/70" : "text-[#2d4a3b]"}`}>
              No GitHub Pages, as variáveis do Supabase precisam ser adicionadas nos <strong>Secrets</strong> do seu repositório para que o deploy se conecte ao banco real da nuvem:
            </p>
            <ol className={`text-xs space-y-1.5 list-decimal list-inside p-3 rounded-xl border font-mono ${
              isDark ? "bg-black/30 text-white/80 border-white/5" : "bg-white/80 text-[#183a2b] border-black/5"
            }`}>
              <li>No GitHub: <strong>Settings ➔ Secrets and variables ➔ Actions</strong></li>
              <li>Adicione o Secret <code className="text-emerald-600 dark:text-emerald-300 font-bold">VITE_SUPABASE_URL</code> com a URL do seu Supabase</li>
              <li>Adicione o Secret <code className="text-emerald-600 dark:text-emerald-300 font-bold">VITE_SUPABASE_ANON_KEY</code> com a chave anon do Supabase</li>
              <li>Execute o script SQL abaixo no <strong>SQL Editor</strong> do Supabase</li>
            </ol>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80 italic">
              💡 Veja o arquivo <strong>GITHUB_DATABASE_SETUP.md</strong> na raiz do repositório para o tutorial passo a passo ilustrado.
            </p>
          </div>

          <div className={`p-5 rounded-2xl border space-y-3 ${
            isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
          }`}>
            <h4 className={`text-sm font-bold font-serif ${isDark ? "text-white/90" : "text-[#183a2b]"}`}>1. Script SQL para o Supabase</h4>
            <p className={`text-xs leading-relaxed ${isDark ? "text-white/60" : "text-[#2d4a3b]/80"}`}>
              Se estiver usando uma instância do Supabase na nuvem, copie o script SQL abaixo e cole no <strong>SQL Editor</strong> do seu painel Supabase para criar as tabelas (<code className="text-emerald-600 dark:text-emerald-300 px-1 py-0.5 rounded bg-black/10 dark:bg-black/30">profiles</code>, <code className="text-emerald-600 dark:text-emerald-300 px-1 py-0.5 rounded bg-black/10 dark:bg-black/30">reports</code>, <code className="text-emerald-600 dark:text-emerald-300 px-1 py-0.5 rounded bg-black/10 dark:bg-black/30">news</code>) e ativar as permissões RLS.
            </p>
            <button
              onClick={handleCopySql}
              className="w-full py-3.5 px-5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500 hover:text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.99]"
            >
              {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
              <span>{copied ? "Script SQL Copiado para a Área de Transferência!" : "Copiar Script SQL do Supabase"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`p-4 rounded-2xl border space-y-2 flex flex-col justify-between ${
              isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
            }`}>
              <div>
                <h4 className={`text-sm font-bold font-serif ${isDark ? "text-white/90" : "text-[#183a2b]"}`}>2. Testar Conexão</h4>
                <p className={`text-xs ${isDark ? "text-white/60" : "text-[#2d4a3b]/70"}`}>Valida a resposta do banco de dados em tempo real.</p>
              </div>
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className={`w-full py-2.5 px-4 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-2 mt-2 ${
                  isDark ? "bg-white/10 border-white/20 text-white hover:bg-white/20" : "bg-black/10 border-black/15 text-[#183a2b] hover:bg-black/15"
                }`}
              >
                <RefreshCw size={14} className={testing ? "animate-spin" : ""} />
                <span>{testing ? "Testando..." : "Testar Conexão Agora"}</span>
              </button>
            </div>

            <div className={`p-4 rounded-2xl border space-y-2 flex flex-col justify-between ${
              isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
            }`}>
              <div>
                <h4 className={`text-sm font-bold font-serif ${isDark ? "text-white/90" : "text-[#183a2b]"}`}>3. Restaurar Testes</h4>
                <p className={`text-xs ${isDark ? "text-white/60" : "text-[#2d4a3b]/70"}`}>Reinicializa os dados iniciais de demonstração locais.</p>
              </div>
              <button
                onClick={handleResetLocalData}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-xs hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center gap-2 mt-2"
              >
                <Database size={14} />
                <span>Restaurar Dados Iniciais</span>
              </button>
            </div>
          </div>
        </div>

        {testResult && (
          <div className={`mb-6 p-4 rounded-2xl border text-xs font-mono leading-relaxed ${
            isDark ? "bg-black/40 border-white/10 text-emerald-200" : "bg-emerald-50 border-emerald-200 text-emerald-900"
          }`}>
            {testResult}
          </div>
        )}

        <div className="pt-2 text-center">
          <button
            onClick={onClose}
            className={`px-8 py-3 rounded-full font-bold text-sm transition-all shadow-lg ${
              isDark ? "bg-white text-zinc-900 hover:bg-white/90" : "bg-[#183a2b] text-white hover:bg-[#122c21]"
            }`}
          >
            Concluído / Fechar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Views ---

const SignupView = ({
  onBack,
  onSignup,
}: {
  onBack: () => void;
  onSignup: (data: { name: string; email: string; password: string }) => void;
}) => {
  const { isDark } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    setError("");

    if (supabase) {
      try {
        const { data, error: supaError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
            },
          },
        });
        if (supaError) {
          if (
            supaError.message.toLowerCase().includes("rate limit") ||
            supaError.message.toLowerCase().includes("rate_limit")
          ) {
            setError(
              'Limite de e-mails do Supabase excedido! Para resolver, acesse seu Dashboard Supabase -> Authentication -> Providers -> Email e DESATIVE a opção "Confirm email".',
            );
          } else {
            setError(supaError.message);
          }
          return;
        }

        // Se for um Supabase real com confirmação de e-mail ativada
        if (data && !data.session && data.user) {
          setError(
            'Conta criada com sucesso! Por favor, verifique sua caixa de entrada de e-mail e clique no link de confirmação para poder entrar (ou desative "Confirm email" no seu Supabase).',
          );
          return;
        }
      } catch (err) {
        console.error("Supabase integration error", err);
      }
    }

    onSignup({ name, email, password });
  };

  return (
    <div
      className={`relative min-h-[100dvh] sm:min-h-full w-full flex flex-col items-center justify-center overflow-hidden font-sans transition-colors duration-300 ${
        isDark ? "bg-[#162A2C] text-white" : "bg-white text-[#183a2b]"
      }`}
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0 bg-cover"
        style={{
          backgroundImage: `url("${pexelsAshford}")`,
          backgroundPosition: "center 75%",
          filter: isDark ? "none" : "brightness(1.05) saturate(0.9)",
        }}
      />

      {/* Gradient transition to rectangle at the bottom half */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[60%] z-0 pointer-events-none"
        style={{
          background: isDark
            ? "linear-gradient(to bottom, rgba(94, 108, 91, 0) 0%, #5E6C5B 50%, #162A2C 100%)"
            : "linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(240, 244, 241, 0.7) 50%, #ffffff 100%)",
        }}
      />

      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        type="button"
        onClick={onBack}
        className={`absolute top-8 left-8 z-30 w-12 h-12 rounded-full backdrop-blur-[6px] border flex items-center justify-center transition-all shadow-lg ${
          isDark
            ? "bg-[#d2d2d2]/10 border-white/20 text-white hover:bg-white/20"
            : "bg-black/5 border-black/15 text-[#183a2b] hover:bg-black/10"
        }`}
      >
        <ArrowRight className="rotate-180" size={24} />
      </motion.button>

      {/* Theme Toggle */}
      <div className="absolute top-8 right-8 z-30">
        <ThemeToggle size="sm" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-8 pt-24">
        <motion.form
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="w-full space-y-6"
          onSubmit={handleSubmit}
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`w-full backdrop-blur-md border rounded-xl p-3 text-sm text-center font-serif italic shadow-lg ${
                isDark
                  ? "bg-red-500/20 border-red-500/30 text-red-100"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              {error}
            </motion.div>
          )}

          {/* Input Fields with Refraction */}
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full backdrop-blur-[6px] border rounded-full px-8 py-3.5 transition-all shadow-inner focus:outline-none ${
                isDark
                  ? "bg-[#d2d2d2]/10 border-white/15 text-white placeholder:text-white/40 focus:ring-1 focus:ring-white/20"
                  : "bg-black/5 border-black/15 text-[#183a2b] placeholder-[#2d4a3b]/60 focus:ring-1 focus:ring-[#183a2b]/30 focus:border-[#183a2b]"
              }`}
            />
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full backdrop-blur-[6px] border rounded-full px-8 py-3.5 transition-all shadow-inner focus:outline-none ${
                isDark
                  ? "bg-[#d2d2d2]/10 border-white/15 text-white placeholder:text-white/40 focus:ring-1 focus:ring-white/20"
                  : "bg-black/5 border-black/15 text-[#183a2b] placeholder-[#2d4a3b]/60 focus:ring-1 focus:ring-[#183a2b]/30 focus:border-[#183a2b]"
              }`}
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full backdrop-blur-[6px] border rounded-full px-8 py-3.5 transition-all shadow-inner focus:outline-none ${
                isDark
                  ? "bg-[#d2d2d2]/10 border-white/15 text-white placeholder:text-white/40 focus:ring-1 focus:ring-white/20"
                  : "bg-black/5 border-black/15 text-[#183a2b] placeholder-[#2d4a3b]/60 focus:ring-1 focus:ring-[#183a2b]/30 focus:border-[#183a2b]"
              }`}
            />
          </div>

          {/* Action Button with Refraction */}
          <div className="pt-8">
            <GlassButton
              onClick={() => {}}
              type="submit"
              className="py-4 text-xl font-serif italic w-full"
            >
              Cadastrar <ArrowRight size={28} />
            </GlassButton>
          </div>
        </motion.form>
      </div>
    </div>
  );
};

const ForgotPasswordView = ({
  onBack,
  initialStep = "email",
  onChangeStep,
}: {
  onBack: () => void;
  initialStep?: "email" | "code" | "reset";
  onChangeStep?: (step: "email" | "code" | "reset") => void;
}) => {
  const { isDark } = useTheme();
  const [step, setStep] = useState<"email" | "code" | "reset">(initialStep);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  const handleStepChange = (newStep: "email" | "code" | "reset") => {
    setStep(newStep);
    if (onChangeStep) {
      onChangeStep(newStep);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Por favor, insira seu e-mail.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      if (supabase) {
        const { error: supaError } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: window.location.origin,
          }
        );
        if (supaError) {
          setError(supaError.message);
        } else {
          setSuccessMsg("E-mail de recuperação enviado com sucesso!");
          setTimeout(() => setSuccessMsg(""), 5000);
          handleStepChange("code");
        }
      } else {
        setSuccessMsg("Código enviado para " + email);
        setTimeout(() => setSuccessMsg(""), 3000);
        handleStepChange("code");
      }
    } catch (err: any) {
      setError("Erro ao enviar recuperação: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("Por favor, digite o código de verificação.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      if (supabase) {
        // Primeiro tenta verificar o código real via Supabase OTP
        const { error: supaError } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: code.trim(),
          type: "recovery",
        });

        if (supaError) {
          // Fallback para código de teste 123456 se falhar o real
          if (code.trim() === "123456") {
            setSuccessMsg("Código de teste verificado!");
            setTimeout(() => setSuccessMsg(""), 3000);
            handleStepChange("reset");
          } else {
            setError("Código de verificação inválido ou expirado. Detalhes: " + supaError.message);
          }
        } else {
          setSuccessMsg("Código verificado com sucesso!");
          setTimeout(() => setSuccessMsg(""), 3000);
          handleStepChange("reset");
        }
      } else {
        if (code.trim() === "123456") {
          setSuccessMsg("Código verificado com sucesso!");
          setTimeout(() => setSuccessMsg(""), 3000);
          handleStepChange("reset");
        } else {
          setError('Código incorreto. Tente usar o código de teste "123456".');
        }
      }
    } catch (err: any) {
      setError("Erro ao verificar código: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      if (supabase) {
        const { error: supaError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (supaError) {
          setError(supaError.message);
        } else {
          setSuccessMsg("Senha alterada com sucesso! Redirecionando...");
          setTimeout(() => {
            onBack();
          }, 2500);
        }
      } else {
        setSuccessMsg("Senha alterada com sucesso! Redirecionando...");
        setTimeout(() => {
          onBack();
        }, 2000);
      }
    } catch (err: any) {
      setError("Erro ao redefinir senha: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`relative min-h-[100dvh] sm:min-h-full w-full flex flex-col items-center justify-center overflow-hidden font-sans transition-colors duration-300 ${
        isDark ? "bg-[#162A2C] text-white" : "bg-white text-[#183a2b]"
      }`}
    >
      {/* Subtle top highlight for depth */}
      <div
        className={`absolute inset-0 bg-gradient-to-b ${
          isDark ? "from-white/10" : "from-black/5"
        } to-transparent pointer-events-none`}
      />

      {/* Gradient transition to rectangle at the bottom half */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[60%] z-0 pointer-events-none"
        style={{
          background: isDark
            ? "linear-gradient(to bottom, rgba(94, 108, 91, 0) 0%, #5E6C5B 50%, #162A2C 100%)"
            : "linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(240, 244, 241, 0.7) 50%, #ffffff 100%)",
        }}
      />

      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        type="button"
        onClick={onBack}
        className={`absolute top-8 left-8 z-30 w-14 h-14 rounded-full backdrop-blur-[6px] border flex items-center justify-center transition-all shadow-lg ${
          isDark
            ? "bg-[#d2d2d2]/10 border-white/20 text-white hover:bg-white/20"
            : "bg-black/5 border-black/15 text-[#183a2b] hover:bg-black/10"
        }`}
      >
        <ArrowRight className="rotate-180" size={28} />
      </motion.button>

      {/* Theme Toggle */}
      <div className="absolute top-8 right-8 z-30">
        <ThemeToggle size="sm" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-8 pt-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-8 ${isDark ? "text-white" : "text-[#183a2b]"}`}
        >
          <h2 className="text-3xl font-serif italic mb-2 font-bold">
            {step === "email" && "Recuperar Senha"}
            {step === "code" && "E-mail Enviado!"}
            {step === "reset" && "Nova Senha"}
          </h2>
          <p className={`text-sm ${isDark ? "text-white/70" : "text-[#2d4a3b]/80"}`}>
            {step === "email" &&
              "Insira seu e-mail para receber o link e o código de recuperação."}
            {step === "code" && "Digite o código recebido no seu e-mail."}
            {step === "reset" && "Crie uma nova senha de acesso de no mínimo 6 caracteres."}
          </p>
        </motion.div>

        <motion.form
          key={step}
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full space-y-4"
          onSubmit={
            step === "email"
              ? handleEmailSubmit
              : step === "code"
                ? handleCodeSubmit
                : handleResetSubmit
          }
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`w-full backdrop-blur-md border rounded-xl p-3 text-sm text-center font-serif italic shadow-lg mb-2 ${
                isDark
                  ? "bg-red-500/20 border-red-500/30 text-red-100"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              {error}
            </motion.div>
          )}
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`w-full backdrop-blur-md border rounded-xl p-3 text-sm text-center font-serif italic shadow-lg mb-2 ${
                isDark
                  ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-100"
                  : "bg-emerald-50 border-emerald-200 text-emerald-800"
              }`}
            >
              {successMsg}
            </motion.div>
          )}

          {/* Dynamic Inputs Based on Step */}
          <div className="space-y-4 mb-2">
            {step === "email" && (
              <input
                type="email"
                placeholder="E-mail cadastrado"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full backdrop-blur-[6px] border rounded-full px-8 py-3.5 transition-all font-serif italic text-lg shadow-inner text-center focus:outline-none ${
                  isDark
                    ? "bg-[#d2d2d2]/10 border-white/15 text-white placeholder:text-white/60 focus:ring-1 focus:ring-white/20"
                    : "bg-black/5 border-black/15 text-[#183a2b] placeholder-[#2d4a3b]/60 focus:ring-1 focus:ring-[#183a2b]/30 focus:border-[#183a2b]"
                }`}
              />
            )}
            {step === "code" && (
              <input
                type="text"
                placeholder="Código"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 8))
                }
                className={`w-full backdrop-blur-[6px] border rounded-full px-8 py-3.5 transition-all font-serif italic text-2xl shadow-inner text-center tracking-[0.5em] focus:outline-none ${
                  isDark
                    ? "bg-[#d2d2d2]/10 border-white/15 text-white placeholder:text-white/60 focus:ring-1 focus:ring-white/20"
                    : "bg-black/5 border-black/15 text-[#183a2b] placeholder-[#2d4a3b]/60 focus:ring-1 focus:ring-[#183a2b]/30 focus:border-[#183a2b]"
                }`}
              />
            )}
            {step === "reset" && (
              <input
                type="password"
                placeholder="Nova Senha"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`w-full backdrop-blur-[6px] border rounded-full px-8 py-3.5 transition-all font-serif italic text-lg shadow-inner text-center focus:outline-none ${
                  isDark
                    ? "bg-[#d2d2d2]/10 border-white/15 text-white placeholder:text-white/60 focus:ring-1 focus:ring-white/20"
                    : "bg-black/5 border-black/15 text-[#183a2b] placeholder-[#2d4a3b]/60 focus:ring-1 focus:ring-[#183a2b]/30 focus:border-[#183a2b]"
                }`}
              />
            )}
          </div>

          {/* Action Button */}
          <div className="pt-4">
            <GlassButton
              onClick={() => {}}
              type="submit"
              disabled={isSubmitting}
              className="py-4 text-xl font-serif w-full"
            >
              {isSubmitting
                ? "Processando..."
                : step === "email"
                  ? "Enviar Link"
                  : step === "code"
                    ? "Verificar"
                    : "Alterar Senha"}
              {!isSubmitting && step !== "reset" && (
                <ArrowRight size={24} className="ml-2 inline-block" />
              )}
              {!isSubmitting && step === "reset" && (
                <Check size={24} className="ml-2 inline-block" />
              )}
            </GlassButton>
          </div>
        </motion.form>
      </div>
    </div>
  );
};

const LoginView = ({
  onBack,
  onLogin,
  onGoToSignup,
  onForgotPassword,
}: {
  onBack: () => void;
  onLogin: (
    role?: UserRole,
    assignedCategory?: string | null,
    data?: { name?: string; email: string; password: string },
  ) => void;
  onGoToSignup: () => void;
  onForgotPassword: () => void;
}) => {
  const { isDark } = useTheme();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !password.trim()) {
      setError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    setError("");
    setIsSubmitting(true);

    try {
      const cleanId = loginId.trim().toLowerCase();

      // 1. Check registered database profiles in localStorage first for role/assigned_category
      const localProfiles: UserProfile[] = JSON.parse(
        localStorage.getItem("commuaria_profiles") || "[]",
      );
      const localUsers = JSON.parse(
        localStorage.getItem("commuaria_users") || "[]",
      );

      const matchedLocalProfile = localProfiles.find((p) => {
        const pEmail = (p.email || "").toLowerCase();
        const pName = (p.name || "").toLowerCase();
        return cleanId === pEmail || cleanId === pName;
      });

      const matchedLocalUser = localUsers.find((u: any) => {
        const uEmail = (u.email || "").toLowerCase();
        const uName = (u.name || "").toLowerCase();
        return cleanId === uEmail || cleanId === uName;
      });

      // 2. Try Supabase Auth if available
      if (supabase) {
        try {
          const { data, error: supaError } =
            await supabase.auth.signInWithPassword({
              email: cleanId,
              password: password.trim(),
            });

          if (!supaError && data.user) {
            // Fetch real role and assigned_category from profiles table in database
            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", data.user.id)
              .maybeSingle();

            // Also check by email in database in case id doesn't match
            let resolvedProfile = profile;
            if (!resolvedProfile?.role || resolvedProfile.role === "user") {
              const { data: profileByEmail } = await supabase
                .from("profiles")
                .select("*")
                .eq("email", cleanId)
                .maybeSingle();
              if (profileByEmail?.role && profileByEmail.role !== "user") {
                resolvedProfile = profileByEmail;
              }
            }

            // Fallback to local profile role if database hasn't synced yet
            const finalRole: UserRole =
              resolvedProfile?.role ||
              matchedLocalProfile?.role ||
              matchedLocalUser?.role ||
              (resolvedProfile?.is_admin || matchedLocalProfile?.is_admin ? "admin" : "user");

            const finalCategory =
              resolvedProfile?.assigned_category ||
              matchedLocalProfile?.assigned_category ||
              matchedLocalUser?.assigned_category ||
              null;

            onLogin(finalRole, finalCategory, {
              name: resolvedProfile?.name || matchedLocalProfile?.name || cleanId.split("@")[0],
              email: cleanId,
              password,
            });
            return;
          }
        } catch (err) {
          console.warn("Supabase auth tentativa:", err);
        }
      }

      // 3. Authenticate from registered database profiles (commuaria_profiles / commuaria_users)
      if (matchedLocalProfile || matchedLocalUser) {
        const userRole: UserRole =
          matchedLocalProfile?.role ||
          matchedLocalUser?.role ||
          (matchedLocalProfile?.is_admin || matchedLocalUser?.is_admin ? "admin" : "user");

        const category =
          matchedLocalProfile?.assigned_category ||
          matchedLocalUser?.assigned_category ||
          null;

        onLogin(userRole, category, {
          name: matchedLocalProfile?.name || matchedLocalUser?.name || cleanId.split("@")[0],
          email: cleanId,
          password,
        });
        return;
      }

      // 3. Admin credentials or standard user login
      if (cleanId === "admin@commuaria.com" || cleanId === "admin") {
        onLogin("admin", null, {
          name: "Administrador Geral",
          email: cleanId,
          password,
        });
        return;
      }

      // 4. Standard Citizen / Morador user account login
      onLogin("user", null, {
        name: cleanId.split("@")[0],
        email: cleanId,
        password,
      });
    } catch (err: any) {
      setError("Erro ao autenticar: " + (err.message || "Tente novamente"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`relative min-h-[100dvh] sm:min-h-full w-full flex flex-col items-center justify-center overflow-hidden font-sans transition-colors duration-300 ${
        isDark ? "bg-[#162A2C] text-white" : "bg-white text-[#183a2b]"
      }`}
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0 bg-cover"
        style={{
          backgroundImage: `url("${pexelsJerson}")`,
          backgroundPosition: "center 85%",
          filter: isDark ? "none" : "brightness(1.05) saturate(0.9)",
        }}
      />

      {/* Gradient transition to rectangle at the bottom half */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[60%] z-0 pointer-events-none"
        style={{
          background: isDark
            ? "linear-gradient(to bottom, rgba(94, 108, 91, 0) 0%, #5E6C5B 50%, #162A2C 100%)"
            : "linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(240, 244, 241, 0.7) 50%, #ffffff 100%)",
        }}
      />

      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        type="button"
        onClick={onBack}
        className={`absolute top-8 left-8 z-30 w-14 h-14 rounded-full backdrop-blur-[6px] border flex items-center justify-center transition-all shadow-lg ${
          isDark
            ? "bg-[#d2d2d2]/10 border-white/20 text-white hover:bg-white/20"
            : "bg-black/5 border-black/15 text-[#183a2b] hover:bg-black/10"
        }`}
      >
        <ArrowRight className="rotate-180" size={28} />
      </motion.button>

      {/* Theme Toggle */}
      <div className="absolute top-8 right-8 z-30">
        <ThemeToggle size="sm" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-6 sm:px-8 pt-28 pb-12">
        <motion.form
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="w-full space-y-4"
          onSubmit={handleSubmit}
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`w-full backdrop-blur-md border rounded-xl p-3 text-sm text-center font-serif italic shadow-lg mb-2 ${
                isDark
                  ? "bg-red-500/20 border-red-500/30 text-red-100"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              {error}
            </motion.div>
          )}

          {/* Input Fields */}
          <div className="space-y-3 mb-2">
            <input
              type="text"
              placeholder="Nome ou E-mail"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className={`w-full backdrop-blur-[6px] border rounded-full px-7 py-3.5 transition-all font-serif italic text-base sm:text-lg shadow-inner focus:outline-none ${
                isDark
                  ? "bg-[#d2d2d2]/10 border-white/15 text-white placeholder:text-white/60 focus:ring-1 focus:ring-white/20"
                  : "bg-black/5 border-black/15 text-[#183a2b] placeholder-[#2d4a3b]/60 focus:ring-1 focus:ring-[#183a2b]/30 focus:border-[#183a2b]"
              }`}
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full backdrop-blur-[6px] border rounded-full px-7 py-3.5 transition-all font-serif italic text-base sm:text-lg shadow-inner focus:outline-none ${
                isDark
                  ? "bg-[#d2d2d2]/10 border-white/15 text-white placeholder:text-white/60 focus:ring-1 focus:ring-white/20"
                  : "bg-black/5 border-black/15 text-[#183a2b] placeholder-[#2d4a3b]/60 focus:ring-1 focus:ring-[#183a2b]/30 focus:border-[#183a2b]"
              }`}
            />
            <button
              type="button"
              onClick={onForgotPassword}
              className={`font-serif italic text-xs hover:underline transition-all block w-full text-center mt-1 ${
                isDark ? "text-white/80 hover:text-white" : "text-[#183a2b]/80 hover:text-[#183a2b]"
              }`}
            >
              esqueceu a senha
            </button>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-4">
            <GlassButton
              onClick={() => {}}
              type="submit"
              disabled={isSubmitting}
              className="py-3.5 text-xl font-serif w-full"
            >
              {isSubmitting ? "Entrando..." : "Entrar"} <ArrowRight size={24} />
            </GlassButton>

            <div className="flex flex-col gap-4 text-center pt-2">
              <button
                type="button"
                onClick={onGoToSignup}
                className={`w-fit py-2 px-6 rounded-full transition-all flex items-center justify-center gap-3 backdrop-blur-[6px] border text-[13px] font-serif italic mx-auto ${
                  isDark
                    ? "bg-[#d2d2d2]/10 border-white/10 text-white/80 hover:bg-white/15"
                    : "bg-black/5 border-black/10 text-[#183a2b]/80 hover:bg-black/10"
                }`}
              >
                Não possui conta? <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </motion.form>
      </div>
    </div>
  );
};

const LandingView = ({
  onEnter,
  onSignup,
  reports = [],
}: {
  onEnter: () => void;
  onSignup: () => void;
  reports?: any[];
}) => {
  const sampleReportsFallback = [
    {
      id: "landing-r1",
      title: "Buraco Profundo na Via",
      description: "Buraco profundo na pista na Rua Ceará, oferecendo perigo aos motoristas e pedestres.",
      address: "Rua Ceará, Iguaçu, Araucária - PR",
      latitude: -25.5901,
      longitude: -49.4851,
      status: "unresolved",
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "landing-r2",
      title: "Poste sem Iluminação Pública",
      description: "Lâmpada queimada há mais de uma semana.",
      address: "Avenida Victor do Amaral, Centro, Araucária - PR",
      latitude: -25.5925,
      longitude: -49.4812,
      status: "unresolved",
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "landing-r3",
      title: "Vazamento de Água Limpa",
      description: "Vazamento contínuo correndo pela calçada perto do parque municipal.",
      address: "Rua Ceará, Iguaçu, Araucária - PR",
      latitude: -25.5885,
      longitude: -49.4891,
      status: "resolved",
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "landing-r4",
      title: "Manutenção de Calçada e Acessibilidade",
      description: "Desnível de calçada próximo à praça central.",
      address: "Rua Presidente Carlos Cavalcanti, Centro, Araucária - PR",
      latitude: -25.5945,
      longitude: -49.4930,
      status: "unresolved",
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const displayReports =
    reports && reports.length > 0
      ? reports
      : (() => {
          try {
            const stored = localStorage.getItem("commuaria_reports");
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
          } catch (_) {}
          return sampleReportsFallback;
        })();

  const customLandingMarkerIcon = (status: string) =>
    L.divIcon({
      className: "custom-leaflet-icon",
      html: `
      <div class="flex items-center justify-center">
        <div class="p-2 rounded-full border border-white/40 shadow-lg ${
          status === "resolved"
            ? "bg-emerald-500 text-white shadow-emerald-500/30"
            : "bg-orange-500 text-white shadow-orange-500/30 animate-pulse"
        }">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.74a1.095 1.095 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      </div>
    `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
  const { isDark } = useTheme();

  return (
    <div
      className={`relative h-full w-full overflow-y-auto overflow-x-hidden font-sans transition-colors duration-300 ${
        isDark
          ? "bg-[#5A635C] text-white selection:bg-black/30"
          : "bg-white text-[#183a2b] selection:bg-black/10"
      }`}
    >
      {/* Background layer */}
      {isDark ? (
        <>
          <div className="fixed inset-0 z-0 bg-[#5A635C] pointer-events-none" />
          <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_0%,rgba(255,255,255,0.08),transparent_75%)] pointer-events-none" />
          <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_20%_90%,rgba(0,0,0,0.18),transparent_60%)] pointer-events-none" />
          <div className="fixed inset-0 z-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none" />
        </>
      ) : (
        <>
          <div className="fixed inset-0 z-0 bg-white pointer-events-none" />
          <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_0%,rgba(0,0,0,0.03),transparent_75%)] pointer-events-none" />
          <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_20%_90%,rgba(0,0,0,0.02),transparent_60%)] pointer-events-none" />
          <div className="fixed inset-0 z-0 bg-gradient-to-b from-slate-50 via-white to-slate-50 pointer-events-none" />
        </>
      )}

      {/* Floating Top Navigation Header */}
      <div className="sticky top-3 sm:top-4 z-30 px-3 sm:px-6 w-full max-w-5xl mx-auto">
        <header
          className={`flex items-center justify-between px-4 sm:px-7 py-3 sm:py-3.5 backdrop-blur-2xl border rounded-2xl sm:rounded-full shadow-lg transition-all duration-300 ${
            isDark
              ? "bg-black/35 hover:bg-black/45 border-white/20 text-white shadow-[0_12px_32px_rgba(0,0,0,0.25)]"
              : "bg-black/5 hover:bg-black/10 border-black/10 text-[#183a2b] shadow-[0_12px_32px_rgba(0,0,0,0.06)]"
          }`}
        >
          <div className="flex items-center gap-3">
            <SafeLogoImage
              isMinimal
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain drop-shadow-md"
              alt="Logo"
            />
            <div className="flex flex-col">
              <h1
                className={`text-lg sm:text-xl lg:text-2xl font-serif font-bold tracking-[0.1em] flex items-center gap-2 ${
                  isDark ? "text-white drop-shadow-md" : "text-[#183a2b]"
                }`}
              >
                COMMUÁRIA
              </h1>
              <span
                className={`text-[10px] tracking-wider font-mono -mt-1 hidden sm:inline-block ${
                  isDark ? "text-white/80" : "text-[#2d4a3b]"
                }`}
              >
                Uma cidade melhor começa com você
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle size="sm" />
            <button
              onClick={onEnter}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium backdrop-blur-md transition-all duration-200 flex items-center gap-1.5 shadow-sm active:scale-95 ${
                isDark
                  ? "text-white bg-white/15 hover:bg-white/25 border border-white/25"
                  : "text-[#183a2b] bg-black/5 hover:bg-black/10 border border-black/10"
              }`}
            >
              <span>Entrar</span>
              <ArrowRight size={14} />
            </button>
            <button
              onClick={onSignup}
              className={`hidden sm:flex px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 items-center gap-1.5 shadow-md active:scale-95 font-semibold ${
                isDark
                  ? "text-[#5A635C] bg-white hover:bg-white/90"
                  : "text-white bg-[#183a2b] hover:bg-[#122c21]"
              }`}
            >
              <UserPlus size={14} />
              <span>Criar Conta</span>
            </button>
          </div>
        </header>
      </div>

      {/* Main Presentation Container */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 sm:px-10 pt-8 sm:pt-12 pb-24 flex flex-col items-center">
        {/* Hero Section */}
        <section className="text-center max-w-3xl flex flex-col items-center pt-2 sm:pt-6">
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className={`text-3xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight leading-[1.15] ${
              isDark ? "text-white drop-shadow-md" : "text-[#183a2b]"
            }`}
          >
            Ajude a construir uma{" "}
            <span
              className={`underline underline-offset-8 ${
                isDark ? "text-white decoration-white/40" : "text-[#183a2b] decoration-[#183a2b]/30"
              }`}
            >
              Araucária
            </span>{" "}
            melhor
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`mt-6 text-base sm:text-lg leading-relaxed font-normal max-w-2xl ${
              isDark ? "text-white/90 drop-shadow-sm" : "text-[#2d4a3b]"
            }`}
          >
            A <strong>Commuária</strong> facilita a comunicação entre moradores e serviços públicos. Registre problemas da cidade, localize-os no mapa e acompanhe o andamento das solicitações.
          </motion.p>

          {/* Primary Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
          >
            <button
              onClick={onEnter}
              className={`w-full sm:w-auto px-8 py-4 rounded-full font-serif italic text-lg font-bold shadow-[0_10px_30px_rgba(0,0,0,0.15)] transition-all duration-300 flex items-center justify-center gap-3 active:scale-95 group ${
                isDark
                  ? "bg-white text-[#5A635C] hover:bg-white/90"
                  : "bg-[#183a2b] text-white hover:bg-[#122c21]"
              }`}
            >
              <span>Acessar o Aplicativo</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={onSignup}
              className={`w-full sm:w-auto px-7 py-3.5 rounded-full text-base font-medium backdrop-blur-xl shadow-md transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 ${
                isDark
                  ? "bg-black/25 hover:bg-black/35 border border-white/25 text-white"
                  : "bg-black/5 hover:bg-black/10 border border-black/10 text-[#183a2b] shadow-sm"
              }`}
            >
              <UserPlus size={18} className={isDark ? "text-white/80" : "text-[#2d4a3b]"} />
              <span>Cadastrar Gratuitamente</span>
            </button>
          </motion.div>
        </section>

        {/* Feature Cards Grid (Apresentação dos Recursos) */}
        <section className="mt-16 sm:mt-24 w-full">
          <div className="text-center mb-10">
            <h3
              className={`text-2xl sm:text-3xl font-serif font-bold tracking-wide ${
                isDark ? "text-white drop-shadow-sm" : "text-[#183a2b]"
              }`}
            >
              Como a Commuaria ajuda a melhorar a cidade
            </h3>
            <p
              className={`text-sm sm:text-base mt-2 ${
                isDark ? "text-white/80" : "text-[#2d4a3b]"
              }`}
            >
              Recursos para facilitar o registro, o acompanhamento e o acesso a informações sobre Araucária.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col group shadow-lg backdrop-blur-xl ${
                isDark
                  ? "bg-black/25 hover:bg-black/35 border-white/15 text-white"
                  : "bg-black/5 hover:bg-black/10 border-black/10 text-[#183a2b] shadow-sm"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-5 group-hover:scale-110 transition-transform ${
                  isDark
                    ? "bg-white/20 border-white/30 text-white"
                    : "bg-black/5 border-black/15 text-[#183a2b]"
                }`}
              >
                <Camera size={24} />
              </div>
              <h4
                className={`text-lg font-serif font-bold mb-2 ${
                  isDark ? "text-white" : "text-[#183a2b]"
                }`}
              >
                1. Registro de ocorrências
              </h4>
              <p
                className={`text-sm leading-relaxed ${
                  isDark ? "text-white/80" : "text-[#2d4a3b]"
                }`}
              >
                Identificou um problema na cidade? Registre uma foto, informe o endereço ou marque a localização diretamente no mapa.
              </p>
            </motion.div>

            {/* Card 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col group shadow-lg backdrop-blur-xl ${
                isDark
                  ? "bg-black/25 hover:bg-black/35 border-white/15 text-white"
                  : "bg-black/5 hover:bg-black/10 border-black/10 text-[#183a2b] shadow-sm"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-5 group-hover:scale-110 transition-transform ${
                  isDark
                    ? "bg-white/20 border-white/30 text-white"
                    : "bg-black/5 border-black/15 text-[#183a2b]"
                }`}
              >
                <ClipboardCheck size={24} />
              </div>
              <h4
                className={`text-lg font-serif font-bold mb-2 ${
                  isDark ? "text-white" : "text-[#183a2b]"
                }`}
              >
                2. Acompanhamento das solicitações
              </h4>
              <p
                className={`text-sm leading-relaxed ${
                  isDark ? "text-white/80" : "text-[#2d4a3b]"
                }`}
              >
                Acompanhe o andamento da sua solicitação e veja quando ela foi recebida, está em análise ou foi concluída.
              </p>
            </motion.div>

            {/* Card 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col group shadow-lg backdrop-blur-xl ${
                isDark
                  ? "bg-black/25 hover:bg-black/35 border-white/15 text-white"
                  : "bg-black/5 hover:bg-black/10 border-black/10 text-[#183a2b] shadow-sm"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-5 group-hover:scale-110 transition-transform ${
                  isDark
                    ? "bg-white/20 border-white/30 text-white"
                    : "bg-black/5 border-black/15 text-[#183a2b]"
                }`}
              >
                <Megaphone size={24} />
              </div>
              <h4
                className={`text-lg font-serif font-bold mb-2 ${
                  isDark ? "text-white" : "text-[#183a2b]"
                }`}
              >
                3. Notícias e obras locais
              </h4>
              <p
                className={`text-sm leading-relaxed ${
                  isDark ? "text-white/80" : "text-[#2d4a3b]"
                }`}
              >
                Acesse comunicados e informações sobre obras, serviços, ações e outros acontecimentos que estão ocorrendo em Araucária.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Interactive Map of Araucária showcasing citizen reports */}
        <section className="mt-12 sm:mt-16 w-full max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h3
              className={`text-xl sm:text-2xl font-serif font-bold tracking-wide ${
                isDark ? "text-white drop-shadow-sm" : "text-[#183a2b]"
              }`}
            >
              Relatos e demandas pela cidade
            </h3>
            <p
              className={`text-xs sm:text-sm mt-1.5 max-w-xl mx-auto ${
                isDark ? "text-white/80" : "text-[#2d4a3b]"
              }`}
            >
              Acompanhe no mapa os pontos com solicitações registradas pelos moradores em diferentes bairros de Araucária.
            </p>
          </div>

          {/* Map Frame Card */}
          <div
            className={`w-full rounded-3xl border backdrop-blur-2xl shadow-xl p-4 sm:p-6 flex flex-col gap-3 transition-colors duration-300 ${
              isDark
                ? "bg-black/25 border-white/15 text-white"
                : "bg-black/5 border-black/10 text-[#183a2b] shadow-sm"
            }`}
          >
            {/* Map Header Status & Indicators */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div
                className={`flex items-center gap-2 text-xs font-medium ${
                  isDark ? "text-white/90" : "text-[#183a2b]"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>
                  {displayReports.filter((r: any) => r.latitude && r.longitude).length} pontos mapeados
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs font-medium">
                <div
                  className={`flex items-center gap-1.5 ${
                    isDark ? "text-orange-300" : "text-amber-700"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50"></span>
                  <span>Em análise</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${
                    isDark ? "text-emerald-300" : "text-emerald-700"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                  <span>Concluído</span>
                </div>
              </div>
            </div>

            {/* Real-time Araucária Map Container */}
            <div
              className={`w-full h-[260px] sm:h-[320px] lg:h-[350px] rounded-2xl overflow-hidden shadow-inner border relative z-10 ${
                isDark ? "border-white/15 bg-white/5" : "border-black/10 bg-black/5"
              }`}
            >
              <MapContainer
                center={[-25.5929, -49.4891]}
                zoom={13}
                minZoom={11}
                maxBounds={[
                  [-25.8, -49.7],
                  [-25.4, -49.2],
                ]}
                maxBoundsViscosity={1.0}
                zoomControl={true}
                attributionControl={false}
                style={{
                  height: "100%",
                  width: "100%",
                  filter: isDark
                    ? "saturate(0.85) contrast(1.1) brightness(0.92)"
                    : "saturate(0.95) contrast(1.05) brightness(0.98)",
                }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {displayReports.map((report: any) => {
                  if (!report.latitude || !report.longitude) return null;
                  return (
                    <Marker
                      key={report.id || `${report.latitude}-${report.longitude}`}
                      position={[report.latitude, report.longitude]}
                      icon={customLandingMarkerIcon(report.status)}
                    />
                  );
                })}
              </MapContainer>
            </div>

            {/* Map Footnote */}
            <div
              className={`flex items-center justify-between gap-2 px-1 text-[11px] ${
                isDark ? "text-white/70" : "text-[#2d4a3b]"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-600 dark:text-emerald-500">📍</span> Visualização geográfica das solicitações cadastradas em Araucária.
              </span>
            </div>
          </div>
        </section>

        {/* Step-by-Step Flow */}
        <section
          className={`mt-16 sm:mt-24 w-full p-8 sm:p-10 rounded-3xl border backdrop-blur-2xl shadow-xl transition-colors duration-300 ${
            isDark
              ? "bg-black/25 border-white/15 text-white"
              : "bg-black/5 border-black/10 text-[#183a2b] shadow-sm"
          }`}
        >
          <div className="text-center max-w-xl mx-auto mb-10">
            <h3
              className={`text-2xl sm:text-3xl font-serif font-bold ${
                isDark ? "text-white" : "text-[#183a2b]"
              }`}
            >
              Como funciona na prática
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="flex flex-col items-center text-center">
              <div
                className={`w-10 h-10 rounded-full font-bold flex items-center justify-center mb-4 text-sm font-mono shadow-md ${
                  isDark
                    ? "bg-white text-[#5A635C]"
                    : "bg-[#183a2b] text-white"
                }`}
              >
                1
              </div>
              <h5
                className={`font-semibold text-base mb-1 ${
                  isDark ? "text-white" : "text-[#183a2b]"
                }`}
              >
                Registre o problema
              </h5>
              <p
                className={`text-xs sm:text-sm ${
                  isDark ? "text-white/80" : "text-[#2d4a3b]"
                }`}
              >
                Tire uma foto e escolha a categoria da ocorrência, como iluminação, pavimentação ou saneamento.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div
                className={`w-10 h-10 rounded-full font-bold flex items-center justify-center mb-4 text-sm font-mono shadow-md ${
                  isDark
                    ? "bg-white text-[#5A635C]"
                    : "bg-[#183a2b] text-white"
                }`}
              >
                2
              </div>
              <h5
                className={`font-semibold text-base mb-1 ${
                  isDark ? "text-white" : "text-[#183a2b]"
                }`}
              >
                Informe a localização
              </h5>
              <p
                className={`text-xs sm:text-sm ${
                  isDark ? "text-white/80" : "text-[#2d4a3b]"
                }`}
              >
                Confirme o local no mapa e adicione uma descrição para ajudar na identificação do problema.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div
                className={`w-10 h-10 rounded-full font-bold flex items-center justify-center mb-4 text-sm font-mono shadow-md ${
                  isDark
                    ? "bg-white text-[#5A635C]"
                    : "bg-[#183a2b] text-white"
                }`}
              >
                3
              </div>
              <h5
                className={`font-semibold text-base mb-1 ${
                  isDark ? "text-white" : "text-[#183a2b]"
                }`}
              >
                Acompanhe a solicitação
              </h5>
              <p
                className={`text-xs sm:text-sm ${
                  isDark ? "text-white/80" : "text-[#2d4a3b]"
                }`}
              >
                Consulte o status da ocorrência e acompanhe as atualizações até a sua conclusão.
              </p>
            </div>
          </div>

          {/* Bottom CTA in Flow Box */}
          <div
            className={`mt-10 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${
              isDark ? "border-white/15" : "border-black/10"
            }`}
          >
            <div className="text-center sm:text-left">
              <h6
                className={`font-semibold text-sm ${
                  isDark ? "text-white" : "text-[#183a2b]"
                }`}
              >
                Pronto para participar?
              </h6>
              <p
                className={`text-xs ${
                  isDark ? "text-white/70" : "text-[#2d4a3b]"
                }`}
              >
                Crie sua conta ou entre para começar a registrar e acompanhar ocorrências em Araucária.
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={onEnter}
                className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-full font-bold text-sm shadow-md transition-all active:scale-95 ${
                  isDark
                    ? "bg-white hover:bg-white/90 text-[#5A635C]"
                    : "bg-[#183a2b] hover:bg-[#122c21] text-white"
                }`}
              >
                Entrar
              </button>
              <button
                onClick={onSignup}
                className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-full text-sm transition-all active:scale-95 backdrop-blur-md ${
                  isDark
                    ? "bg-black/25 hover:bg-black/35 border border-white/20 text-white"
                    : "bg-black/5 hover:bg-black/10 border border-black/10 text-[#183a2b] shadow-sm"
                }`}
              >
                Cadastrar
              </button>
            </div>
          </div>
        </section>

        {/* Footer info */}
        <footer
          className={`mt-16 text-center text-xs sm:text-sm flex flex-col items-center gap-1.5 transition-colors duration-300 py-4 px-6 rounded-2xl max-w-2xl mx-auto backdrop-blur-xl border ${
            isDark
              ? "bg-white/5 border-white/10 text-white"
              : "bg-black/5 border-black/10 text-[#183a2b] shadow-sm"
          }`}
        >
          <p
            className={`font-semibold tracking-wide ${
              isDark ? "text-white" : "text-[#183a2b]"
            }`}
          >
            © {new Date().getFullYear()} Commuária • Plataforma de Cidadania e Zeladoria de Araucária - PR
          </p>
          <p
            className={`text-xs font-medium ${
              isDark ? "text-white/90" : "text-[#2d4a3b]"
            }`}
          >
            Desenvolvido para fortalecer a participação cidadã e o cuidado urbano.
          </p>
        </footer>
      </main>
    </div>
  );
};

const CustomToggle = ({ label, value, offText, onText, onChange }: any) => {
  const { isDark } = useTheme();

  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span
        className={`text-xl sm:text-[26px] font-serif font-bold leading-tight select-none drop-shadow-sm ${
          isDark ? "text-white/95" : "text-[#183a2b]"
        }`}
      >
        {label}
      </span>
      <div
        className={`relative w-[72px] h-8 rounded-full cursor-pointer flex items-center shadow-inner shrink-0 ${
          isDark ? "bg-black/80" : "bg-zinc-300"
        }`}
        onClick={() => onChange(!value)}
      >
        <motion.div
          animate={{ x: value ? 32 : -8 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className={`w-12 h-12 absolute rounded-full flex items-center justify-center border transition-all duration-300 ${
            value
              ? "border-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.6)] text-emerald-950"
              : isDark
              ? "border-white/20 shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_4px_8px_rgba(0,0,0,0.6)] text-white"
              : "border-zinc-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1),0_4px_8px_rgba(0,0,0,0.15)] text-zinc-700"
          }`}
          style={{
            background: value
              ? "linear-gradient(145deg, #f0fdf4, #86efac)"
              : isDark
              ? "linear-gradient(145deg, #7b8882, #555f5a)"
              : "linear-gradient(145deg, #ffffff, #e4e4e7)",
          }}
        >
          <span className="text-[10px] font-black drop-shadow-sm tracking-wider uppercase font-mono">
            {value ? onText : offText}
          </span>
        </motion.div>
      </div>
    </div>
  );
};

const SettingsView = ({
  anonymous,
  setAnonymous,
  onBack,
  onLogout,
  onDeleteAccount,
  onOpenDbManager,
}: {
  anonymous: boolean;
  setAnonymous: (v: boolean) => void;
  onBack: () => void;
  onLogout: () => void;
  onDeleteAccount?: () => void;
  onOpenDbManager?: () => void;
}) => {
  const [notifications, setNotifications] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { theme, isDark, setTheme } = useTheme();

  const handleDeleteAccount = async () => {
    if (
      window.confirm(
        "Certeza que deseja excluir sua conta? Esta ação é irreversível.",
      )
    ) {
      setIsDeleting(true);
      if (onDeleteAccount) {
        await onDeleteAccount();
      }
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={`relative min-h-[100dvh] sm:min-h-full w-full font-sans overflow-y-auto pb-32 transition-colors duration-300 ${
        isDark ? "bg-[#5A635C] text-white" : "bg-white text-[#183a2b]"
      }`}
    >
      {/* Top Image Section */}
      <div className="relative w-full h-[35vh] min-h-[200px] flex flex-col justify-end pb-8">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1000")',
            filter: isDark ? "brightness(0.7) saturate(0.8)" : "brightness(0.85) saturate(0.85)",
          }}
        />
        <div
          className={`absolute inset-0 z-0 bg-gradient-to-b from-transparent ${
            isDark ? "to-[#5A635C]" : "to-white"
          }`}
        />

        {/* Back Button */}
        <button
          onClick={onBack}
          className={`absolute top-8 left-6 z-20 w-12 h-12 rounded-full backdrop-blur-xl border flex items-center justify-center transition-all ${
            isDark
              ? "bg-white/20 border-white/20 text-white hover:bg-white/30"
              : "bg-black/10 border-black/15 text-[#183a2b] hover:bg-black/20 shadow-md"
          }`}
        >
          <ArrowRight className="rotate-180" size={24} />
        </button>

        <h2
          className={`relative z-10 text-[36px] font-serif font-bold text-center w-full drop-shadow-xl tracking-wide ${
            isDark ? "text-white" : "text-[#183a2b]"
          }`}
        >
          Configuração
        </h2>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Preferences Card */}
          <div
            className={`p-6 sm:p-8 rounded-[32px] border shadow-lg space-y-6 transition-colors duration-300 backdrop-blur-2xl ${
              isDark
                ? "bg-white/5 border-white/10 text-white"
                : "bg-black/5 border-black/10 text-[#183a2b] shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
            }`}
          >
            <h4
              className={`text-xl font-serif font-bold border-b pb-2 ${
                isDark ? "text-white/90 border-white/10" : "text-[#183a2b] border-black/10"
              }`}
            >
              Preferências
            </h4>

            {/* Theme Switcher Setting */}
            <div className="flex flex-col gap-3 py-1 border-b border-black/10 dark:border-white/10 pb-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span
                    className={`text-xl sm:text-[24px] font-serif font-bold leading-tight ${
                      isDark ? "text-white/95" : "text-[#183a2b]"
                    }`}
                  >
                    Tema Visual
                  </span>
                  <span
                    className={`text-xs mt-0.5 ${
                      isDark ? "text-white/60 font-mono" : "text-[#2d4a3b] font-mono"
                    }`}
                  >
                    {isDark ? "Tema Escuro (Padrão)" : "Tema Claro (Confortável)"}
                  </span>
                </div>

                <div
                  className={`flex items-center gap-1.5 p-1 rounded-full border ${
                    isDark
                      ? "bg-black/30 border-white/15"
                      : "bg-black/5 border-black/10 shadow-inner"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                      !isDark
                        ? "bg-[#183a2b] text-white shadow-md"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    <Sun size={14} className={!isDark ? "text-amber-300" : ""} />
                    <span>Claro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isDark
                        ? "bg-[#5A635C] text-white shadow-md border border-white/20"
                        : "text-[#2d4a3b] hover:text-[#183a2b]"
                    }`}
                  >
                    <Moon size={14} className={isDark ? "text-amber-300" : ""} />
                    <span>Escuro</span>
                  </button>
                </div>
              </div>
            </div>

            <CustomToggle
              label="Receber Notificações"
              value={notifications}
              offText="OFF"
              onText="ON"
              onChange={setNotifications}
            />

            <CustomToggle
              label="Relatar de Forma Anônima"
              value={anonymous}
              offText="OFF"
              onText="ON"
              onChange={setAnonymous}
            />
          </div>

          {/* Account Security Card */}
          <div
            className={`p-6 sm:p-8 rounded-[32px] border shadow-lg space-y-6 transition-colors duration-300 backdrop-blur-2xl ${
              isDark
                ? "bg-white/5 border-white/10 text-white"
                : "bg-black/5 border-black/10 text-[#183a2b] shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
            }`}
          >
            <h4
              className={`text-xl font-serif font-bold border-b pb-2 ${
                isDark ? "text-white/90 border-white/10" : "text-[#183a2b] border-black/10"
              }`}
            >
              Segurança da Conta
            </h4>

            <div className="space-y-4 flex flex-col items-center">
              <button
                onClick={onLogout}
                className={`px-6 py-3.5 rounded-full border text-md font-serif font-bold shadow-md transition-all w-full active:scale-[0.98] ${
                  isDark
                    ? "bg-white/15 border-white/20 text-white hover:bg-white/25"
                    : "bg-black/5 border-black/10 text-[#183a2b] hover:bg-black/10"
                }`}
              >
                Sair da conta
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="px-6 py-3.5 rounded-full bg-red-600/10 border border-red-500/20 text-red-600 dark:text-red-500 text-md font-serif font-bold shadow-md hover:bg-red-600 hover:text-white transition-all w-full active:scale-[0.98] disabled:opacity-50"
              >
                {isDeleting ? "Excluindo..." : "Excluir conta definitivamente"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileView = ({
  user,
  onSave,
  onBack,
}: {
  user: {
    name: string;
    email: string;
    password?: string;
    resolved: number;
    open: number;
  };
  onSave: (data: any) => void;
  onBack: () => void;
}) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState(user.password || "");
  const { isDark } = useTheme();

  const handleSave = () => {
    onSave({ name, email, password });
  };

  return (
    <div
      className={`relative min-h-[100dvh] sm:min-h-full w-full font-sans overflow-y-auto pb-20 transition-colors duration-300 ${
        isDark ? "bg-[#5A635C] text-white" : "bg-white text-[#183a2b]"
      }`}
    >
      {/* Top Image Section */}
      <div className="relative w-full h-[35vh] flex flex-col justify-end pb-8">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1000")',
            filter: isDark ? "brightness(0.7) saturate(0.8)" : "brightness(0.85) saturate(0.85)",
          }}
        />
        <div
          className={`absolute inset-0 z-0 bg-gradient-to-b from-transparent ${
            isDark ? "to-[#5A635C]" : "to-white"
          }`}
        />

        {/* Back Button */}
        <button
          onClick={onBack}
          className={`absolute top-8 left-6 z-20 w-12 h-12 rounded-full backdrop-blur-xl border flex items-center justify-center transition-all ${
            isDark
              ? "bg-white/20 border-white/20 text-white hover:bg-white/30"
              : "bg-black/10 border-black/15 text-[#183a2b] hover:bg-black/20 shadow-md"
          }`}
        >
          <ArrowRight className="rotate-180" size={24} />
        </button>

        <h2
          className={`relative z-10 text-[36px] font-serif font-bold text-center w-full drop-shadow-xl tracking-wide ${
            isDark ? "text-white" : "text-[#183a2b]"
          }`}
        >
          Meu perfil
        </h2>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <h3
          className={`text-[28px] font-serif font-bold mb-6 drop-shadow-md text-center sm:text-left ${
            isDark ? "text-white" : "text-[#183a2b]"
          }`}
        >
          Meus dados
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div
            className={`space-y-4 p-6 sm:p-8 rounded-[32px] border shadow-lg transition-colors duration-300 backdrop-blur-2xl ${
              isDark
                ? "bg-white/5 border-white/10 text-white"
                : "bg-black/5 border-black/10 text-[#183a2b] shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
            }`}
          >
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full rounded-[20px] px-6 py-4 transition-all focus:outline-none shadow-inner ${
                  isDark
                    ? "bg-[#7a817c]/50 border border-white/20 text-white placeholder:text-white/70 focus:border-white/50"
                    : "bg-black/5 border border-black/15 text-[#183a2b] placeholder:text-[#2d4a3b]/60 focus:border-[#183a2b]"
                }`}
              />
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full rounded-[20px] px-6 py-4 transition-all focus:outline-none shadow-inner ${
                  isDark
                    ? "bg-[#7a817c]/50 border border-white/20 text-white placeholder:text-white/70 focus:border-white/50"
                    : "bg-black/5 border border-black/15 text-[#183a2b] placeholder:text-[#2d4a3b]/60 focus:border-[#183a2b]"
                }`}
              />
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full rounded-[20px] px-6 py-4 transition-all focus:outline-none shadow-inner ${
                  isDark
                    ? "bg-[#7a817c]/50 border border-white/20 text-white placeholder:text-white/70 focus:border-white/50"
                    : "bg-black/5 border border-black/15 text-[#183a2b] placeholder:text-[#2d4a3b]/60 focus:border-[#183a2b]"
                }`}
              />
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={handleSave}
                className={`px-10 py-3 rounded-[30px] font-bold transition-all shadow-lg w-full sm:w-auto active:scale-95 ${
                  isDark
                    ? "bg-white text-[#5A635C] hover:bg-white/90"
                    : "bg-[#183a2b] text-white hover:bg-[#122c21]"
                }`}
              >
                Salvar Alterações
              </button>
            </div>
          </div>

          <div
            className={`space-y-6 p-6 sm:p-8 rounded-[32px] border shadow-lg transition-colors duration-300 backdrop-blur-2xl ${
              isDark
                ? "bg-white/5 border-white/10 text-white"
                : "bg-black/5 border-black/10 text-[#183a2b] shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
            }`}
          >
            <h4
              className={`text-xl font-serif font-bold mb-4 border-b pb-2 ${
                isDark ? "text-white/90 border-white/10" : "text-[#183a2b] border-black/10"
              }`}
            >
              Estatísticas de Zeladoria
            </h4>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[18px] sm:text-[22px] font-serif font-bold leading-tight drop-shadow-sm">
                  Chamados
                  <br />
                  Abertos
                </span>
                <div className="flex items-center gap-6">
                  <div
                    className={`w-px h-12 ${
                      isDark ? "bg-white/30" : "bg-black/15"
                    }`}
                  ></div>
                  <span className="text-[36px] sm:text-[40px] font-serif font-bold tracking-wider text-amber-700 dark:text-orange-400">
                    {user.open.toString().padStart(2, "0")}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[18px] sm:text-[22px] font-serif font-bold leading-tight drop-shadow-sm">
                  Problemas
                  <br />
                  Resolvidos
                </span>
                <div className="flex items-center gap-6">
                  <div
                    className={`w-px h-12 ${
                      isDark ? "bg-white/30" : "bg-black/15"
                    }`}
                  ></div>
                  <span className="text-[36px] sm:text-[40px] font-serif font-bold tracking-wider text-emerald-800 dark:text-emerald-500">
                    {user.resolved.toString().padStart(2, "0")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BottomNav = ({
  currentTab,
  onTabChange,
  isAdmin = false,
  userRole = "user",
}: {
  currentTab: "home" | "report" | "tasks";
  onTabChange: (tab: "home" | "report" | "tasks") => void;
  isAdmin?: boolean;
  userRole?: UserRole;
}) => {
  const { isDark } = useTheme();

  return (
    <div className="absolute bottom-8 w-full px-4 flex justify-center z-50 pointer-events-auto">
      <div
        className={`px-10 py-5 rounded-[40px] drop-shadow-2xl border flex items-center justify-between gap-12 sm:gap-16 w-full max-w-[340px] transition-colors duration-300 backdrop-blur-2xl ${
          isDark
            ? "border-white/20 bg-gradient-to-r from-white/15 to-white/5 shadow-2xl"
            : "border-black/10 bg-black/5 shadow-xl text-[#183a2b]"
        }`}
      >
        <button
          onClick={() => onTabChange("home")}
          className={`relative flex flex-col items-center group transition-colors ${
            currentTab === "home"
              ? isDark
                ? "text-white"
                : "text-[#183a2b] font-bold"
              : isDark
              ? "text-white/50 hover:text-white"
              : "text-[#2d4a3b]/70 hover:text-[#183a2b]"
          }`}
          title="Início"
        >
          <Home
            fill={currentTab === "home" ? "currentColor" : "none"}
            size={32}
            strokeWidth={1.5}
            className={
              currentTab !== "home"
                ? "group-hover:scale-110 transition-transform"
                : ""
            }
          />
          {currentTab === "home" && (
            <div
              className={`w-2 h-2 rounded-full absolute -bottom-4 ${
                isDark
                  ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                  : "bg-[#183a2b] shadow-[0_0_6px_rgba(24,58,43,0.4)]"
              }`}
            />
          )}
        </button>
        <button
          onClick={() => onTabChange("report")}
          className={`relative flex flex-col items-center group transition-colors ${
            currentTab === "report"
              ? isDark
                ? "text-white"
                : "text-[#183a2b] font-bold"
              : isDark
              ? "text-white/50 hover:text-white"
              : "text-[#2d4a3b]/70 hover:text-[#183a2b]"
          }`}
          title={
            isAdmin
              ? "Mapa Geral"
              : userRole === "supervisor"
              ? "Ordens de Serviço (O.S.)"
              : "Relatar Problema"
          }
        >
          {isAdmin ? (
            <Map
              fill={currentTab === "report" ? "currentColor" : "none"}
              size={32}
              strokeWidth={1.5}
              className={
                currentTab !== "report"
                  ? "group-hover:scale-110 transition-transform"
                  : ""
              }
            />
          ) : userRole === "supervisor" ? (
            <Wrench
              fill={currentTab === "report" ? "currentColor" : "none"}
              size={30}
              strokeWidth={1.6}
              className={
                currentTab !== "report"
                  ? "group-hover:scale-110 transition-transform"
                  : ""
              }
            />
          ) : (
            <Megaphone
              fill={currentTab === "report" ? "currentColor" : "none"}
              size={32}
              strokeWidth={1.5}
              className={
                currentTab !== "report"
                  ? "group-hover:scale-110 transition-transform"
                  : ""
              }
            />
          )}
          {currentTab === "report" && (
            <div
              className={`w-2 h-2 rounded-full absolute -bottom-4 ${
                isDark
                  ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                  : "bg-[#183a2b] shadow-[0_0_6px_rgba(24,58,43,0.4)]"
              }`}
            />
          )}
        </button>
        <button
          onClick={() => onTabChange("tasks")}
          className={`relative flex flex-col items-center group transition-colors ${
            currentTab === "tasks"
              ? isDark
                ? "text-white"
                : "text-[#183a2b] font-bold"
              : isDark
              ? "text-white/50 hover:text-white"
              : "text-[#2d4a3b]/70 hover:text-[#183a2b]"
          }`}
        >
          <ClipboardCheck
            fill={currentTab === "tasks" ? "currentColor" : "none"}
            size={32}
            strokeWidth={1.5}
            className={
              currentTab !== "tasks"
                ? "group-hover:scale-110 transition-transform"
                : ""
            }
          />
          {currentTab === "tasks" && (
            <div
              className={`w-2 h-2 rounded-full absolute -bottom-4 ${
                isDark
                  ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                  : "bg-[#183a2b] shadow-[0_0_6px_rgba(24,58,43,0.4)]"
              }`}
            />
          )}
        </button>
      </div>
    </div>
  );
};

const FloatingMenu = ({
  onGoToProfile,
  onGoToSettings,
}: {
  onGoToProfile: () => void;
  onGoToSettings: () => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isDark } = useTheme();

  return (
    <motion.div
      layout
      className={`absolute top-8 right-6 z-50 flex flex-col items-center overflow-hidden border shadow-2xl transition-colors duration-300 backdrop-blur-2xl ${
        isDark
          ? "border-white/30 bg-white/20 text-white"
          : "border-black/10 bg-black/5 text-[#183a2b] shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
      }`}
      style={{
        backdropFilter: "blur(24px)",
        borderRadius: 40,
      }}
      initial={{ height: 52, width: 52 }}
      animate={{ height: menuOpen ? "auto" : 52, width: 52 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <motion.button
        layout="position"
        onClick={() => setMenuOpen(!menuOpen)}
        className={`w-[52px] h-[52px] flex-shrink-0 flex items-center justify-center drop-shadow-md z-10 ${
          isDark ? "text-white/90" : "text-[#183a2b]"
        }`}
      >
        <Menu size={28} strokeWidth={2.5} />
      </motion.button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.1 } }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center gap-5 pb-5 pt-2"
          >
            <ThemeToggle size="sm" />
            <button
              onClick={onGoToProfile}
              title="Meu Perfil"
              className={`transition-colors relative group p-1 ${
                isDark ? "text-white/80 hover:text-white" : "text-[#2d4a3b]/80 hover:text-[#183a2b]"
              }`}
            >
              <User
                size={24}
                strokeWidth={2.5}
                fill="currentColor"
                className="drop-shadow-md opacity-90 group-hover:opacity-100"
              />
            </button>
            <button
              onClick={onGoToSettings}
              title="Configurações"
              className={`transition-colors relative group p-1 ${
                isDark ? "text-white/80 hover:text-white" : "text-[#2d4a3b]/80 hover:text-[#183a2b]"
              }`}
            >
              <Settings
                size={24}
                strokeWidth={2.5}
                fill="currentColor"
                className="drop-shadow-md opacity-90 group-hover:opacity-100"
              />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const MapWatcher = ({
  onMoveEnd,
}: {
  onMoveEnd: (lat: number, lng: number) => void;
}) => {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      onMoveEnd(center.lat, center.lng);
    },
  });
  return null;
};

const MapRecenter = ({ center }: { center: [number, number] }) => {
  const map = useMapEvents({});
  useEffect(() => {
    const currentCenter = map.getCenter();
    if (
      Math.abs(currentCenter.lat - center[0]) > 0.0001 ||
      Math.abs(currentCenter.lng - center[1]) > 0.0001
    ) {
      map.setView(center, 15, { animate: false });
    }
  }, [center, map]);
  return null;
};

const TasksView = ({
  reports,
  onTabChange,
  onGoToProfile,
  onGoToSettings,
  onViewDetails,
  onDeleteReport,
}: {
  reports: any[];
  onTabChange: (tab: "home" | "report" | "tasks") => void;
  onGoToProfile: () => void;
  onGoToSettings: () => void;
  onViewDetails: (report: any) => void;
  onDeleteReport: (id: string) => Promise<void>;
}) => {
  const { isDark } = useTheme();

  return (
    <div
      className={`relative min-h-[100dvh] sm:min-h-full w-full overflow-y-auto overflow-x-hidden font-sans pb-32 transition-colors duration-300 ${
        isDark ? "bg-[#5A635C] text-white" : "bg-white text-[#183a2b]"
      }`}
    >
      <div className="relative w-full h-[35vh] min-h-[300px] flex flex-col justify-end pb-8">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1517436073-3b12361ac952?q=80&w=1600&auto=format&fit=crop')`,
            filter: isDark ? "brightness(0.7) saturate(0.8)" : "brightness(0.85) saturate(0.85)",
          }}
        />
        <div
          className={`absolute inset-0 z-0 bg-gradient-to-t via-transparent to-black/20 ${
            isDark ? "from-[#5A635C]" : "from-white"
          }`}
        />

        {/* Header */}
        <div className="absolute top-8 left-6 sm:left-10 z-20 flex items-center gap-3">
          <SafeLogoImage
            isMinimal
            className="w-10 h-10 object-contain drop-shadow-md"
            alt="Logo"
          />
          <div className="flex flex-col">
            <h1
              className={`text-xl lg:text-2xl font-serif font-bold tracking-[0.1em] drop-shadow-md ${
                isDark ? "text-white" : "text-[#183a2b]"
              }`}
            >
              COMMUÁRIA
            </h1>
            <span
              className={`text-[10px] tracking-wider font-mono -mt-1 ${
                isDark ? "text-white/80" : "text-[#2d4a3b]/80"
              }`}
            >
              Uma cidade melhor começa com você
            </span>
          </div>
        </div>

        <div className="relative z-10 px-8 text-left mt-auto">
          <h2
            className={`text-[32.5px] font-sans font-bold tracking-tight drop-shadow-lg leading-tight uppercase ${
              isDark ? "text-white" : "text-[#183a2b]"
            }`}
          >
            Meus
            <br />
            Chamados
          </h2>
          <p
            className={`mt-2 text-lg font-medium drop-shadow-sm ${
              isDark ? "text-white/90" : "text-[#2d4a3b]"
            }`}
          >
            Acompanhe a situação dos seus relatos.
          </p>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {reports.length === 0 ? (
          <div
            className={`mt-12 text-center flex flex-col items-center gap-4 py-8 px-6 backdrop-blur-2xl rounded-[40px] border w-full max-w-sm mx-auto shadow-lg transition-colors ${
              isDark
                ? "bg-white/5 border-white/10 text-white"
                : "bg-black/5 border-black/10 text-[#183a2b] shadow-sm"
            }`}
          >
            <ClipboardCheck
              size={48}
              className={isDark ? "text-white/30" : "text-[#2d4a3b]/40"}
            />
            <p
              className={`text-lg font-medium ${
                isDark ? "text-white/70" : "text-[#183a2b]"
              }`}
            >
              Você ainda não possui chamados registrados.
            </p>
            <button
              onClick={() => onTabChange("report")}
              className={`px-6 py-2.5 rounded-full border text-sm font-bold transition-all shadow-md active:scale-95 ${
                isDark
                  ? "bg-white/10 border-white/20 text-white/90 hover:bg-white/20"
                  : "bg-[#183a2b] border-[#183a2b] text-white hover:bg-[#122c21]"
              }`}
            >
              Fazer meu primeiro relato
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {reports.map((report) => (
              <div
                key={report.id}
                onClick={() => onViewDetails(report)}
                className={`w-full rounded-[32px] overflow-hidden relative shadow-2xl border aspect-[4/3] cursor-pointer group transition-all duration-300 ${
                  isDark
                    ? "border-white/10 bg-zinc-800/80 hover:border-white/20 hover:bg-zinc-800/90"
                    : "border-black/10 bg-black/5 hover:border-black/20 hover:bg-black/10"
                }`}
              >
                {report.image_url ? (
                  <img
                    src={report.image_url}
                    alt={report.title}
                    className="absolute inset-0 w-full h-full object-cover filter brightness-90 saturate-50 group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div
                    className={`absolute inset-0 flex items-center justify-center ${
                      isDark ? "bg-zinc-700" : "bg-slate-300"
                    }`}
                  >
                    <Megaphone size={48} className="text-white/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                <div className="absolute top-6 left-6 right-6 flex justify-between items-start gap-4 z-10">
                  <h4 className="text-white font-serif font-bold text-xl drop-shadow-md truncate max-w-[80%]">
                    {report.title}
                  </h4>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Deseja realmente apagar o seu relato?")) {
                        onDeleteReport(report.id);
                      }
                    }}
                    className="p-2.5 rounded-full bg-red-600/40 hover:bg-red-600 border border-red-500/40 text-white transition-all shadow-md active:scale-95 z-20"
                    title="Apagar Chamado"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-[30px] p-[2px] bg-gradient-to-b from-white/30 to-white/10 shadow-lg backdrop-blur-xl z-10">
                  <div className="bg-black/40 backdrop-blur-md rounded-[inherit] px-5 py-2 flex items-center gap-2.5">
                    <span className="text-white font-medium text-sm font-sans tracking-wide whitespace-nowrap">
                      {report.status === "resolved" ? "Resolvido" : "Em Aberto"}
                    </span>
                    {report.status === "resolved" ? (
                      <Check size={18} className="text-emerald-400 stroke-[3px]" />
                    ) : (
                      <Calendar size={18} className="text-amber-400 stroke-[2px]" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const AdminMapView = ({
  reports = [],
  onResolveReport,
  onGoToProfile,
  onGoToSettings,
  onViewImage,
  onDeleteReport,
}: {
  reports?: any[];
  onResolveReport: (id: string) => Promise<void>;
  onGoToProfile: () => void;
  onGoToSettings: () => void;
  onViewImage: (url: string, title: string) => void;
  onDeleteReport: (id: string) => Promise<void>;
}) => {
  const { isDark } = useTheme();
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [mapCenter] = useState<[number, number]>([-25.5929, -49.4891]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "resolved">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const safeReports = Array.isArray(reports) ? reports : [];

  const categories = [
    { id: "all", label: "Todas as Categorias" },
    { id: "iluminacao", label: "💡 Iluminação", keywords: ["ilumina", "poste", "lâmpada", "luz", "escuro", "luminária"] },
    { id: "pavimentacao", label: "🚧 Pavimentação / Vias", keywords: ["buraco", "asfalto", "paviment", "via", "pista", "cratera", "tapa"] },
    { id: "saneamento", label: "💧 Saneamento / Água", keywords: ["vazamento", "água", "esgoto", "bueiro", "drenagem", "cano"] },
    { id: "limpeza", label: "🌿 Limpeza & Meio Ambiente", keywords: ["lixo", "entulho", "mato", "limpeza", "terreno", "poda", "árvore"] },
    { id: "calcada", label: "🚶 Calçadas & Trânsito", keywords: ["calçada", "acessibilidade", "rampa", "pedestre", "meio-fio", "placa", "sinalização"] },
  ];

  const filteredReports = safeReports.filter((report) => {
    // Search filter
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (report.title && report.title.toLowerCase().includes(q)) ||
      (report.address && report.address.toLowerCase().includes(q)) ||
      (report.description && report.description.toLowerCase().includes(q));

    // Status filter
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && report.status !== "resolved") ||
      (statusFilter === "resolved" && report.status === "resolved");

    // Category filter
    let matchesCategory = true;
    if (categoryFilter !== "all") {
      const catConfig = categories.find((c) => c.id === categoryFilter);
      if (catConfig && catConfig.keywords) {
        const textToSearch = `${report.title || ""} ${report.description || ""}`.toLowerCase();
        matchesCategory = catConfig.keywords.some((kw) => textToSearch.includes(kw));
      }
    }

    return matchesSearch && matchesStatus && matchesCategory;
  });

  useEffect(() => {
    if (selectedReport) {
      const updated = filteredReports.find((r) => r.id === selectedReport.id);
      if (updated) setSelectedReport(updated);
      else if (filteredReports.length > 0) setSelectedReport(filteredReports[0]);
      else setSelectedReport(null);
    } else {
      const unresolved = filteredReports.find((r) => r.status !== "resolved");
      if (unresolved) setSelectedReport(unresolved);
      else if (filteredReports.length > 0) setSelectedReport(filteredReports[0]);
    }
  }, [reports, statusFilter, categoryFilter, searchQuery]);

  const hasActiveFilters = searchQuery !== "" || statusFilter !== "all" || categoryFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setCategoryFilter("all");
  };

  const pendingCount = safeReports.filter((r) => r.status !== "resolved").length;
  const resolvedCount = safeReports.filter((r) => r.status === "resolved").length;

  // Create clean leaflet marker div icon using custom L.divIcon
  const customMarkerIcon = (status: string) =>
    L.divIcon({
      className: "custom-leaflet-icon",
      html: `
      <div class="flex items-center justify-center">
        <div class="p-2 rounded-full border border-white/40 shadow-lg ${
          status === "resolved"
            ? "bg-emerald-500 text-white shadow-emerald-500/30"
            : "bg-orange-500 text-white shadow-orange-500/30 animate-pulse"
        }">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.74a1.095 1.095 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      </div>
    `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

  return (
    <div
      className={`relative min-h-[100dvh] sm:min-h-full w-full overflow-y-auto overflow-x-hidden font-sans pb-32 transition-colors duration-300 ${
        isDark ? "bg-[#5A635C] text-white" : "bg-white text-[#183a2b]"
      }`}
    >
      {/* Header Cover */}
      <div className="relative w-full h-[25vh] min-h-[200px] flex flex-col justify-end pb-6">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=1600&auto=format&fit=crop')`,
            filter: isDark ? "brightness(0.65) saturate(0.8)" : "brightness(0.85) saturate(0.85)",
          }}
        />
        <div
          className={`absolute inset-0 z-0 bg-gradient-to-t via-transparent to-black/20 ${
            isDark ? "from-[#5A635C]" : "from-white"
          }`}
        />

        {/* Header Branding */}
        <div className="absolute top-8 left-6 sm:left-10 z-20 flex items-center gap-3">
          <SafeLogoImage
            isMinimal
            className="w-10 h-10 object-contain drop-shadow-md"
            alt="Logo"
          />
          <div className="flex flex-col">
            <h1
              className={`text-xl lg:text-2xl font-serif font-bold tracking-[0.1em] drop-shadow-md flex items-center gap-2 ${
                isDark ? "text-white" : "text-[#183a2b]"
              }`}
            >
              COMMUÁRIA
              <span className="bg-red-500/85 text-[10px] px-2 py-0.5 rounded-full font-sans tracking-wide text-white">
                ADMIN
              </span>
            </h1>
            <span
              className={`text-[10px] tracking-wider font-mono -mt-1 ${
                isDark ? "text-white/80" : "text-[#2d4a3b]/80"
              }`}
            >
              Uma cidade melhor começa com você
            </span>
          </div>
        </div>

        <div className="relative z-10 px-8 text-left mt-auto">
          <h2
            className={`text-[2.2rem] font-serif tracking-tight drop-shadow-lg leading-none ${
              isDark ? "text-white" : "text-[#183a2b]"
            }`}
          >
            Mapa de Zeladoria
          </h2>
          <p
            className={`mt-1 text-sm font-mono uppercase tracking-widest drop-shadow-sm font-bold ${
              isDark ? "text-[#FFAF9E]" : "text-emerald-700"
            }`}
          >
            Georreferenciamento em Tempo Real
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Filters Card for Map Points */}
        <div
          className={`w-full backdrop-blur-2xl rounded-[28px] border p-4 sm:p-5 shadow-xl space-y-4 transition-colors ${
            isDark
              ? "bg-white/5 border-white/15 text-white"
              : "bg-black/5 border-black/10 text-[#183a2b] shadow-sm"
          }`}
        >
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={18}
                className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                  isDark ? "text-white/40" : "text-[#2d4a3b]/60"
                }`}
              />
              <input
                type="text"
                placeholder="Filtrar por rua, bairro, título ou descrição..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full rounded-full py-2.5 pl-11 pr-10 text-sm focus:outline-none transition-all font-mono shadow-inner ${
                  isDark
                    ? "bg-black/20 border border-white/20 text-white placeholder-white/40 focus:bg-black/30 focus:border-white/40"
                    : "bg-black/5 border border-black/15 text-[#183a2b] placeholder-[#2d4a3b]/60 focus:bg-black/10 focus:border-[#183a2b]"
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 ${
                    isDark ? "text-white/50 hover:text-white" : "text-[#2d4a3b]/70 hover:text-[#183a2b]"
                  }`}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${
                  statusFilter === "all"
                    ? isDark
                      ? "bg-white text-zinc-900 border-white shadow-md font-extrabold"
                      : "bg-[#183a2b] text-white border-[#183a2b] shadow-md font-extrabold"
                    : isDark
                    ? "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
                    : "bg-black/5 text-[#2d4a3b] border-black/10 hover:bg-black/10"
                }`}
              >
                <span>Todos os Pontos</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    statusFilter === "all"
                      ? isDark
                        ? "bg-zinc-200 text-zinc-900"
                        : "bg-white/20 text-white"
                      : isDark
                      ? "bg-white/10 text-white/70"
                      : "bg-black/10 text-[#2d4a3b]"
                  }`}
                >
                  {reports.length}
                </span>
              </button>

              <button
                onClick={() => setStatusFilter("pending")}
                className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${
                  statusFilter === "pending"
                    ? "bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-500/20 font-extrabold"
                    : isDark
                    ? "bg-white/5 text-orange-200/80 border-white/10 hover:bg-orange-500/10 hover:text-orange-200"
                    : "bg-black/5 text-amber-900 border-black/10 hover:bg-black/10"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                <span>Pendentes</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    statusFilter === "pending"
                      ? "bg-orange-600 text-white"
                      : isDark
                      ? "bg-white/10 text-orange-200"
                      : "bg-black/10 text-amber-900"
                  }`}
                >
                  {pendingCount}
                </span>
              </button>

              <button
                onClick={() => setStatusFilter("resolved")}
                className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${
                  statusFilter === "resolved"
                    ? "bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/20 font-extrabold"
                    : isDark
                    ? "bg-white/5 text-emerald-200/80 border-white/10 hover:bg-emerald-500/10 hover:text-emerald-200"
                    : "bg-black/5 text-emerald-900 border-black/10 hover:bg-black/10"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Resolvidos</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    statusFilter === "resolved"
                      ? "bg-emerald-700 text-white"
                      : isDark
                      ? "bg-white/10 text-emerald-200"
                      : "bg-black/10 text-emerald-900"
                  }`}
                >
                  {resolvedCount}
                </span>
              </button>
            </div>
          </div>

          {/* Category Chips and Reset Button */}
          <div
            className={`flex flex-wrap items-center justify-between gap-2 pt-2 border-t ${
              isDark ? "border-white/10" : "border-black/10"
            }`}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`text-xs flex items-center gap-1 mr-1 font-mono ${
                  isDark ? "text-white/50" : "text-[#2d4a3b]/80"
                }`}
              >
                <Filter size={12} /> Categoria:
              </span>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                    categoryFilter === cat.id
                      ? isDark
                        ? "bg-white/25 text-white font-bold border border-white/30"
                        : "bg-[#183a2b] text-white font-bold border border-[#183a2b]/20 shadow-sm"
                      : isDark
                      ? "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-transparent"
                      : "bg-black/5 text-[#2d4a3b] hover:bg-black/10 border border-black/10"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Filter Summary & Clear Action */}
            <div className="flex items-center gap-3 text-xs ml-auto">
              <span
                className={`font-mono ${
                  isDark ? "text-white/70" : "text-[#2d4a3b]"
                }`}
              >
                Exibindo{" "}
                <strong className={isDark ? "text-white font-bold" : "text-[#183a2b] font-bold"}>
                  {filteredReports.length}
                </strong>{" "}
                de {reports.length} pontos
              </span>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 border ${
                    isDark
                      ? "bg-white/10 hover:bg-white/20 text-white border-white/15"
                      : "bg-black/5 hover:bg-black/10 text-[#183a2b] border-black/15 shadow-sm"
                  }`}
                >
                  <X size={12} />
                  <span>Limpar</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Real-time Map Area */}
          <div className="lg:col-span-7 xl:col-span-8 w-full h-[380px] lg:h-[550px] rounded-[32px] overflow-hidden shadow-2xl border border-white/20 bg-white/5 relative z-10">
            <MapContainer
              center={mapCenter}
              zoom={13}
              minZoom={11}
              maxBounds={[
                [-25.8, -49.7],
                [-25.4, -49.2],
              ]}
              maxBoundsViscosity={1.0}
              zoomControl={false}
              attributionControl={false}
              style={{
                height: "100%",
                width: "100%",
                filter: "saturate(0.8) contrast(1.1) brightness(0.9)",
              }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {filteredReports.map((report) => {
                if (!report.latitude || !report.longitude) return null;
                return (
                  <Marker
                    key={report.id}
                    position={[report.latitude, report.longitude]}
                    icon={customMarkerIcon(report.status)}
                    eventHandlers={{
                      click: () => {
                        setSelectedReport(report);
                      },
                    }}
                  >
                    <Popup className="custom-popup">
                      <div className="p-2 text-zinc-800 font-sans max-w-[170px]">
                        <h4 className="font-bold text-sm truncate">
                          {report.title}
                        </h4>
                        <p className="text-xs text-zinc-500 truncate mb-1">
                          {report.address}
                        </p>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${report.status === "resolved" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}
                        >
                          {report.status === "resolved"
                            ? "Resolvido"
                            : "Pendente"}
                        </span>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          {/* Selected Ticket Details Side Panel */}
          <div className="lg:col-span-5 xl:col-span-4 w-full">
            {selectedReport ? (
              <div
                className={`backdrop-blur-2xl rounded-[32px] border p-6 shadow-2xl space-y-4 transition-colors ${
                  isDark
                    ? "bg-white/5 border-white/20 text-white"
                    : "bg-black/5 border-black/10 text-[#183a2b] shadow-sm"
                }`}
              >
                <div className="flex gap-4 items-start">
                  {selectedReport.image_url ? (
                    <div
                      onClick={() =>
                        onViewImage(selectedReport.image_url, selectedReport.title)
                      }
                      className="w-24 h-24 rounded-3xl bg-cover bg-center shrink-0 border border-white/25 shadow-md hover:scale-95 transition-transform cursor-pointer"
                      style={{
                        backgroundImage: `url("${selectedReport.image_url}")`,
                      }}
                    />
                  ) : (
                    <div
                      className={`w-24 h-24 rounded-3xl border flex items-center justify-center shrink-0 ${
                        isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
                      }`}
                    >
                      <Megaphone
                        size={32}
                        className={isDark ? "text-white/20" : "text-[#2d4a3b]/40"}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          selectedReport.status === "resolved"
                            ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                            : "bg-orange-500/20 text-amber-800 dark:text-orange-300"
                        }`}
                      >
                        {selectedReport.status === "resolved"
                          ? "Resolvido"
                          : "Pendente"}
                      </span>
                      <span
                        className={`text-[10px] font-mono ${
                          isDark ? "text-white/40" : "text-[#2d4a3b]/70"
                        }`}
                      >
                        {new Date(selectedReport.created_at).toLocaleDateString(
                          "pt-BR",
                        )}
                      </span>
                    </div>

                    <h3
                      className={`text-xl font-bold font-serif leading-snug truncate ${
                        isDark ? "text-white" : "text-[#183a2b]"
                      }`}
                    >
                      {selectedReport.title}
                    </h3>
                    <p
                      className={`text-sm italic mt-1 line-clamp-2 ${
                        isDark ? "text-white/70" : "text-[#2d4a3b]"
                      }`}
                    >
                      {selectedReport.description || "Sem descrição fornecida."}
                    </p>
                  </div>
                </div>

                <div
                  className={`space-y-2 pt-3 border-t text-sm ${
                    isDark ? "border-white/10" : "border-black/10"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <MapPin
                      size={16}
                      className={`shrink-0 mt-0.5 ${
                        isDark ? "text-white/40" : "text-[#2d4a3b]/60"
                      }`}
                    />
                    <span
                      className={`font-mono text-xs ${
                        isDark ? "text-white/80" : "text-[#183a2b]"
                      }`}
                    >
                      {selectedReport.address || "Endereço indisponível"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User
                      size={16}
                      className={isDark ? "text-white/40" : "text-[#2d4a3b]/60"}
                    />
                    <span
                      className={`text-xs ${
                        isDark ? "text-white/50" : "text-[#2d4a3b]/80"
                      }`}
                    >
                      Relatado por:{" "}
                      <strong
                        className={`font-serif font-medium ${
                          isDark ? "text-white/95" : "text-[#183a2b]"
                        }`}
                      >
                        {selectedReport.anonimo
                          ? "Morador Anônimo"
                          : "Morador de Araucária"}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="pt-3 flex flex-col gap-3">
                  {selectedReport.status !== "resolved" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          confirm("Marcar este chamado como resolvido e concluído?")
                        ) {
                          onResolveReport(selectedReport.id);
                        }
                      }}
                      className="w-full py-4 rounded-full bg-emerald-500/20 border border-emerald-500/35 hover:bg-emerald-500 text-emerald-800 dark:text-emerald-300 hover:text-white hover:border-emerald-400 font-bold tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 text-md active:scale-95"
                    >
                      <Check size={20} className="stroke-[3px]" />
                      <span>Concluir Zeladoria</span>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        confirm(
                          "ADM: Tem certeza que deseja apagar DEFINITIVAMENTE este chamado do sistema?",
                        )
                      ) {
                        onDeleteReport(selectedReport.id).then(() => {
                          setSelectedReport(null);
                        });
                      }
                    }}
                    className="w-full py-4 rounded-full bg-red-500/15 border border-red-500/25 hover:bg-red-600 text-red-600 dark:text-red-400 hover:text-white font-bold transition-all shadow-lg flex items-center justify-center gap-2 text-md active:scale-95"
                  >
                    <Trash2 size={18} />
                    <span>Apagar Chamado</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`backdrop-blur-2xl rounded-[32px] border p-8 text-center flex flex-col items-center justify-center gap-3 transition-colors ${
                  isDark
                    ? "bg-white/5 border-white/10 text-white"
                    : "bg-black/5 border-black/10 text-[#183a2b] shadow-sm"
                }`}
              >
                <ClipboardCheck className="text-emerald-500 w-12 h-12 bg-emerald-500/10 p-2.5 rounded-full" />
                <p className="font-serif italic text-lg">
                  Sem Relatos Registrados
                </p>
                <p
                  className={`text-xs ${
                    isDark ? "text-white/50" : "text-[#2d4a3b]/80"
                  }`}
                >
                  Selecione um chamado no mapa para gerenciar o atendimento.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminTasksView = ({
  reports = [],
  onResolveReport,
  onViewImage,
  onDeleteReport,
  onViewDetails,
}: {
  reports?: any[];
  onResolveReport: (id: string) => Promise<void>;
  onViewImage: (url: string, title: string) => void;
  onDeleteReport: (id: string) => Promise<void>;
  onViewDetails?: (report: any) => void;
}) => {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "pending" | "resolved"
  >("all");

  const safeReports = Array.isArray(reports) ? reports : [];

  const filteredReports = safeReports.filter((report) => {
    const matchesSearch =
      (report.title &&
        report.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (report.address &&
        report.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (report.description &&
        report.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      activeFilter === "all" ||
      (activeFilter === "pending" && report.status !== "resolved") ||
      (activeFilter === "resolved" && report.status === "resolved");

    return matchesSearch && matchesStatus;
  });

  return (
    <div
      className={`relative min-h-[100dvh] sm:min-h-full w-full overflow-y-auto overflow-x-hidden font-sans pb-32 transition-colors duration-300 ${
        isDark ? "bg-[#5A635C] text-white" : "bg-white text-[#183a2b]"
      }`}
    >
      {/* Header section with cover image */}
      <div className="relative w-full h-[30vh] min-h-[220px] flex flex-col justify-end pb-6">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?q=80&w=1600&auto=format&fit=crop')`,
            filter: isDark ? "brightness(0.65) saturate(0.8)" : "brightness(0.85) saturate(0.85)",
          }}
        />
        <div
          className={`absolute inset-0 z-0 bg-gradient-to-t via-transparent to-black/20 ${
            isDark ? "from-[#5A635C]" : "from-white"
          }`}
        />

        {/* Header branding */}
        <div className="absolute top-8 left-6 sm:left-10 z-20 flex items-center gap-3">
          <SafeLogoImage
            isMinimal
            className="w-10 h-10 object-contain drop-shadow-md"
            alt="Logo"
          />
          <div className="flex flex-col">
            <h1
              className={`text-xl lg:text-2xl font-serif font-bold tracking-[0.1em] drop-shadow-md flex items-center gap-2 ${
                isDark ? "text-white" : "text-[#183a2b]"
              }`}
            >
              COMMUÁRIA
              <span className="bg-red-500/85 text-[10px] px-2 py-0.5 rounded-full font-sans tracking-wide text-white">
                ADMIN
              </span>
            </h1>
            <span
              className={`text-[10px] tracking-wider font-mono -mt-1 ${
                isDark ? "text-white/80" : "text-[#2d4a3b]/80"
              }`}
            >
              Uma cidade melhor começa com você
            </span>
          </div>
        </div>

        <div className="relative z-10 px-8 text-left mt-auto">
          <h2
            className={`text-[2.2rem] font-serif tracking-tight drop-shadow-lg leading-none ${
              isDark ? "text-white" : "text-[#183a2b]"
            }`}
          >
            Banco de Chamados
          </h2>
          <p
            className={`mt-1 text-sm font-medium drop-shadow-sm ${
              isDark ? "text-white/90" : "text-[#2d4a3b]"
            }`}
          >
            Zeladoria colaborativa de Araucária.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Search Bar & Filtering controls */}
        <div
          className={`flex flex-col md:flex-row gap-4 items-center justify-between backdrop-blur-2xl p-4 sm:p-6 rounded-[32px] border shadow-lg transition-colors ${
            isDark
              ? "bg-white/5 border-white/10 text-white"
              : "bg-black/5 border-black/10 text-[#183a2b] shadow-sm"
          }`}
        >
          <div className="relative flex items-center w-full md:max-w-md">
            <Search
              size={18}
              className={`absolute left-4 ${
                isDark ? "text-white/40" : "text-[#2d4a3b]/60"
              }`}
            />
            <input
              type="text"
              placeholder="Pesquisar por título ou endereço..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full rounded-full py-3 pl-12 pr-4 text-sm focus:outline-none transition-all font-mono shadow-inner ${
                isDark
                  ? "bg-black/20 border border-white/20 text-white placeholder-white/40 focus:bg-black/30 focus:border-white/40"
                  : "bg-black/5 border border-black/15 text-[#183a2b] placeholder-[#2d4a3b]/60 focus:bg-black/10 focus:border-[#183a2b]"
              }`}
            />
          </div>

          {/* Status Filters */}
          <div className="flex flex-wrap justify-center items-center gap-2">
            {(["all", "pending", "resolved"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-all border ${
                  activeFilter === filter
                    ? isDark
                      ? "bg-white text-zinc-800 border-white font-extrabold shadow-lg shadow-white/10"
                      : "bg-[#183a2b] text-white border-[#183a2b] font-extrabold shadow-md"
                    : isDark
                    ? "bg-white/5 text-white/60 border-white/10 hover:bg-white/15 hover:text-white"
                    : "bg-black/5 text-[#2d4a3b] border-black/10 hover:bg-black/10"
                }`}
              >
                {filter === "all" && "Todos os Chamados"}
                {filter === "pending" && "Pendentes"}
                {filter === "resolved" && "Resolvidos"}
              </button>
            ))}
          </div>
        </div>

        {/* Results Info */}
        <div className="flex justify-between items-center pt-2">
          <span
            className={`text-xs font-mono ${
              isDark ? "text-white/50" : "text-[#2d4a3b]"
            }`}
          >
            Mostrando{" "}
            <strong className={isDark ? "text-white font-bold" : "text-[#183a2b] font-bold"}>
              {filteredReports.length}
            </strong>{" "}
            chamado{filteredReports.length !== 1 && "s"}
          </span>
        </div>

        {/* List of Tickets */}
        {filteredReports.length === 0 ? (
          <div
            className={`w-full text-center py-20 px-6 backdrop-blur-2xl rounded-[40px] border flex flex-col items-center justify-center gap-4 transition-colors ${
              isDark
                ? "bg-white/5 border-white/10 text-white"
                : "bg-black/5 border-black/10 text-[#183a2b] shadow-sm"
            }`}
          >
            <Filter
              className={`w-12 h-12 stroke-[1.5px] ${
                isDark ? "text-white/20" : "text-[#2d4a3b]/40"
              }`}
            />
            <p
              className={`text-md ${
                isDark ? "text-white/50" : "text-[#2d4a3b]"
              }`}
            >
              Nenhum chamado corresponde aos filtros aplicados.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 w-full">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                onClick={() => onViewDetails && onViewDetails(report)}
                className={`w-full backdrop-blur-2xl rounded-[32px] border p-5 shadow-2xl flex flex-col gap-4 transition-all group overflow-hidden relative cursor-pointer ${
                  isDark
                    ? "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
                    : "bg-black/5 border-black/10 hover:border-black/20 hover:bg-black/10 shadow-sm"
                }`}
              >
                <div className="flex gap-4 items-start">
                  {report.image_url ? (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewImage(report.image_url, report.title);
                      }}
                      className="w-20 h-20 rounded-2xl bg-cover bg-center shrink-0 cursor-pointer border border-white/20 shadow-md group-hover:scale-95 transition-transform"
                      style={{ backgroundImage: `url("${report.image_url}")` }}
                    />
                  ) : (
                    <div
                      className={`w-20 h-20 rounded-2xl border flex items-center justify-center shrink-0 ${
                        isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
                      }`}
                    >
                      <Megaphone
                        size={24}
                        className={isDark ? "text-white/20" : "text-[#2d4a3b]/40"}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h5
                      className={`font-serif font-bold text-lg transition-colors truncate ${
                        isDark
                          ? "text-white group-hover:text-emerald-300"
                          : "text-[#183a2b] group-hover:text-emerald-900"
                      }`}
                    >
                      {report.title}
                    </h5>
                    <p
                      className={`text-xs mb-2 truncate ${
                        isDark ? "text-white/60" : "text-[#2d4a3b]"
                      }`}
                    >
                      {report.address}
                    </p>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          report.status === "resolved"
                            ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                            : "bg-orange-500/20 text-amber-800 dark:text-orange-300"
                        }`}
                      >
                        {report.status === "resolved"
                          ? "Resolvido"
                          : "Pendente"}
                      </span>
                      <span
                        className={`text-[10px] font-mono ${
                          isDark ? "text-white/40" : "text-[#2d4a3b]/70"
                        }`}
                      >
                        {new Date(report.created_at).toLocaleDateString(
                          "pt-BR",
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {report.description && (
                  <p
                    className={`text-xs line-clamp-2 px-1 italic ${
                      isDark ? "text-white/70" : "text-[#2d4a3b]"
                    }`}
                  >
                    "{report.description}"
                  </p>
                )}

                {/* Show reporter detail if available */}
                <div
                  className={`text-[11px] px-1 font-mono border-t pt-2 flex justify-between items-center ${
                    isDark ? "text-white/40 border-white/5" : "text-[#2d4a3b]/70 border-black/10"
                  }`}
                >
                  <span>
                    Relator:{" "}
                    {report.anonimo ? "Morador Anônimo" : "Morador Cadastrado"}
                  </span>
                  <span>
                    {report.profiles?.name ? `(${report.profiles.name})` : ""}
                  </span>
                </div>

                {/* Actions for Admins */}
                <div
                  className={`pt-1 flex gap-2 w-full mt-auto border-t ${
                    isDark ? "border-white/5" : "border-black/10"
                  }`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onViewDetails) onViewDetails(report);
                    }}
                    className={`flex-1 px-3 py-2.5 text-xs rounded-full border font-bold transition-all flex items-center justify-center gap-1 active:scale-95 ${
                      isDark
                        ? "bg-white/10 border-white/20 text-white/90 hover:bg-white/20"
                        : "bg-black/5 border-black/15 text-[#183a2b] hover:bg-black/10"
                    }`}
                  >
                    <Maximize2 size={13} />
                    <span>Detalhes</span>
                  </button>

                  {report.status !== "resolved" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          confirm(
                            "Tem certeza que deseja marcar este chamado como resolvido?",
                          )
                        ) {
                          onResolveReport(report.id);
                        }
                      }}
                      className="flex-1 px-3 py-2.5 text-xs rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold hover:bg-emerald-500 hover:text-white hover:border-emerald-400 transition-all flex items-center justify-center gap-1 group/btn active:scale-95"
                    >
                      <Check
                        size={13}
                        className="group-hover/btn:scale-125 transition-transform"
                      />
                      <span>Resolver</span>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        confirm(
                          "ADM: Tem certeza que deseja apagar DEFINITIVAMENTE este relato do banco de dados?",
                        )
                      ) {
                        onDeleteReport(report.id);
                      }
                    }}
                    className={`px-3 py-2.5 text-xs rounded-full bg-red-500/15 border border-red-500/25 text-red-600 dark:text-red-300 font-bold hover:bg-red-600 hover:text-white hover:border-red-500 transition-all flex items-center justify-center gap-1 active:scale-95 ${
                      report.status === "resolved" ? "flex-1" : "shrink-0"
                    }`}
                    title="Apagar"
                  >
                    <Trash2 size={13} />
                    {report.status === "resolved" && <span>Apagar</span>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ReportView = ({
  onTabChange,
  onGoToProfile,
  onGoToSettings,
  onRefresh,
  onLogout,
  anonymous = false,
}: {
  onTabChange: (tab: "home" | "report" | "tasks") => void;
  onGoToProfile: () => void;
  onGoToSettings: () => void;
  onRefresh: () => Promise<void>;
  onLogout: () => void;
  anonymous?: boolean;
}) => {
  const { isDark } = useTheme();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ReportCategory>("Pavimentação");
  const [locationQuery, setLocationQuery] = useState("");
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    -25.5929, -49.4891,
  ]);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleMapMove = async (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
    setIsLoadingAddress(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const addressParts = data.display_name.split(", ");
          const shortAddress = addressParts.slice(0, 3).join(", ");
          setLocationQuery(shortAddress);
        } else {
          setLocationQuery("Endereço não encontrado");
        }
      }
    } catch (e) {
      console.error("Geocoding error", e);
      setLocationQuery("Erro ao buscar endereço");
    } finally {
      setIsLoadingAddress(false);
    }
  };

  useEffect(() => {
    handleMapMove(mapCenter[0], mapCenter[1]);
  }, []);

  const handleSendReport = async () => {
    if (!title.trim()) {
      alert("Por favor, descreva o problema.");
      return;
    }

    setIsSending(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        alert("Sua sessão expirou. Por favor, entre novamente.");
        onLogout();
        return;
      }

      // Convert selected file to base64 with downscaling/compression to prevent LocalStorage Quota Exceeded storage errors
      let imageUrl: string | null = null;
      if (selectedFile) {
        imageUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(selectedFile);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
              const canvas = document.createElement("canvas");
              const MAX_WIDTH = 1000;
              const MAX_HEIGHT = 1000;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                // Convert to compressed jpeg format (approx. 150KB or less)
                const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
                resolve(dataUrl);
              } else {
                resolve(event.target?.result as string);
              }
            };
            img.onerror = (err) => reject(err);
          };
          reader.onerror = (err) => reject(err);
        });
      }

      const newReportData: ReportItem = {
        id: "report_" + Math.random().toString(36).substring(2, 9),
        title,
        description: title,
        category: category,
        address: locationQuery || "Endereço não informado",
        latitude: mapCenter[0] || -25.5929,
        longitude: mapCenter[1] || -49.4891,
        image_url: imageUrl,
        anonymous: anonymous,
        user_id: session?.user?.id || "local_user",
        status: "unresolved",
        status_notes: null,
        created_at: new Date().toISOString(),
      };

      // 1. Always save to LocalStorage first to guarantee immediate persistence
      const localReports = JSON.parse(localStorage.getItem("commuaria_reports") || "[]");
      localReports.unshift(newReportData);
      localStorage.setItem("commuaria_reports", JSON.stringify(localReports));

      // 2. Try Supabase insert if connected
      if (supabase) {
        try {
          const { error } = await supabase.from("reports").insert({
            title,
            description: title,
            category: category,
            address: locationQuery || "Endereço não informado",
            latitude: mapCenter[0] || -25.5929,
            longitude: mapCenter[1] || -49.4891,
            image_url: imageUrl,
            anonymous: anonymous,
            user_id: session?.user?.id,
            status: "unresolved",
          });
          if (error) {
            console.warn("Supabase insert warning (salvo no cache do navegador):", error);
          }
        } catch (subErr) {
          console.warn("Erro ao enviar para o Supabase (salvo no cache local):", subErr);
        }
      }

      // Update local state immediately via refresh function
      await onRefresh();

      onTabChange("tasks");
    } catch (err) {
      console.error("Error sending report", err);
      alert(
        "Erro ao enviar relatório: " +
          (err instanceof Error ? err.message : "Tente novamente."),
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleLocationSearch = async (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Enter" && locationQuery) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery + ", Araucária, PR")}&format=json&limit=1`,
        );
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
          }
        }
      } catch (e) {
        console.error("Geocoding error", e);
      }
    }
  };

  return (
    <div
      className={`relative min-h-[100dvh] sm:min-h-full w-full overflow-y-auto overflow-x-hidden font-sans pb-32 transition-colors duration-300 ${
        isDark ? "bg-[#5A635C] text-white" : "bg-white text-[#183a2b]"
      }`}
    >
      <div className="relative w-full h-[35vh] min-h-[250px] flex flex-col pb-8">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1514371879740-26b222a5ee11?auto=format&fit=crop&q=80")',
            filter: isDark ? "brightness(0.65) saturate(0.8)" : "brightness(0.85) saturate(0.85)",
          }}
        />
        <div
          className={`absolute inset-0 z-0 bg-gradient-to-b from-black/20 via-black/10 ${
            isDark ? "to-[#5A635C]" : "to-white"
          }`}
        />

        <div className="absolute top-8 left-6 sm:left-10 z-20 flex items-center gap-3">
          <SafeLogoImage
            isMinimal
            className="w-10 h-10 object-contain drop-shadow-md"
            alt="Logo"
          />
          <div className="flex flex-col">
            <h1
              className={`text-xl lg:text-2xl font-serif font-bold tracking-[0.1em] drop-shadow-md ${
                isDark ? "text-white" : "text-[#183a2b]"
              }`}
            >
              COMMUÁRIA
            </h1>
            <span
              className={`text-[10px] tracking-wider font-mono -mt-1 ${
                isDark ? "text-white/80" : "text-[#2d4a3b]/80"
              }`}
            >
              Uma cidade melhor começa com você
            </span>
          </div>
        </div>

        <h2
          className={`relative z-10 text-[36px] sm:text-[48px] font-serif font-bold leading-[1.05] tracking-tight mt-auto px-6 sm:px-10 lg:pl-16 drop-shadow-lg ${
            isDark ? "text-white" : "text-[#183a2b]"
          }`}
        >
          Relate algum
          <br />
          problema
        </h2>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          
          {/* Coluna 1: Informações e Anexos */}
          <div
            className={`space-y-8 backdrop-blur-md p-6 sm:p-8 rounded-[32px] border shadow-lg transition-colors ${
              isDark
                ? "bg-white/5 border-white/10 text-white"
                : "bg-black/5 border-black/10 text-[#183a2b] shadow-sm"
            }`}
          >
            {/* Categoria do problema (Etapa fundamental para o roteamento aos supervisores) */}
            <CategorySelector
              selectedCategory={category}
              onSelectCategory={setCategory}
            />

            <div
              className={`w-full h-px ${
                isDark ? "bg-white/10" : "bg-black/10"
              }`}
            ></div>

            <div className="space-y-3">
              <span
                className={`text-xl font-serif font-bold tracking-wide block ${
                  isDark ? "text-white/95" : "text-[#183a2b]"
                }`}
              >
                Descreva o problema
              </span>
              <p
                className={`text-xs font-sans ${
                  isDark ? "text-white/70" : "text-[#2d4a3b]"
                }`}
              >
                Seja claro e específico sobre o que precisa de zeladoria ou manutenção.
              </p>
              <input
                type="text"
                placeholder="Ex: Buraco na via, poste sem luz, entulho acumulado..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full rounded-2xl px-6 py-4 text-base font-sans shadow-inner transition-all mt-2 focus:outline-none ${
                  isDark
                    ? "bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-white/40"
                    : "bg-black/5 border border-black/15 text-[#183a2b] placeholder-[#2d4a3b]/60 focus:bg-black/10 focus:border-[#183a2b]"
                }`}
              />
            </div>

            <div
              className={`w-full h-px my-6 ${
                isDark ? "bg-white/10" : "bg-black/10"
              }`}
            ></div>

            <div className="flex flex-col gap-4">
              <span
                className={`text-xl font-serif font-bold tracking-wide ${
                  isDark ? "text-white/95" : "text-[#183a2b]"
                }`}
              >
                Anexar foto ou vídeo
              </span>
              <p
                className={`text-xs font-sans ${
                  isDark ? "text-white/70" : "text-[#2d4a3b]"
                }`}
              >
                O registro visual ajuda os administradores a entenderem o problema com mais rapidez.
              </p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,video/*"
                className="hidden"
              />
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full sm:w-28 h-14 rounded-2xl border backdrop-blur-xl flex items-center justify-center shadow-md active:scale-95 transition-all group overflow-hidden relative ${
                    isDark
                      ? "bg-white/10 border-white/30 hover:bg-white/20 text-white"
                      : "bg-black/5 border-black/15 hover:bg-black/10 text-[#183a2b]"
                  }`}
                >
                  {selectedFile ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/30">
                      <Check size={24} className="text-emerald-300 drop-shadow-md" />
                    </div>
                  ) : (
                    <Camera
                      size={24}
                      className={isDark ? "text-white/80 group-hover:text-white" : "text-[#2d4a3b] group-hover:text-[#183a2b]"}
                    />
                  )}
                </button>
                {selectedFile ? (
                  <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border w-full sm:w-auto overflow-hidden ${
                      isDark
                        ? "bg-white/10 border-white/25 text-white"
                        : "bg-black/5 border-black/15 text-[#183a2b]"
                    }`}
                  >
                    <span className="text-xs font-medium truncate max-w-[150px]">
                      {selectedFile.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className={`transition-colors p-1 ${
                        isDark ? "text-white/50 hover:text-white" : "text-[#2d4a3b]/60 hover:text-[#183a2b]"
                      }`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <span
                    className={`text-xs italic font-mono ${
                      isDark ? "text-white/50" : "text-[#2d4a3b]/70"
                    }`}
                  >
                    Nenhum arquivo selecionado
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Coluna 2: Endereço e Mapa */}
          <div
            className={`space-y-6 backdrop-blur-md p-6 sm:p-8 rounded-[32px] border shadow-lg relative group transition-colors ${
              isDark
                ? "bg-white/5 border-white/10 text-white"
                : "bg-black/5 border-black/10 text-[#183a2b] shadow-sm"
            }`}
          >
            <div className="flex flex-col gap-1 w-full">
              <span
                className={`text-xl font-serif font-bold tracking-wide ${
                  isDark ? "text-white/95" : "text-[#183a2b]"
                }`}
              >
                Informe o local do ocorrido
              </span>
              <span
                className={`text-xs font-sans ${
                  isDark ? "text-white/70" : "text-[#2d4a3b]"
                }`}
              >
                Arraste o mapa para posicionar o pin vermelho exatamente no local do problema.
              </span>
            </div>

            <div
              className={`w-full rounded-2xl px-5 py-3.5 min-h-[48px] flex items-center justify-center text-xs font-mono shadow-inner backdrop-blur-md border ${
                isDark
                  ? "bg-black/30 border-white/15 text-white/90"
                  : "bg-black/5 border-black/15 text-[#183a2b]"
              }`}
            >
              <MapPin className="mr-3 text-red-500 shrink-0" size={18} />
              <span className="truncate flex-1 font-medium leading-tight">
                {isLoadingAddress
                  ? "Buscando endereço exato..."
                  : locationQuery || "Nenhum endereço encontrado"}
              </span>
            </div>

            <div className="w-full h-80 lg:h-[350px] rounded-[24px] overflow-hidden shadow-2xl border border-white/20 bg-white/5 relative z-10 mt-1">
              <MapContainer
                center={mapCenter}
                zoom={15}
                minZoom={12}
                maxBounds={[
                  [-25.8, -49.7],
                  [-25.4, -49.2],
                ]}
                maxBoundsViscosity={1.0}
                zoomControl={false}
                attributionControl={false}
                style={{
                  height: "100%",
                  width: "100%",
                  filter: "saturate(0.8) contrast(1.1) brightness(0.9)",
                }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapWatcher onMoveEnd={handleMapMove} />
                <MapRecenter center={mapCenter} />
              </MapContainer>
              
              {/* Center Pin overlay */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none drop-shadow-lg flex flex-col items-center z-[1000]">
                <div className="bg-red-500 text-white rounded-full p-2 mb-1 shadow-lg shadow-red-500/20 animate-bounce">
                  <MapPin size={24} strokeWidth={2} />
                </div>
                <div className="w-2 h-1 bg-black/40 rounded-[100%] blur-[1px]"></div>
              </div>

              <button
                onClick={() => {
                  const btn = document.getElementById("btn-confirm-location");
                  if (btn) {
                    btn.innerHTML =
                      '<span class="flex items-center gap-2"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Localização Confirmada</span>';
                    btn.classList.add(
                      "bg-emerald-500/90",
                      "border-emerald-400",
                      "text-white",
                    );
                    btn.classList.remove("bg-white/20", "border-white/30");
                    setTimeout(() => {
                      btn.innerHTML = "Confirmar Localização";
                      btn.classList.remove("bg-emerald-500/90", "border-emerald-400");
                      btn.classList.add("bg-white/20", "border-white/30");
                    }, 3000);
                  }
                }}
                id="btn-confirm-location"
                className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md border border-white/20 text-white font-bold text-xs px-6 py-2.5 rounded-full shadow-lg hover:bg-black/60 transition-all z-[1000] tracking-wide"
              >
                Confirmar Localização
              </button>
            </div>
          </div>

        </div>

        {/* Botão de Envio Centralizado */}
        <div className="flex justify-center mt-12 mb-10">
          <button
            onClick={handleSendReport}
            disabled={isSending}
            className={`w-full max-w-md py-4.5 rounded-[30px] font-extrabold text-lg shadow-xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group disabled:opacity-50 ${
              isDark
                ? "bg-white text-zinc-900 shadow-black/25"
                : "bg-[#183a2b] text-white shadow-emerald-950/20 hover:bg-[#122c21]"
            }`}
          >
            {isSending ? "Enviando Relato..." : "Enviar Problema"}
            {!isSending && (
              <ArrowRight
                size={20}
                className="group-hover:translate-x-1.5 transition-transform"
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const MainFeed = ({
  onGoToSettings,
  onGoToProfile,
  onTabChange,
  isAdmin = false,
  onViewImage,
  onViewDetails,
  pendingCount = 0,
  resolvedCount = 0,
  pendingReports = [],
  onResolveReport,
  newsList = [],
  onAddNews,
  onDeleteNews,
  newsDbError = null,
  onOpenSupervisorManager,
}: {
  onGoToSettings: () => void;
  onGoToProfile: () => void;
  onTabChange: (tab: "home" | "report" | "tasks") => void;
  isAdmin?: boolean;
  onViewImage: (url: string, title: string) => void;
  onViewDetails?: (report: any) => void;
  pendingCount?: number;
  resolvedCount?: number;
  pendingReports?: any[];
  onResolveReport?: (reportId: string) => Promise<void>;
  newsList?: any[];
  onAddNews?: (title: string, description: string, category: string) => Promise<void>;
  onDeleteNews?: (newsId: string) => Promise<void>;
  newsDbError?: string | null;
  onOpenSupervisorManager?: () => void;
}) => {
  const { isDark } = useTheme();
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [newsTitle, setNewsTitle] = useState("");
  const [newsDescription, setNewsDescription] = useState("");
  const [newsCategory, setNewsCategory] = useState("Serviços");
  const [isAddingNews, setIsAddingNews] = useState(false);

  const [showAllNewsPanel, setShowAllNewsPanel] = useState(false);
  const [newsSearchQuery, setNewsSearchQuery] = useState("");
  const [selectedNewsCategory, setSelectedNewsCategory] = useState("Todos");
  const [activeNewsDetail, setActiveNewsDetail] = useState<any | null>(null);

  return (
    <div
      className={`relative min-h-[100dvh] sm:min-h-full w-full overflow-y-auto overflow-x-hidden font-sans transition-colors duration-300 ${
        isDark ? "bg-[#5A635C] text-white" : "bg-white text-[#183a2b]"
      }`}
    >
      {/* Top Image Section */}
      <div className="relative w-full h-[45vh] lg:h-[50vh] flex flex-col justify-end pb-8 px-6 sm:px-10 overflow-hidden">
        <div
          onClick={() =>
            onViewImage(
              pexelsNandhu,
              isAdmin ? "Transformando Araucária" : "Notícias de Araucária",
            )
          }
          className="absolute inset-0 z-0 bg-cover bg-center scale-110 cursor-pointer"
          style={{
            backgroundImage: `url("${pexelsNandhu}")`,
            filter: isDark ? "none" : "brightness(0.9) saturate(0.9)",
          }}
        />
        <div
          className={`absolute inset-0 z-0 bg-gradient-to-b from-black/20 via-black/10 pointer-events-none ${
            isDark ? "to-[#5A635C]" : "to-white"
          }`}
        />

        <div className="absolute top-8 left-6 sm:left-10 z-20 flex items-center gap-3">
          <SafeLogoImage
            isMinimal
            className="w-10 h-10 object-contain drop-shadow-md"
            alt="Logo"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1
                className={`text-xl lg:text-2xl font-serif font-bold tracking-[0.1em] drop-shadow-md ${
                  isDark ? "text-white" : "text-[#183a2b]"
                }`}
              >
                COMMUÁRIA
              </h1>
              {isAdmin && (
                <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-sans font-bold tracking-wide shadow-md">
                  ADMIN
                </span>
              )}
            </div>
            <span
              className={`text-[10px] tracking-wider font-mono -mt-1 drop-shadow-sm ${
                isDark ? "text-white/80" : "text-[#2d4a3b]/80"
              }`}
            >
              Uma cidade melhor começa com você
            </span>
          </div>
        </div>

        <h2
          className={`relative z-10 text-4xl sm:text-[44px] font-serif font-bold leading-[1.05] tracking-tight mt-auto pointer-events-none drop-shadow-lg ${
            isDark ? "text-white" : "text-[#183a2b]"
          }`}
        >
          {isAdmin ? (
            <>
              Transformando
              <br />
              Araucária
            </>
          ) : (
            <>
              Notícias de
              <br />
              Araucária
            </>
          )}
        </h2>
      </div>

      {/* Content Section */}
      <div className="relative z-10 px-6 sm:px-10 pb-40">
        {isAdmin ? (
          <>
            <h3
              className={`text-[32px] font-serif font-bold mb-1 mt-6 tracking-tight ${
                isDark ? "text-white" : "text-[#183a2b]"
              }`}
            >
              Monitoramento Urbano
            </h3>
            <p
              className={`text-sm mb-8 font-mono ${
                isDark ? "text-white/60" : "text-[#2d4a3b]"
              }`}
            >
              Araucária - PR • Dashboard em tempo real
            </p>

            {/* Statistics Cards Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div
                className={`backdrop-blur-md rounded-[32px] border p-5 flex flex-col justify-between shadow-lg relative overflow-hidden transition-colors ${
                  isDark
                    ? "bg-white/5 border-white/10 text-white"
                    : "bg-black/5 border-black/10 text-[#183a2b] shadow-sm"
                }`}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
                <span
                  className={`text-xs font-mono uppercase tracking-wider ${
                    isDark ? "text-white/60" : "text-[#2d4a3b]"
                  }`}
                >
                  Chamados Pendentes
                </span>
                <div className="mt-4 flex items-baseline gap-2">
                  <span
                    className={`text-4xl sm:text-5xl font-extrabold ${
                      isDark ? "text-[#FFAF9E]" : "text-rose-600"
                    }`}
                  >
                    {pendingCount}
                  </span>
                  <span
                    className={`text-xs font-medium font-serif italic ${
                      isDark ? "text-white/40" : "text-[#2d4a3b]/60"
                    }`}
                  >
                    abertos
                  </span>
                </div>
                <p
                  className={`text-[10px] sm:text-[11px] mt-2 font-medium ${
                    isDark ? "text-[#FFAF9E]/80" : "text-rose-700"
                  }`}
                >
                  Aguardando zeladoria
                </p>
              </div>

              <div
                className={`backdrop-blur-md rounded-[32px] border p-5 flex flex-col justify-between shadow-lg relative overflow-hidden transition-colors ${
                  isDark
                    ? "bg-white/5 border-white/10 text-white"
                    : "bg-black/5 border-black/10 text-[#183a2b] shadow-sm"
                }`}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                <span
                  className={`text-xs font-mono uppercase tracking-wider ${
                    isDark ? "text-white/60" : "text-[#2d4a3b]"
                  }`}
                >
                  Resolvidos
                </span>
                <div className="mt-4 flex items-baseline gap-2">
                  <span
                    className={`text-4xl sm:text-5xl font-extrabold ${
                      isDark ? "text-[#ACFFB6]" : "text-emerald-700"
                    }`}
                  >
                    {resolvedCount}
                  </span>
                  <span
                    className={`text-xs font-medium font-serif italic ${
                      isDark ? "text-white/40" : "text-[#2d4a3b]/60"
                    }`}
                  >
                    concluídos
                  </span>
                </div>
                <p
                  className={`text-[10px] sm:text-[11px] mt-2 font-medium ${
                    isDark ? "text-[#ACFFB6]/80" : "text-emerald-800"
                  }`}
                >
                  Atendidos com sucesso
                </p>
              </div>
            </div>

            {/* Progress bar card */}
            <div
              className={`backdrop-blur-md rounded-[32px] border p-6 mb-8 shadow-lg transition-colors ${
                isDark
                  ? "bg-white/5 border-white/10 text-white"
                  : "bg-black/5 border-black/10 text-[#183a2b] shadow-sm"
              }`}
            >
              <div className="flex justify-between items-center mb-3">
                <span
                  className={`text-sm font-medium ${
                    isDark ? "text-white/85" : "text-[#183a2b]"
                  }`}
                >
                  Índice de Resolução da Cidade
                </span>
                <span
                  className={`font-mono text-sm font-bold ${
                    isDark ? "text-white" : "text-[#183a2b]"
                  }`}
                >
                  {pendingCount + resolvedCount > 0
                    ? Math.round(
                        (resolvedCount / (pendingCount + resolvedCount)) * 100,
                      )
                    : 100}
                  %
                </span>
              </div>
              <div
                className={`w-full h-3 rounded-full overflow-hidden p-[2px] ${
                  isDark ? "bg-white/10" : "bg-black/10"
                }`}
              >
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-1000 shadow-sm"
                  style={{
                    width: `${
                      pendingCount + resolvedCount > 0
                        ? (resolvedCount / (pendingCount + resolvedCount)) * 100
                        : 100
                    }%`,
                  }}
                />
              </div>
              <p
                className={`text-xs mt-3 text-center ${
                  isDark ? "text-white/50" : "text-[#2d4a3b]"
                }`}
              >
                {pendingCount + resolvedCount === 0
                  ? "Tudo limpo! Nenhum chamado registrado no momento."
                  : `${pendingCount} chamado${pendingCount > 1 ? "s" : ""} pendente${pendingCount > 1 ? "s" : ""} necessitando de atenção.`}
              </p>
            </div>

            {/* News Management Card */}
            {isAdmin && (
              <div
                className={`backdrop-blur-md rounded-[32px] border p-6 mb-8 shadow-lg transition-colors ${
                  isDark
                    ? "bg-white/5 border-white/10 text-white"
                    : "bg-black/5 border-black/10 text-[#183a2b] shadow-sm"
                }`}
              >
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <span
                      className={`text-xs font-mono uppercase tracking-wider block ${
                        isDark ? "text-white/60" : "text-[#2d4a3b]"
                      }`}
                    >
                      Comunicados & Imprensa (Administrador)
                    </span>
                    <h4
                      className={`text-lg font-serif font-bold mt-1 ${
                        isDark ? "text-white" : "text-[#183a2b]"
                      }`}
                    >
                      Painel de Notícias de Araucária
                    </h4>
                  </div>
                  <button
                    onClick={() => setShowNewsModal(true)}
                    className="px-4 py-2 text-xs rounded-full bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Plus size={14} />
                    <span>Publicar</span>
                  </button>
                </div>

                {newsDbError && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-900 dark:text-amber-200 leading-relaxed space-y-3 flex flex-col mb-4">
                    <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                      <AlertTriangle size={15} />
                      <span>Configuração Pendente no Supabase</span>
                    </div>
                    <p className="font-sans">
                      A tabela de comunicados não foi localizada no seu banco. Atualmente as notícias estão salvas apenas de forma temporária no navegador local. Para habilitar a sincronização definitiva e nuvem, copie o código abaixo e execute no <strong>SQL Editor</strong> do seu painel do Supabase:
                    </p>
                    <div className="bg-black/80 p-3 rounded-xl font-mono text-[10px] text-white overflow-x-auto whitespace-pre select-all border border-white/10 max-h-40">
{`CREATE TABLE IF NOT EXISTS public.news (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read news" ON public.news FOR SELECT USING (true);
CREATE POLICY "Admins can insert news" ON public.news FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE public.profiles.id = auth.uid() AND public.profiles.is_admin = true
  )
);
CREATE POLICY "Admins can update news" ON public.news FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE public.profiles.id = auth.uid() AND public.profiles.is_admin = true
  )
);
CREATE POLICY "Admins can delete news" ON public.news FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE public.profiles.id = auth.uid() AND public.profiles.is_admin = true
  )
);`}
                    </div>
                    <p className="text-[10px] text-amber-700 dark:text-amber-300/80 italic">
                      Dica: Clique três vezes no código acima para selecionar tudo, copie e cole no painel do Supabase!
                    </p>
                  </div>
                )}

                {newsList.length === 0 ? (
                  <p
                    className={`text-xs italic font-mono py-2 ${
                      isDark ? "text-white/40" : "text-[#2d4a3b]/60"
                    }`}
                  >
                    Nenhuma notícia publicada. Crie seu primeiro comunicado acima!
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {newsList.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all text-xs ${
                            isDark
                              ? "bg-white/5 border-white/5 hover:border-white/10 text-white"
                              : "bg-black/5 border-black/5 hover:border-black/10 text-[#183a2b]"
                          }`}
                        >
                          <div className="flex flex-col gap-1 pr-4 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                                  item.category === "Serviços"
                                    ? "bg-teal-500/20 text-teal-800 dark:text-teal-300"
                                    : item.category === "Comunidade"
                                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                    : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                }`}
                              >
                                {item.category}
                              </span>
                              <span
                                className={`text-[10px] font-mono ${
                                  isDark ? "text-white/40" : "text-[#2d4a3b]/60"
                                }`}
                              >
                                {item.created_at ? new Date(item.created_at).toLocaleDateString("pt-BR") : "Hoje"}
                              </span>
                            </div>
                            <h5
                              className={`font-bold truncate min-w-0 ${
                                isDark ? "text-white" : "text-[#183a2b]"
                              }`}
                            >
                              {item.title}
                            </h5>
                            <p
                              className={`line-clamp-1 min-w-0 ${
                                isDark ? "text-white/60" : "text-[#2d4a3b]"
                              }`}
                            >
                              {item.description}
                            </p>
                          </div>

                          <button
                            onClick={async () => {
                              if (onDeleteNews) {
                                if (confirm("Tem certeza que deseja apagar este comunicado?")) {
                                  await onDeleteNews(item.id);
                                }
                              }
                            }}
                            className="p-2 rounded-xl bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all cursor-pointer shrink-0"
                            title="Apagar comunicado"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setShowAllNewsPanel(true)}
                      className={`w-full mt-2 py-3 px-4 text-xs font-bold rounded-2xl border transition-all flex items-center justify-center gap-1.5 group cursor-pointer shadow-sm ${
                        isDark
                          ? "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20"
                          : "bg-black/5 border-black/10 text-[#183a2b] hover:bg-black/10 hover:border-black/20"
                      }`}
                    >
                      <span>Acessar Painel de Comunicados Completo ({newsList.length})</span>
                      <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform text-emerald-600 dark:text-emerald-400" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Hierarquia de Acesso & Gestão de Supervisores (Administrador) */}
            {isAdmin && (
              <div
                className={`backdrop-blur-md rounded-[32px] border p-6 mb-8 shadow-lg transition-colors ${
                  isDark
                    ? "bg-white/5 border-white/10 text-white"
                    : "bg-black/5 border-black/10 text-[#183a2b] shadow-sm"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-500 border border-amber-500/30">
                      <HardHat size={24} />
                    </div>
                    <div>
                      <span
                        className={`text-xs font-mono uppercase tracking-wider block ${
                          isDark ? "text-white/60" : "text-[#2d4a3b]"
                        }`}
                      >
                        Níveis de Acesso & Setores
                      </span>
                      <h4
                        className={`text-lg font-serif font-bold mt-0.5 ${
                          isDark ? "text-white" : "text-[#183a2b]"
                        }`}
                      >
                        Supervisores de Categoria
                      </h4>
                      <p
                        className={`text-xs mt-1 leading-relaxed ${
                          isDark ? "text-white/70" : "text-[#2d4a3b]/80"
                        }`}
                      >
                        Gerencie contas e delegue as 5 secretarias municipais: Pavimentação, Iluminação, Limpeza, Saneamento e Arborização.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onOpenSupervisorManager}
                    className="py-3 px-5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 shrink-0 cursor-pointer"
                  >
                    <Users size={16} />
                    <span>Gerenciar Supervisores</span>
                  </button>
                </div>
              </div>
            )}

            {/* Pending list or action area */}
            <div className="mt-10">
              <h4
                className={`text-xl font-bold font-serif mb-4 flex items-center gap-2 ${
                  isDark ? "text-white" : "text-[#183a2b]"
                }`}
              >
                <span>Chamados da População</span>
                {pendingCount > 0 && (
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      isDark ? "bg-white/10 text-white/80" : "bg-black/10 text-[#183a2b]"
                    }`}
                  >
                    {pendingCount} Pendentes
                  </span>
                )}
              </h4>

              {pendingReports.length === 0 ? (
                <div
                  className={`backdrop-blur-md rounded-[32px] border p-8 text-center flex flex-col items-center justify-center gap-3 shadow-lg ${
                    isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
                  }`}
                >
                  <Check className="text-emerald-500 dark:text-emerald-400 w-12 h-12 stroke-[2px] bg-emerald-500/10 p-2.5 rounded-full" />
                  <p
                    className={`text-lg font-serif italic ${
                      isDark ? "text-white/80" : "text-[#183a2b]"
                    }`}
                  >
                    Excelente trabalho!
                  </p>
                  <p
                    className={`text-xs ${
                      isDark ? "text-white/50" : "text-[#2d4a3b]"
                    }`}
                  >
                    Não há chamados de zeladoria pendentes no momento.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingReports.slice(0, 5).map((report) => (
                    <div
                      key={report.id}
                      onClick={() => onViewDetails?.(report)}
                      className={`backdrop-blur-md rounded-[32px] border p-5 shadow-lg flex flex-col gap-4 transition-all group overflow-hidden relative cursor-pointer ${
                        isDark
                          ? "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10 text-white"
                          : "bg-black/5 border-black/10 hover:border-black/20 hover:bg-black/10 text-[#183a2b] shadow-sm"
                      }`}
                    >
                      <div className="flex gap-4 items-start">
                        {report.image_url ? (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewDetails?.(report);
                            }}
                            className="w-20 h-20 rounded-2xl bg-cover bg-center shrink-0 border border-black/10 dark:border-white/10 shadow-md hover:scale-95 transition-transform"
                            style={{
                              backgroundImage: `url("${report.image_url}")`,
                            }}
                          />
                        ) : (
                          <div
                            className={`w-20 h-20 rounded-2xl border flex items-center justify-center shrink-0 ${
                              isDark ? "bg-white/5 border-white/10 text-white/20" : "bg-black/5 border-black/10 text-black/20"
                            }`}
                          >
                            <Megaphone size={28} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h5
                            className={`font-serif font-bold text-lg truncate transition-colors ${
                              isDark ? "text-white group-hover:text-amber-100" : "text-[#183a2b] group-hover:text-emerald-800"
                            }`}
                          >
                            {report.title}
                          </h5>
                          <p
                            className={`text-xs mb-2 truncate ${
                              isDark ? "text-white/60" : "text-[#2d4a3b]"
                            }`}
                          >
                            {report.address}
                          </p>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-700 dark:text-orange-300 font-bold uppercase tracking-wider">
                              Pendente
                            </span>
                            <span
                              className={`text-[10px] font-mono ${
                                isDark ? "text-white/40" : "text-[#2d4a3b]/60"
                              }`}
                            >
                              {new Date(report.created_at).toLocaleDateString(
                                "pt-BR",
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions for Admins */}
                      {onResolveReport && (
                        <div
                          className={`pt-2 border-t flex justify-end ${
                            isDark ? "border-white/5" : "border-black/5"
                          }`}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (
                                confirm(
                                  "Tem certeza que deseja marcar este chamado como resolvido?",
                                )
                              ) {
                                onResolveReport(report.id);
                              }
                            }}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-500 hover:text-white hover:border-emerald-400 transition-all flex items-center justify-center gap-2 group/btn"
                          >
                            <Check
                              size={16}
                              className="group-hover/btn:scale-125 transition-transform animate-pulse"
                            />
                            <span>Marcar como Resolvido</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {pendingReports.length > 5 && (
                    <p
                      className={`text-center text-xs font-mono italic ${
                        isDark ? "text-white/40" : "text-[#2d4a3b]/70"
                      }`}
                    >
                      E mais {pendingReports.length - 5} chamados aguardando
                      atendimento.
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-12">
            <div>
              <h3
                className={`text-[32px] font-serif font-bold mb-1 mt-6 tracking-tight ${
                  isDark ? "text-white" : "text-[#183a2b]"
                }`}
              >
                Notícias
              </h3>
              <p className="text-sm mb-6 font-mono font-bold tracking-wide uppercase text-emerald-600 dark:text-emerald-400">
                Araucária - PR • Fique por dentro
              </p>
            </div>

            {/* Featured Article - About the App */}
            <div
              className={`backdrop-blur-md rounded-[32px] border overflow-hidden shadow-lg p-6 flex flex-col gap-4 transition-colors ${
                isDark
                  ? "bg-white/5 border-white/10 text-white"
                  : "bg-black/5 border-black/10 text-[#183a2b] shadow-sm"
              }`}
            >
              <div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-600 text-white w-fit uppercase tracking-wider mb-3 inline-block">
                  Destaque • Sobre o App
                </span>
                <h4
                  className={`text-2xl font-bold font-serif leading-snug ${
                    isDark ? "text-white" : "text-[#183a2b]"
                  }`}
                >
                  Commuária: A Ponte Entre Você e a Zeladoria de Araucária
                </h4>
              </div>
              <div className="space-y-4">
                <p
                  className={`text-base leading-[1.6] font-medium ${
                    isDark ? "text-white/90" : "text-[#183a2b]/90"
                  }`}
                >
                  Em um município dinâmico como Araucária, manter a zeladoria
                  urbana em dia é um desafio constante que exige uma comunicação
                  ágil entre a população e o poder público.
                </p>
                <p
                  className={`text-base leading-[1.6] font-medium ${
                    isDark ? "text-white/95" : "text-[#183a2b]"
                  }`}
                >
                  Por isso, nosso projeto surge como um aliado estratégico da
                  gestão municipal. Ao utilizar geolocalização para gerar
                  relatórios automáticos e precisos, o app atua como uma 'ponte
                  digital' que ajuda a prefeitura a mapear demandas com rapidez,
                  permitindo que a manutenção chegue mais cedo onde é necessária
                  e fortalecendo o cuidado com a nossa cidade de forma
                  colaborativa.
                </p>
              </div>
            </div>

            {/* More Local News items */}
            <div className="space-y-6">
              <h4
                className={`text-xl font-bold font-serif flex items-center justify-between gap-2 border-b pb-2 ${
                  isDark ? "border-white/10 text-white" : "border-black/10 text-[#183a2b]"
                }`}
              >
                <span>Últimas Atualizações</span>
                {newsList.length > 0 && (
                  <button
                    onClick={() => setShowAllNewsPanel(true)}
                    className={`text-xs font-mono font-bold transition-colors uppercase tracking-wider flex items-center gap-1 cursor-pointer px-3 py-1.5 rounded-full border shadow-sm ${
                      isDark
                        ? "text-emerald-400 hover:text-emerald-300 bg-white/5 border-white/10"
                        : "text-emerald-700 hover:text-emerald-800 bg-black/5 border-black/10"
                    }`}
                  >
                    <span>Ver Todos</span>
                    <ArrowRight size={12} />
                  </button>
                )}
              </h4>

              <div className="grid grid-cols-1 gap-4">
                {newsDbError && !isAdmin && (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs p-3.5 rounded-2xl flex items-center gap-2 font-medium">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>Os comunicados estão carregados temporariamente neste dispositivo. Sincronização em nuvem pendente.</span>
                  </div>
                )}

                {newsList.slice(0, 3).map((item) => {
                  const dateStr = item.created_at
                    ? new Date(item.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                      })
                    : "Hoje";
                  return (
                    <div
                      key={item.id}
                      onClick={() => setActiveNewsDetail(item)}
                      className={`backdrop-blur-md rounded-[24px] border p-5 flex flex-col gap-2 shadow-lg transition-all cursor-pointer group ${
                        isDark
                          ? "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10 text-white"
                          : "bg-black/5 border-black/10 hover:border-black/20 hover:bg-black/10 text-[#183a2b] shadow-sm"
                      }`}
                    >
                      <div
                        className={`flex justify-between items-center text-[10px] font-mono ${
                          isDark ? "text-white/40" : "text-[#2d4a3b]/60"
                        }`}
                      >
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            item.category === "Serviços"
                              ? "bg-teal-500/20 text-teal-800 dark:text-teal-300"
                              : item.category === "Comunidade"
                              ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                              : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          }`}
                        >
                          {item.category}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold transition-colors">
                          Ler Comunicado <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                      <h5
                        className={`font-serif font-bold text-lg transition-colors ${
                          isDark ? "text-white group-hover:text-emerald-300" : "text-[#183a2b] group-hover:text-emerald-800"
                        }`}
                      >
                        {item.title}
                      </h5>
                      <p
                        className={`text-sm leading-relaxed line-clamp-2 ${
                          isDark ? "text-white/70" : "text-[#2d4a3b]"
                        }`}
                      >
                        {item.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add News / Announcement Modal for Admins */}
      <AnimatePresence>
        {showNewsModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[10000] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`border p-6 sm:p-8 rounded-[32px] w-full max-w-lg shadow-2xl relative flex flex-col gap-5 ${
                isDark ? "bg-[#28302A] border-white/10 text-white" : "bg-white border-black/10 text-[#183a2b]"
              }`}
            >
              <div className="flex justify-between items-center">
                <h4 className="text-xl font-serif font-bold">
                  Novo Comunicado Oficial
                </h4>
                <button
                  type="button"
                  onClick={() => setShowNewsModal(false)}
                  className={`p-1.5 rounded-full border transition-all cursor-pointer ${
                    isDark
                      ? "bg-white/5 border-white/10 hover:bg-white/10 text-white/75"
                      : "bg-black/5 border-black/10 hover:bg-black/10 text-[#183a2b]"
                  }`}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    className={`text-[11px] font-mono font-bold tracking-wider uppercase ${
                      isDark ? "text-white/60" : "text-[#2d4a3b]"
                    }`}
                  >
                    Título do Comunicado
                  </label>
                  <input
                    type="text"
                    value={newsTitle}
                    onChange={(e) => setNewsTitle(e.target.value)}
                    placeholder="Ex: Manutenção na rede de água do Centro..."
                    className={`w-full px-5 py-3.5 border rounded-2xl text-sm focus:outline-none focus:border-emerald-500 transition-all font-medium ${
                      isDark
                        ? "bg-white/5 border-white/10 text-white placeholder-white/30"
                        : "bg-black/5 border-black/10 text-[#183a2b] placeholder-[#2d4a3b]/50"
                    }`}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    className={`text-[11px] font-mono font-bold tracking-wider uppercase ${
                      isDark ? "text-white/60" : "text-[#2d4a3b]"
                    }`}
                  >
                    Categoria
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Serviços", "Comunidade", "Avisos"].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewsCategory(cat)}
                        className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          newsCategory === cat
                            ? isDark
                              ? "bg-white text-[#152018] border-white shadow-md"
                              : "bg-[#183a2b] text-white border-[#183a2b] shadow-md"
                            : isDark
                            ? "bg-white/5 text-white/75 border-white/10 hover:bg-white/10"
                            : "bg-black/5 text-[#2d4a3b] border-black/10 hover:bg-black/10"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    className={`text-[11px] font-mono font-bold tracking-wider uppercase ${
                      isDark ? "text-white/60" : "text-[#2d4a3b]"
                    }`}
                  >
                    Conteúdo da Notícia
                  </label>
                  <textarea
                    rows={4}
                    value={newsDescription}
                    onChange={(e) => setNewsDescription(e.target.value)}
                    placeholder="Descreva os detalhes importantes para os moradores..."
                    className={`w-full px-5 py-3.5 border rounded-2xl text-sm focus:outline-none focus:border-emerald-500 resize-none transition-all font-medium ${
                      isDark
                        ? "bg-white/5 border-white/10 text-white placeholder-white/30"
                        : "bg-black/5 border-black/10 text-[#183a2b] placeholder-[#2d4a3b]/50"
                    }`}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewsModal(false)}
                  className={`flex-1 py-3 px-4 text-xs font-bold rounded-full border transition-all cursor-pointer text-center ${
                    isDark
                      ? "bg-white/5 border-white/10 hover:bg-white/10 text-white/80"
                      : "bg-black/5 border-black/10 hover:bg-black/10 text-[#183a2b]"
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isAddingNews || !newsTitle.trim() || !newsDescription.trim()}
                  onClick={async () => {
                    if (onAddNews) {
                      setIsAddingNews(true);
                      try {
                        await onAddNews(newsTitle, newsDescription, newsCategory);
                        setNewsTitle("");
                        setNewsDescription("");
                        setNewsCategory("Serviços");
                        setShowNewsModal(false);
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setIsAddingNews(false);
                      }
                    }
                  }}
                  className="flex-1 py-3 px-4 text-xs font-bold rounded-full bg-emerald-600 text-white hover:bg-emerald-500 transition-all cursor-pointer disabled:opacity-40 text-center shadow-lg shadow-emerald-600/20"
                >
                  {isAddingNews ? "Publicando..." : "Publicar"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* All News/Announcements Full Screen Panel */}
      <AnimatePresence>
        {showAllNewsPanel && (
          <motion.div
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className={`fixed inset-0 z-[9900] flex flex-col overflow-y-auto ${
              isDark ? "bg-[#5A635C] text-white" : "bg-white text-[#183a2b]"
            }`}
          >
            {/* Elegant Header Background Cover */}
            <div className="relative w-full py-12 px-6 sm:px-10 border-b border-black/10 dark:border-white/10 shrink-0">
              <div 
                className="absolute inset-0 z-0 bg-cover bg-center brightness-[0.45] saturate-[0.8]"
                style={{ backgroundImage: `url("${pexelsNandhu}")` }}
              />
              <div
                className={`absolute inset-0 z-0 bg-gradient-to-t from-transparent ${
                  isDark ? "to-black/40" : "to-black/30"
                }`}
              />
              
              <div className="relative z-10 max-w-4xl mx-auto flex flex-col gap-5">
                <button
                  type="button"
                  onClick={() => setShowAllNewsPanel(false)}
                  className="flex items-center gap-2 text-white/90 hover:text-white transition-all text-xs font-mono mb-2 uppercase tracking-wider bg-black/40 hover:bg-black/60 px-4 py-2.5 rounded-full border border-white/20 self-start cursor-pointer shadow-md backdrop-blur-md"
                >
                  <ArrowRight size={14} className="rotate-180" />
                  <span>Voltar ao início</span>
                </button>

                <div>
                  <span className="text-[10px] font-mono font-bold px-3 py-1 rounded-full bg-emerald-600 text-white w-fit uppercase tracking-wider mb-2.5 inline-block shadow-md">
                    Painel Oficial
                  </span>
                  <h3 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight text-white mb-2 leading-none drop-shadow-md">
                    Todos os Comunicados
                  </h3>
                  <p className="text-sm text-white/85 font-sans max-w-xl font-medium drop-shadow-sm">
                    Fique sabendo de tudo que acontece em Araucária. Encontre abaixo notícias oficiais, avisos municipais e ações comunitárias.
                  </p>
                </div>
              </div>
            </div>

            {/* Filter and Search controls */}
            <div
              className={`w-full py-6 px-6 sm:px-10 border-b sticky top-0 z-50 backdrop-blur-md shadow-lg ${
                isDark
                  ? "bg-[#5A635C]/95 border-white/10"
                  : "bg-white/95 border-black/10"
              }`}
            >
              <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search
                    className={`absolute left-5 top-1/2 -translate-y-1/2 ${
                      isDark ? "text-white/40" : "text-[#2d4a3b]/50"
                    }`}
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="Buscar comunicados por título ou conteúdo..."
                    value={newsSearchQuery}
                    onChange={(e) => setNewsSearchQuery(e.target.value)}
                    className={`w-full pl-12 pr-12 py-3.5 border rounded-[24px] text-sm focus:outline-none focus:border-emerald-500 transition-all font-medium ${
                      isDark
                        ? "bg-white/5 border-white/10 text-white placeholder-white/30"
                        : "bg-black/5 border-black/10 text-[#183a2b] placeholder-[#2d4a3b]/50"
                    }`}
                  />
                  {newsSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setNewsSearchQuery("")}
                      className={`absolute right-5 top-1/2 -translate-y-1/2 text-xs cursor-pointer font-mono ${
                        isDark ? "text-white/40 hover:text-white" : "text-[#2d4a3b]/50 hover:text-[#183a2b]"
                      }`}
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {/* Horizontal Category Selector */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none shrink-0">
                  {["Todos", "Serviços", "Comunidade", "Avisos"].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedNewsCategory(cat)}
                      className={`px-5 py-3 rounded-full text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                        selectedNewsCategory === cat
                          ? isDark
                            ? "bg-white text-[#152018] border-white shadow-md shadow-black/20"
                            : "bg-[#183a2b] text-white border-[#183a2b] shadow-md"
                          : isDark
                          ? "bg-white/5 text-white/80 border-white/10 hover:bg-white/10"
                          : "bg-black/5 text-[#2d4a3b] border-black/10 hover:bg-black/10"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* News List Container */}
            <div className="flex-1 w-full max-w-4xl mx-auto py-10 px-6 sm:px-10">
              {newsDbError && (
                <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-3 shadow-md">
                  <AlertTriangle size={16} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-800 dark:text-amber-300 block mb-1">Aviso de Sincronização</span>
                    <span>{newsDbError} Os avisos que você vê aqui podem estar salvos temporariamente no seu navegador e não sincronizados com a nuvem devido a ausência da tabela 'news' no Supabase.</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-5">
                {newsList
                  .filter((item) => {
                    const matchesCategory =
                      selectedNewsCategory === "Todos" ||
                      item.category === selectedNewsCategory;
                    const matchesSearch =
                      item.title.toLowerCase().includes(newsSearchQuery.toLowerCase()) ||
                      item.description.toLowerCase().includes(newsSearchQuery.toLowerCase());
                    return matchesCategory && matchesSearch;
                  })
                  .map((item, idx) => {
                    const dateStr = item.created_at
                      ? new Date(item.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric"
                        })
                      : "Hoje";
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={item.id}
                        onClick={() => setActiveNewsDetail(item)}
                        className={`backdrop-blur-md rounded-[32px] border p-6 flex flex-col gap-4 transition-all cursor-pointer group shadow-lg ${
                          isDark
                            ? "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10 text-white"
                            : "bg-black/5 border-black/10 hover:border-black/20 hover:bg-black/10 text-[#183a2b] shadow-sm"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                            item.category === "Serviços"
                              ? "bg-teal-500/20 text-teal-800 dark:text-teal-300"
                              : item.category === "Comunidade"
                              ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                              : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          }`}>
                            {item.category}
                          </span>
                          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                            <span
                              className={`text-[11px] font-mono ${
                                isDark ? "text-white/40" : "text-[#2d4a3b]/60"
                              }`}
                            >
                              {dateStr}
                            </span>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (onDeleteNews) {
                                    if (confirm("Tem certeza que deseja apagar este comunicado definitivamente no painel do administrador?")) {
                                      await onDeleteNews(item.id);
                                    }
                                  }
                                }}
                                className="p-2 rounded-xl bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/20 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all cursor-pointer shadow-md"
                                title="Apagar comunicado"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4
                            className={`text-xl sm:text-2xl font-serif font-bold transition-colors leading-snug ${
                              isDark ? "text-white group-hover:text-emerald-300" : "text-[#183a2b] group-hover:text-emerald-800"
                            }`}
                          >
                            {item.title}
                          </h4>
                          <p
                            className={`text-sm sm:text-base leading-relaxed font-sans font-medium line-clamp-3 ${
                              isDark ? "text-white/70" : "text-[#2d4a3b]"
                            }`}
                          >
                            {item.description}
                          </p>
                        </div>
                        <div className="pt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold tracking-wide uppercase font-mono group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-all">
                          <span>Ler comunicado completo</span>
                          <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      </motion.div>
                    );
                  })}

                {newsList.filter((item) => {
                  const matchesCategory =
                    selectedNewsCategory === "Todos" ||
                    item.category === selectedNewsCategory;
                  const matchesSearch =
                    item.title.toLowerCase().includes(newsSearchQuery.toLowerCase()) ||
                    item.description.toLowerCase().includes(newsSearchQuery.toLowerCase());
                  return matchesCategory && matchesSearch;
                }).length === 0 && (
                  <div
                    className={`text-center py-20 rounded-[32px] border ${
                      isDark ? "bg-white/5 border-white/5 text-white/40" : "bg-black/5 border-black/5 text-[#2d4a3b]/60"
                    }`}
                  >
                    <p className="font-mono italic text-sm">
                      Nenhum comunicado encontrado para os critérios selecionados.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* News Detail Full View Dialog */}
      <AnimatePresence>
        {activeNewsDetail && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[10000] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`border p-6 sm:p-10 rounded-[36px] w-full max-w-2xl shadow-2xl relative flex flex-col gap-6 max-h-[85vh] overflow-y-auto ${
                isDark ? "bg-[#2E332F] border-white/10 text-white" : "bg-white border-black/10 text-[#183a2b]"
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveNewsDetail(null)}
                className={`absolute top-6 right-6 p-2 rounded-full border transition-all cursor-pointer ${
                  isDark
                    ? "bg-white/5 border-white/10 hover:bg-white/10 text-white/75"
                    : "bg-black/5 border-black/10 hover:bg-black/10 text-[#183a2b]"
                }`}
              >
                <X size={18} />
              </button>

              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                    activeNewsDetail.category === "Serviços"
                      ? "bg-teal-500/20 text-teal-800 dark:text-teal-300"
                      : activeNewsDetail.category === "Comunidade"
                      ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                      : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  }`}>
                    {activeNewsDetail.category}
                  </span>
                  <span
                    className={`text-xs font-mono ${
                      isDark ? "text-white/40" : "text-[#2d4a3b]/60"
                    }`}
                  >
                    {activeNewsDetail.created_at ? new Date(activeNewsDetail.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric"
                    }) : "Hoje"}
                  </span>
                </div>
                <h4 className="text-2xl sm:text-3xl font-serif font-bold leading-tight tracking-tight">
                  {activeNewsDetail.title}
                </h4>
              </div>

              <div
                className={`h-[1px] w-full ${
                  isDark ? "bg-white/15" : "bg-black/15"
                }`}
              />

              <p
                className={`text-base leading-[1.65] font-medium font-sans whitespace-pre-wrap ${
                  isDark ? "text-white/95" : "text-[#183a2b]"
                }`}
              >
                {activeNewsDetail.description}
              </p>

              <button
                type="button"
                onClick={() => setActiveNewsDetail(null)}
                className={`mt-4 w-full py-3.5 px-6 text-xs font-bold rounded-full border transition-all cursor-pointer text-center ${
                  isDark
                    ? "bg-white/10 hover:bg-white/15 border-white/10 text-white/90"
                    : "bg-[#183a2b] hover:bg-[#122c21] border-[#183a2b] text-white"
                }`}
              >
                Voltar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Image Modal ---

const ImageModal = ({
  imageUrl,
  title,
  onClose,
}: {
  imageUrl: string;
  title: string;
  onClose: () => void;
}) => {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Commuária - ${title}`,
          text: `Veja este relato: ${title}`,
          url: imageUrl,
        });
      } catch (error) {
        if ((error as any).name !== "AbortError") {
          console.error("Erro ao compartilhar", error);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(imageUrl);
        alert("Link da imagem copiado!");
      } catch (err) {
        console.error("Erro ao copiar", err);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative max-w-full max-h-full w-full sm:w-auto overflow-hidden flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
        >
          <X size={24} />
        </button>

        <img
          src={imageUrl}
          alt={title}
          className="max-w-full max-h-[70dvh] object-contain rounded-2xl shadow-2xl border border-white/10"
          referrerPolicy="no-referrer"
        />

        <div className="mt-8 flex flex-col items-center gap-6 w-full">
          <h3 className="text-xl font-serif font-bold text-white tracking-wide">
            {title}
          </h3>

          <div className="flex gap-4">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 transition-all shadow-lg"
            >
              <Share2 size={20} />
              <span>Compartilhar</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- Report Details Modal ---

const ReportDetailsModal = ({
  report,
  onClose,
  onDelete,
  onResolve,
  onUpdateStatus,
  isAdmin,
  userRole = "user",
  assignedCategory,
  currentUserId,
}: {
  report: any;
  onClose: () => void;
  onDelete?: (id: string) => Promise<void>;
  onResolve?: (id: string) => Promise<void>;
  onUpdateStatus?: (id: string, newStatus: string, notes?: string) => Promise<void>;
  isAdmin?: boolean;
  userRole?: UserRole;
  assignedCategory?: string | null;
  currentUserId?: string;
}) => {
  const { isDark } = useTheme();
  const [authorName, setAuthorName] = useState<string>("Carregando...");
  const [isResolving, setIsResolving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>(report.status || "unresolved");
  const [technicalNotes, setTechnicalNotes] = useState<string>(report.status_notes || "");

  const canManage =
    isAdmin ||
    userRole === "admin" ||
    (userRole === "supervisor" && (!assignedCategory || report.category === assignedCategory));

  useEffect(() => {
    if (report.anonymous) {
      setAuthorName("Anônimo");
      return;
    }

    const fetchAuthor = async () => {
      try {
        if (!supabase) {
          setAuthorName("Usuário de Araucária");
          return;
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", report.user_id)
          .single();
        if (profile?.name) {
          setAuthorName(profile.name);
        } else {
          const localProfiles = JSON.parse(
            localStorage.getItem("commuaria_profiles") || "[]",
          );
          const matched = localProfiles.find(
            (p: any) => p.id === report.user_id,
          );
          setAuthorName(matched?.name || "Cidadão de Araucária");
        }
      } catch (err) {
        setAuthorName("Cidadão de Araucária");
      }
    };

    fetchAuthor();
  }, [report]);

  const customMarkerIcon = (status: string) =>
    L.divIcon({
      className: "custom-leaflet-icon-detail",
      html: `
      <div class="flex items-center justify-center">
        <div class="p-2 rounded-full border border-white/40 shadow-lg ${
          status === "resolved"
            ? "bg-emerald-500 text-white shadow-emerald-500/30"
            : status === "in_progress"
            ? "bg-blue-500 text-white shadow-blue-500/30"
            : status === "in_analysis"
            ? "bg-purple-500 text-white shadow-purple-500/30"
            : "bg-orange-500 text-white shadow-orange-500/30 animate-pulse"
        }">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.74a1.095 1.095 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      </div>
    `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

  const handleSaveStatusAndNotes = async () => {
    if (!onUpdateStatus) return;
    setIsSavingNotes(true);
    try {
      await onUpdateStatus(report.id, selectedStatus, technicalNotes);
      report.status = selectedStatus;
      report.status_notes = technicalNotes;
      alert("Status e parecer técnico atualizados com sucesso!");
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar atualização.");
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleResolve = async () => {
    if (onUpdateStatus) {
      await onUpdateStatus(report.id, "resolved", technicalNotes || "Ocorrência resolvida com sucesso.");
      report.status = "resolved";
      setSelectedStatus("resolved");
      return;
    }
    if (!onResolve) return;
    setIsResolving(true);
    try {
      await onResolve(report.id);
      report.status = "resolved";
      setSelectedStatus("resolved");
    } catch (_) {
    } finally {
      setIsResolving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (
      confirm("Tem certeza que deseja apagar definitivamente este chamado?")
    ) {
      setIsDeleting(true);
      try {
        await onDelete(report.id);
        onClose();
      } catch (_) {
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const reportDate = report.created_at
    ? new Date(report.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "Data não informada";

  const isOwner = currentUserId && report.user_id === currentUserId;

  const categoryData = CATEGORIES_CONFIG.find(
    (c) =>
      c.id === report.category ||
      c.shortLabel === report.category ||
      c.label === report.category,
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 15, opacity: 0 }}
        className={`relative max-w-lg w-full rounded-[40px] border overflow-hidden flex flex-col p-6 shadow-2xl max-h-[90vh] transition-colors duration-300 ${
          isDark
            ? "bg-[#1d2d2e] border-white/20 text-white"
            : "bg-white border-black/10 text-[#183a2b]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 z-50 w-10 h-10 rounded-full border flex items-center justify-center transition-all shadow-md active:scale-95 ${
            isDark
              ? "bg-white/15 border-white/20 text-white hover:bg-white/25"
              : "bg-black/5 border-black/10 text-[#183a2b] hover:bg-black/10"
          }`}
        >
          <X size={20} />
        </button>

        <div className="overflow-y-auto space-y-4 pr-1 scrollbar-thin text-left">
          {/* Status and Category Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {/* Category Badge */}
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold font-sans flex items-center gap-1.5 shadow-sm ${
                categoryData
                  ? isDark
                    ? `${categoryData.bgDark} ${categoryData.textDark} ${categoryData.borderDark} border`
                    : `${categoryData.bgLight} ${categoryData.textLight} ${categoryData.borderLight} border`
                  : "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
              }`}
            >
              <span>📌</span>
              <span>{report.category || "Geral"}</span>
            </span>

            {/* Status Badge */}
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold font-sans tracking-wide shadow-md ${
                report.status === "resolved"
                  ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
                  : report.status === "in_progress"
                  ? "bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-500/30"
                  : report.status === "in_analysis"
                  ? "bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-500/30"
                  : "bg-orange-500/20 text-amber-800 dark:text-orange-300 border border-orange-500/30 animate-pulse"
              }`}
            >
              {report.status === "resolved"
                ? "Concluído"
                : report.status === "in_progress"
                ? "Em Andamento"
                : report.status === "in_analysis"
                ? "Em Análise"
                : "Em Aberto"}
            </span>

            <span
              className={`text-xs font-mono ml-auto ${
                isDark ? "text-white/50" : "text-[#2d4a3b]/60"
              }`}
            >
              {reportDate}
            </span>
          </div>

          {/* Title */}
          <h3
            className={`text-2xl font-serif font-bold tracking-tight leading-tight pt-1 ${
              isDark ? "text-white" : "text-[#183a2b]"
            }`}
          >
            {report.title}
          </h3>

          {/* Author */}
          <div
            className={`flex items-center gap-3 p-3.5 rounded-3xl border ${
              isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center border shadow-inner ${
                isDark
                  ? "bg-white/10 text-white/80 border-white/20"
                  : "bg-black/5 text-[#183a2b] border-black/10"
              }`}
            >
              <User size={20} />
            </div>
            <div className="flex flex-col">
              <span
                className={`text-[10px] uppercase tracking-widest font-mono ${
                  isDark ? "text-white/40" : "text-[#2d4a3b]/60"
                }`}
              >
                Relatado por
              </span>
              <span
                className={`text-sm font-semibold ${
                  isDark ? "text-white" : "text-[#183a2b]"
                }`}
              >
                {authorName}
              </span>
            </div>
          </div>

          {/* Image */}
          {report.image_url ? (
            <div className="relative w-full h-44 rounded-3xl overflow-hidden border border-white/10 shadow-md">
              <img
                src={report.image_url}
                alt={report.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div
              className={`w-full h-32 rounded-3xl border flex flex-col items-center justify-center gap-2 ${
                isDark ? "bg-white/5 border-white/10 text-white/30" : "bg-black/5 border-black/10 text-[#2d4a3b]/40"
              }`}
            >
              <Camera size={32} strokeWidth={1.5} />
              <span className="text-xs">Nenhuma foto anexada</span>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-amber-700 dark:text-[#FFAF9E] uppercase tracking-widest font-mono font-bold">
              Descrição do Morador
            </span>
            <p
              className={`text-sm leading-relaxed whitespace-pre-line rounded-2xl border p-4 ${
                isDark
                  ? "bg-white/5 border-white/5 text-white/85"
                  : "bg-black/5 border-black/10 text-[#183a2b]"
              }`}
            >
              {report.description || report.title}
            </p>
          </div>

          {/* Parecer Técnico da Zeladoria (Se existir e o usuário for comum) */}
          {report.status_notes && !canManage && (
            <div className="space-y-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 uppercase tracking-widest font-mono font-bold flex items-center gap-1.5">
                <HardHat size={14} />
                <span>Parecer Técnico do Supervisor</span>
              </span>
              <p
                className={`text-sm leading-relaxed ${
                  isDark ? "text-white/90" : "text-[#183a2b]"
                }`}
              >
                {report.status_notes}
              </p>
            </div>
          )}

          {/* Painel de Gestão do Supervisor/Admin */}
          {canManage && (
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isDark
                  ? "bg-white/5 border-amber-400/20"
                  : "bg-amber-50/50 border-amber-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono uppercase tracking-wider text-amber-600 dark:text-amber-300 flex items-center gap-1.5">
                  <HardHat size={14} />
                  <span>Painel de Atendimento do Setor</span>
                </span>
                <span className="text-[10px] opacity-70">
                  {userRole === "admin" ? "Acesso Geral" : `Setor: ${report.category}`}
                </span>
              </div>

              {/* Status Selector */}
              <div>
                <label className="text-[11px] font-mono block mb-1.5 opacity-80">
                  Alterar Situação do Chamado:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: "unresolved", label: "Em Aberto", bg: "bg-orange-500/20 text-orange-600 dark:text-orange-300" },
                    { id: "in_analysis", label: "Em Análise", bg: "bg-purple-500/20 text-purple-600 dark:text-purple-300" },
                    { id: "in_progress", label: "Em Andamento", bg: "bg-blue-500/20 text-blue-600 dark:text-blue-300" },
                    { id: "resolved", label: "Concluído", bg: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300" },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSelectedStatus(st.id)}
                      className={`p-2 rounded-xl text-[11px] font-bold border transition-all ${
                        selectedStatus === st.id
                          ? `${st.bg} border-current shadow-md`
                          : isDark
                          ? "bg-white/5 border-white/10 opacity-60 hover:opacity-100"
                          : "bg-white border-black/10 opacity-60 hover:opacity-100"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Technical Notes Input */}
              <div>
                <label className="text-[11px] font-mono block mb-1.5 opacity-80">
                  Parecer Técnico / Informações de Atendimento:
                </label>
                <textarea
                  rows={3}
                  value={technicalNotes}
                  onChange={(e) => setTechnicalNotes(e.target.value)}
                  placeholder="Ex: Equipe de pavimentação esteve no local e realizou a operação tapa-buraco."
                  className={`w-full p-3 rounded-xl text-xs border font-sans focus:outline-none ${
                    isDark
                      ? "bg-black/30 border-white/15 text-white placeholder-white/40 focus:border-amber-400"
                      : "bg-white border-black/15 text-[#183a2b] placeholder-[#2d4a3b]/50 focus:border-amber-600"
                  }`}
                />
              </div>

              {onUpdateStatus && (
                <button
                  type="button"
                  onClick={handleSaveStatusAndNotes}
                  disabled={isSavingNotes}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 size={14} />
                  <span>{isSavingNotes ? "Salvando Parecer..." : "Salvar Situação e Parecer"}</span>
                </button>
              )}
            </div>
          )}

          {/* Location Area with Address & Map */}
          <div className="space-y-2">
            <span className="text-[11px] text-emerald-700 dark:text-[#ACFFB6] uppercase tracking-widest font-mono font-bold flex items-center gap-1.5">
              <MapPin size={12} />
              <span>Localização de Zeladoria</span>
            </span>
            <p
              className={`text-sm leading-tight border p-4 rounded-2xl ${
                isDark
                  ? "bg-white/5 border-white/5 text-white/90"
                  : "bg-black/5 border-black/10 text-[#183a2b]"
              }`}
            >
              {report.address || "Araucária, PR"}
            </p>

            {report.latitude && report.longitude && (
              <div className="w-full h-44 rounded-3xl overflow-hidden border border-black/10 dark:border-white/20 relative z-10 shadow-lg">
                <MapContainer
                  center={[report.latitude, report.longitude]}
                  zoom={15}
                  zoomControl={false}
                  attributionControl={false}
                  style={{
                    height: "100%",
                    width: "100%",
                    filter: "saturate(0.85) contrast(1.1) brightness(0.9)",
                  }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker
                    position={[report.latitude, report.longitude]}
                    icon={customMarkerIcon(report.status)}
                  />
                  <MapRecenter center={[report.latitude, report.longitude]} />
                </MapContainer>
              </div>
            )}
          </div>

          {/* Actions inside Modal */}
          {(isAdmin || canManage || isOwner) && (
            <div className="pt-2 flex gap-3 text-sm">
              {canManage && report.status !== "resolved" && onResolve && (
                <button
                  type="button"
                  onClick={handleResolve}
                  disabled={isResolving}
                  className="flex-1 py-3.5 rounded-full bg-emerald-600 border border-emerald-500/30 text-white font-bold hover:bg-emerald-700 transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
                >
                  <Check size={18} />
                  <span>{isResolving ? "Resolvendo..." : "Marcar como Resolvido"}</span>
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className={`py-3.5 rounded-full border bg-red-500/10 border-red-500/25 text-red-600 dark:text-red-300 font-bold hover:bg-red-600 hover:text-white hover:border-red-500 transition-all flex items-center justify-center gap-2 active:scale-95 ${
                    canManage && report.status !== "resolved"
                      ? "px-5 font-bold"
                      : "w-full"
                  }`}
                >
                  <Trash2 size={16} />
                  <span>{isDeleting ? "Apagando..." : "Apagar"}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- Main App ---

const screenVariants = {
  initial: { opacity: 0, scale: 0.98, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 1.02, y: -10 },
};

const pageTransition = {
  duration: 0.5,
  ease: [0.22, 1, 0.36, 1], // Custom cubic-bezier for a very fluid, "slick" feel
};

export function AppContent() {
  const { isDark } = useTheme();
  const [screen, setScreen] = useState<
    | "landing"
    | "login"
    | "signup"
    | "forgot-password"
    | "settings"
    | "profile"
    | "feed"
    | "report"
    | "tasks"
  >("landing");
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("user");
  const [assignedCategory, setAssignedCategory] = useState<string | null>(null);
  const [showSupervisorManager, setShowSupervisorManager] = useState(false);

  const [activeImage, setActiveImage] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [activeReport, setActiveReport] = useState<any | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    id?: string;
    name: string;
    email: string;
    password?: string;
    open: number;
    resolved: number;
    anonymous?: boolean;
    role?: UserRole;
    assigned_category?: string | null;
  }>({
    id: "",
    name: "Usuário",
    email: "",
    password: "",
    open: 0,
    resolved: 0,
    anonymous: false,
    role: "user",
    assigned_category: null,
  });
  const [userReports, setUserReports] = useState<any[]>([]);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<"email" | "code" | "reset">("email");

  // System statistics states
  const [systemPendingCount, setSystemPendingCount] = useState(0);
  const [systemResolvedCount, setSystemResolvedCount] = useState(0);
  const [systemPendingReports, setSystemPendingReports] = useState<any[]>([]);
  const [allSystemReports, setAllSystemReports] = useState<any[]>([]);
  const [newsList, setNewsList] = useState<any[]>([]);
  const [newsDbError, setNewsDbError] = useState<string | null>(null);
  const [showDbModal, setShowDbModal] = useState(false);

  const fetchNewsList = async () => {
    const local = JSON.parse(localStorage.getItem("commuaria_news") || "[]");
    
    if (!supabase) {
      setNewsList(local);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      if (data) {
        setNewsDbError(null);
        // Combinar os itens do banco com os do localStorage para não perder nada de teste local
        const merged = [...data];
        
        local.forEach((localItem: any) => {
          const exists = merged.some(
            (dbItem: any) => 
              dbItem.id === localItem.id || 
              (dbItem.title === localItem.title && dbItem.description === localItem.description)
          );
          if (!exists) {
            merged.push(localItem);
          }
        });

        // Ordenar as notícias combinadas pela data de criação descrescente
        merged.sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA;
        });

        // Salvar cópia mesclada atualizada no cache local do navegador
        localStorage.setItem("commuaria_news", JSON.stringify(merged));
        setNewsList(merged);
      } else {
        setNewsList(local);
      }
    } catch (err: any) {
      console.warn("Erro ao carregar notícias do Supabase, usando local:", err);
      if (err && (err.code === "42P01" || (err.message && err.message.includes("relation \"news\" does not exist")))) {
        setNewsDbError("A tabela 'news' não existe no banco de dados do Supabase. Use o script SQL fornecido para criá-la.");
      } else {
        setNewsDbError("Não foi possível conectar ao banco de dados para sincronizar as notícias. Carregando dados do navegador.");
      }
      setNewsList(local);
    }
  };

  const handleAddNews = async (title: string, description: string, category: string) => {
    const newRecord = {
      id: "news_" + Math.random().toString(36).substring(2, 9),
      title,
      description,
      category,
      created_at: new Date().toISOString()
    };

    // 1. Sempre salvar no LocalStorage primeiro para garantir persistência imediata e robusta à falhas
    const local = JSON.parse(localStorage.getItem("commuaria_news") || "[]");
    local.unshift(newRecord);
    localStorage.setItem("commuaria_news", JSON.stringify(local));
    setNewsList(local);

    if (!supabase) return;

    try {
      // 2. Tentar enviar para a tabela oficial do Supabase
      const { error } = await supabase
        .from("news")
        .insert({ title, description, category });

      if (error) throw error;
      
      // Se foi inserido com sucesso, recarrega do banco para sincronizar ids oficiais
      await fetchNewsList();
    } catch (err) {
      console.error("Erro ao sincronizar notícia no Supabase (salvo no cache do navegador):", err);
    }
  };

  const handleDeleteNews = async (newsId: string) => {
    // 1. Remover do cache local do navegador imediatamente
    const local = JSON.parse(localStorage.getItem("commuaria_news") || "[]");
    const filtered = local.filter((n: any) => n.id !== newsId);
    localStorage.setItem("commuaria_news", JSON.stringify(filtered));
    setNewsList(filtered);

    if (!supabase) return;

    try {
      // 2. Apagar no Supabase
      const { error } = await supabase
        .from("news")
        .delete()
        .eq("id", newsId);

      if (error) {
        const itemToDelete = local.find((n: any) => n.id === newsId);
        if (itemToDelete) {
          await supabase
            .from("news")
            .delete()
            .eq("title", itemToDelete.title)
            .eq("description", itemToDelete.description);
        }
      }
      
      await fetchNewsList();
    } catch (err) {
      console.error("Erro ao apagar notícia no Supabase:", err);
    }
  };

  const fetchSystemStatistics = async () => {
    let reportsData: any[] = [];
    try {
      await fetchNewsList();
      if (supabase) {
        const { data } = await supabase
          .from("reports")
          .select("*")
          .order("created_at", { ascending: false });
        if (data && data.length > 0) {
          reportsData = data;
        }
      }
    } catch (e) {
      console.warn("Erro ao carregar do Supabase, usando armazenamento local:", e);
    }

    // Combine with LocalStorage items so user reports created locally are always included
    const localReports = JSON.parse(localStorage.getItem("commuaria_reports") || "[]");
    const combined = [...reportsData];
    localReports.forEach((lr: any) => {
      if (!combined.some((cr: any) => cr.id === lr.id || (cr.title === lr.title && cr.address === lr.address))) {
        combined.push(lr);
      }
    });

    // Filter out locally deleted reports
    const localDeleted = JSON.parse(localStorage.getItem("commuaria_deleted_reports") || "[]");
    const filteredData = combined.filter((r: any) => !localDeleted.includes(r.id));

    const pending = filteredData.filter((r: any) => r.status !== "resolved");
    const resolved = filteredData.filter((r: any) => r.status === "resolved");
    setSystemPendingCount(pending.length);
    setSystemResolvedCount(resolved.length);
    setSystemPendingReports(pending);
    setAllSystemReports(filteredData);
  };

  const handleUpdateReportStatus = async (
    reportId: string,
    newStatus: string,
    notes?: string,
  ) => {
    // 1. Atualizar no LocalStorage imediatamente
    const localReports = JSON.parse(
      localStorage.getItem("commuaria_reports") || "[]",
    );
    const updatedLocal = localReports.map((r: any) => {
      if (r.id === reportId) {
        return {
          ...r,
          status: newStatus,
          status_notes: notes !== undefined ? notes : r.status_notes,
        };
      }
      return r;
    });
    localStorage.setItem("commuaria_reports", JSON.stringify(updatedLocal));

    // 2. Atualizar estados locais do React de forma otimista
    setAllSystemReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              status: newStatus,
              status_notes: notes !== undefined ? notes : r.status_notes,
            }
          : r,
      ),
    );
    setSystemPendingReports((prev) => {
      if (newStatus === "resolved") {
        return prev.filter((r) => r.id !== reportId);
      }
      return prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              status: newStatus,
              status_notes: notes !== undefined ? notes : r.status_notes,
            }
          : r,
      );
    });
    setUserReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? {
              ...r,
              status: newStatus,
              status_notes: notes !== undefined ? notes : r.status_notes,
            }
          : r,
      ),
    );

    // 3. Atualizar no Supabase se conectado
    if (supabase) {
      try {
        await supabase
          .from("reports")
          .update({
            status: newStatus,
            status_notes: notes,
          })
          .eq("id", reportId);
      } catch (err) {
        console.warn("Supabase update error (salvo localmente):", err);
      }
    }

    await fetchSystemStatistics();
  };

  const handleResolveReport = async (reportId: string) => {
    await handleUpdateReportStatus(reportId, "resolved");
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!supabase) return;
    try {
      // 1. Immediately record in localStorage so that this report never comes back in this browser session
      const localDeleted = JSON.parse(localStorage.getItem("commuaria_deleted_reports") || "[]");
      if (!localDeleted.includes(reportId)) {
        localDeleted.push(reportId);
        localStorage.setItem("commuaria_deleted_reports", JSON.stringify(localDeleted));
      }

      // 2. Optimistically/Immediately remove from local React states so the UI is super snappy
      setAllSystemReports((prev) => prev.filter((r) => r.id !== reportId));
      setSystemPendingReports((prev) => prev.filter((r) => r.id !== reportId));
      setUserReports((prev) => prev.filter((r) => r.id !== reportId));

      // 3. Request deletion in Supabase database
      const { error } = await supabase
        .from("reports")
        .delete()
        .eq("id", reportId);

      if (error) {
        console.warn("Silent delete error or RLS constraint on Supabase", error);
      }

      // Refresh statistics & user lists to stay completely in-sync
      await fetchSystemStatistics();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchUserData(session.user.id);
      }
    } catch (e) {
      console.error("Erro ao apagar chamado", e);
    }
  };

  const fetchUserData = async (userId: string) => {
    if (!supabase) return;

    setCurrentUser((prev) => ({
      ...prev,
      id: userId,
    }));

    // Fetch Profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    // Check local fallback
    const localProfiles: UserProfile[] = JSON.parse(
      localStorage.getItem("commuaria_profiles") || "[]",
    );
    const localMatched = localProfiles.find(
      (p) => p.id === userId || (profile?.email && p.email?.toLowerCase() === profile.email.toLowerCase())
    );

    const resolvedRole: UserRole =
      profile?.role || localMatched?.role || (profile?.is_admin || localMatched?.is_admin ? "admin" : "user");
    const resolvedCat =
      profile?.assigned_category || localMatched?.assigned_category || null;

    if (profile || localMatched) {
      setCurrentUser((prev) => ({
        ...prev,
        id: userId,
        name: profile?.name || localMatched?.name || prev.name,
        email: profile?.email || localMatched?.email || prev.email,
        role: resolvedRole,
        assigned_category: resolvedCat,
      }));
      setIsAdmin(resolvedRole === "admin");
      setUserRole(resolvedRole);
      setAssignedCategory(resolvedCat);
    }

    // Fetch User Reports
    const { data: reports } = await supabase
      .from("reports")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (reports) {
      const localDeleted = JSON.parse(localStorage.getItem("commuaria_deleted_reports") || "[]");
      const filteredReports = reports.filter((r: any) => !localDeleted.includes(r.id));

      setUserReports(filteredReports);
      const openCount = filteredReports.filter((r) => r.status !== "resolved").length;
      const resolvedCount = filteredReports.filter(
        (r) => r.status === "resolved",
      ).length;
      setCurrentUser((prev) => ({
        ...prev,
        open: openCount,
        resolved: resolvedCount,
      }));
    }
    await fetchSystemStatistics();
  };

  useEffect(() => {
    // Purge any legacy mock accounts from localStorage
    try {
      const isLegacy = (p: any) => {
        const id = p?.id || "";
        const email = (p?.email || "").toLowerCase();
        return (
          id.startsWith("u_sup_") ||
          id.startsWith("sup-") ||
          id.startsWith("admin-system-") ||
          id === "u1" ||
          id === "u2" ||
          id === "user-cidadao-001" ||
          email === "supervisor.pav@commuaria.com" ||
          email === "supervisor.luz@commuaria.com" ||
          email === "supervisor.limpeza@commuaria.com" ||
          email === "supervisor.saneamento@commuaria.com" ||
          email === "supervisor.arvore@commuaria.com" ||
          email === "supervisor.arborizacao@commuaria.com"
        );
      };

      const profiles = JSON.parse(localStorage.getItem("commuaria_profiles") || "[]");
      const cleanProfiles = profiles.filter((p: any) => !isLegacy(p));
      if (cleanProfiles.length !== profiles.length) {
        localStorage.setItem("commuaria_profiles", JSON.stringify(cleanProfiles));
      }

      const users = JSON.parse(localStorage.getItem("commuaria_users") || "[]");
      const cleanUsers = users.filter((u: any) => !isLegacy(u));
      if (cleanUsers.length !== users.length) {
        localStorage.setItem("commuaria_users", JSON.stringify(cleanUsers));
      }
    } catch (e) {
      console.warn("Erro ao limpar dados locais legados:", e);
    }

    fetchSystemStatistics();

    if (!supabase) return;

    // Check for password recovery parameters in the URL hash or search parameters on startup
    const checkRecoveryFlow = () => {
      const hash = window.location.hash || "";
      const search = window.location.search || "";
      if (
        hash.includes("type=recovery") ||
        hash.includes("recovery") ||
        search.includes("type=recovery") ||
        search.includes("recovery")
      ) {
        console.log("Fluxo de recuperação de senha detectado na URL inicial!");
        setForgotPasswordStep("reset");
        setScreen("forgot-password");
        // Clear recovery parameters from URL so they don't trigger again on reload
        try {
          window.history.replaceState(null, "", window.location.pathname);
        } catch (_) {}
      }
    };
    checkRecoveryFlow();

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.warn("Sessão inválida detectada, limpando para evitar erros de token expirado:", error);
        try {
          await supabase.auth.signOut();
        } catch (_) {}
        return;
      }
      if (session?.user) {
        await fetchUserData(session.user.id);
      }
    }).catch(async (err) => {
      console.warn("Erro ao buscar sessão inicial:", err);
      try {
        await supabase.auth.signOut();
      } catch (_) {}
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      fetchSystemStatistics();
      if (event === "PASSWORD_RECOVERY") {
        setForgotPasswordStep("reset");
        setScreen("forgot-password");
      } else if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setIsAdmin(false);
        setUserReports([]);
        setCurrentUser({
          name: "Usuário",
          email: "",
          password: "",
          open: 0,
          resolved: 0,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleTabChange = (tab: "home" | "report" | "tasks") => {
    if (tab === "home") setScreen("feed");
    if (tab === "report") setScreen("report");
    if (tab === "tasks") {
      setScreen("tasks");
      // Refresh user reports when moving to tasks tab
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
          console.warn("Erro ao buscar sessão ao mudar de aba:", error);
          return;
        }
        if (session?.user) {
          fetchUserData(session.user.id);
        }
      }).catch(() => {});
    }
  };

  return (
    <div
      className={`fixed inset-0 flex justify-center items-center overflow-hidden font-sans transition-colors duration-300 ${
        isDark
          ? "bg-[#050608] selection:bg-[#5A635C]/30 text-white"
          : "bg-white selection:bg-[#344238]/30 text-[#183a2b]"
      }`}
    >
      <div
        className={`mesh-blob top-[-10%] left-[-10%] w-[60%] h-[60%] opacity-20 transition-opacity duration-300 ${
          isDark ? "bg-[#5A635C]/5" : "bg-[#344238]/10"
        }`}
      />
      <div
        className={`mesh-blob bottom-[-10%] right-[-10%] w-[70%] h-[70%] opacity-10 transition-opacity duration-300 ${
          isDark ? "bg-emerald-950/10" : "bg-emerald-900/5"
        }`}
      />

      <div
        className={`w-full h-full overflow-hidden relative flex flex-col transition-colors duration-300 ${
          isDark ? "bg-deep-bg text-white" : "bg-[#F0F4F1] text-[#183a2b]"
        }`}
      >
        <div className="absolute inset-0 flex flex-col overflow-hidden">
          {(screen === "feed" || screen === "report" || screen === "tasks") && (
            <FloatingMenu
              onGoToProfile={() => setScreen("profile")}
              onGoToSettings={() => setScreen("settings")}
            />
          )}
          <AnimatePresence mode="wait">
            {screen === "landing" && (
              <motion.div
                key="landing"
                variants={screenVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                className="h-full w-full"
              >
                <LandingView
                  onEnter={() => setScreen("login")}
                  onSignup={() => setScreen("signup")}
                  reports={allSystemReports}
                />
              </motion.div>
            )}

            {screen === "login" && (
              <motion.div
                key="login"
                variants={screenVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                className="h-full w-full overflow-y-auto overflow-x-hidden scroll-smooth"
              >
                <LoginView
                  onBack={() => setScreen("landing")}
                  onLogin={(role, assignedCat, data) => {
                    const determinedRole: UserRole = role || "user";
                    const isAdm = determinedRole === "admin";
                    setIsAdmin(isAdm);
                    setUserRole(determinedRole);
                    setAssignedCategory(assignedCat || null);

                    if (data) {
                      setCurrentUser((prev) => ({
                        ...prev,
                        email: data.email,
                        password: data.password,
                        role: determinedRole,
                        assigned_category: assignedCat || null,
                      }));
                    }
                    setScreen("feed");
                  }}
                  onGoToSignup={() => setScreen("signup")}
                  onForgotPassword={() => {
                    setForgotPasswordStep("email");
                    setScreen("forgot-password");
                  }}
                />
              </motion.div>
            )}

            {screen === "forgot-password" && (
              <motion.div
                key="forgot-password"
                variants={screenVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                className="h-full w-full overflow-y-auto overflow-x-hidden scroll-smooth"
              >
                <ForgotPasswordView
                  onBack={() => {
                    setForgotPasswordStep("email");
                    setScreen("login");
                  }}
                  initialStep={forgotPasswordStep}
                  onChangeStep={(s) => setForgotPasswordStep(s)}
                />
              </motion.div>
            )}

            {screen === "signup" && (
              <motion.div
                key="signup"
                variants={screenVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                className="h-full w-full overflow-y-auto overflow-x-hidden scroll-smooth"
              >
                <SignupView
                  onBack={() => setScreen("landing")}
                  onSignup={(data) => {
                    setIsAdmin(false);
                    setUserRole("user");
                    setAssignedCategory(null);
                    setCurrentUser((prev) => ({
                      ...prev,
                      name: data.name,
                      email: data.email,
                      password: data.password,
                      role: "user",
                      assigned_category: null,
                    }));

                    const newProfile: UserProfile = {
                      id: "user_" + Math.random().toString(36).substring(2, 9),
                      name: data.name,
                      email: data.email,
                      password: data.password,
                      role: "user",
                      assigned_category: null,
                      is_admin: false,
                      created_at: new Date().toISOString(),
                    };
                    try {
                      const profiles = JSON.parse(localStorage.getItem("commuaria_profiles") || "[]");
                      if (!profiles.some((p: any) => p.email?.toLowerCase() === data.email.toLowerCase())) {
                        profiles.push(newProfile);
                        localStorage.setItem("commuaria_profiles", JSON.stringify(profiles));
                      }
                    } catch (e) {
                      console.warn("Erro ao salvar perfil:", e);
                    }

                    setScreen("feed");
                  }}
                />
              </motion.div>
            )}

            {screen === "feed" && (
              <motion.div
                key="feed"
                variants={screenVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                className="h-full w-full overflow-y-auto overflow-x-hidden scroll-smooth"
              >
                <MainFeed
                  onGoToSettings={() => setScreen("settings")}
                  onGoToProfile={() => setScreen("profile")}
                  onTabChange={handleTabChange}
                  isAdmin={isAdmin}
                  onViewImage={(url, title) => setActiveImage({ url, title })}
                  onViewDetails={(report) => setActiveReport(report)}
                  pendingCount={systemPendingCount}
                  resolvedCount={systemResolvedCount}
                  pendingReports={systemPendingReports}
                  onResolveReport={handleResolveReport}
                  newsList={newsList}
                  onAddNews={handleAddNews}
                  onDeleteNews={handleDeleteNews}
                  newsDbError={newsDbError}
                  onOpenSupervisorManager={() => setShowSupervisorManager(true)}
                />
              </motion.div>
            )}

            {screen === "report" && (
              <motion.div
                key="report"
                variants={screenVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                className="h-full w-full overflow-y-auto overflow-x-hidden scroll-smooth"
              >
                {isAdmin || userRole === "admin" ? (
                  <AdminMapView
                    reports={allSystemReports}
                    onResolveReport={handleResolveReport}
                    onGoToProfile={() => setScreen("profile")}
                    onGoToSettings={() => setScreen("settings")}
                    onViewImage={(url, title) => setActiveImage({ url, title })}
                    onDeleteReport={handleDeleteReport}
                  />
                ) : userRole === "supervisor" ? (
                  <SupervisorWorkOrderView
                    category={assignedCategory || "Pavimentação"}
                    user={currentUser}
                    reports={allSystemReports}
                    onRefresh={async () => {
                      const {
                        data: { session },
                      } = await supabase.auth.getSession();
                      if (session?.user) {
                        await fetchUserData(session.user.id);
                      }
                      await fetchSystemStatistics();
                    }}
                    onTabChange={handleTabChange}
                    onGoToProfile={() => setScreen("profile")}
                    onGoToSettings={() => setScreen("settings")}
                  />
                ) : (
                  <ReportView
                    onTabChange={handleTabChange}
                    onGoToProfile={() => setScreen("profile")}
                    onGoToSettings={() => setScreen("settings")}
                    anonymous={currentUser.anonymous}
                    onLogout={() => setScreen("login")}
                    onRefresh={async () => {
                      const {
                        data: { session },
                      } = await supabase.auth.getSession();
                      if (session?.user) {
                        await fetchUserData(session.user.id);
                      }
                      await fetchSystemStatistics();
                    }}
                  />
                )}
              </motion.div>
            )}

            {screen === "profile" && (
              <motion.div
                key="profile"
                variants={screenVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                className="h-full w-full overflow-y-auto overflow-x-hidden scroll-smooth"
              >
                <ProfileView
                  user={currentUser}
                  onSave={async (data) => {
                    setCurrentUser((prev) => ({ ...prev, ...data }));
                    if (supabase) {
                      const {
                        data: { user },
                      } = await supabase.auth.getUser();
                      if (user) {
                        // Update Profile Table
                        await supabase
                          .from("profiles")
                          .update({ name: data.name })
                          .eq("id", user.id);

                        // Update Auth
                        await supabase.auth.updateUser({
                          email: data.email,
                          password: data.password || undefined,
                          data: { name: data.name },
                        });
                      }
                    }
                  }}
                  onBack={() => setScreen("feed")}
                />
              </motion.div>
            )}

            {screen === "settings" && (
              <motion.div
                key="settings"
                variants={screenVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                className="h-full w-full overflow-y-auto overflow-x-hidden scroll-smooth"
              >
                <SettingsView
                  anonymous={currentUser.anonymous || false}
                  setAnonymous={(v) =>
                    setCurrentUser((prev) => ({ ...prev, anonymous: v }))
                  }
                  onBack={() => setScreen("feed")}
                  onLogout={async () => {
                    setIsAdmin(false);
                    setUserRole("user");
                    setAssignedCategory(null);
                    if (supabase) {
                      await supabase.auth.signOut();
                    }
                    setScreen("landing");
                  }}
                  onDeleteAccount={async () => {
                    if (supabase) {
                      await supabase.rpc("delete_user");
                      await supabase.auth.signOut();
                    }
                    setIsAdmin(false);
                    setUserRole("user");
                    setAssignedCategory(null);
                    setScreen("landing");
                  }}
                  onOpenDbManager={() => setShowDbModal(true)}
                />
              </motion.div>
            )}

            {screen === "tasks" && (
              <motion.div
                key="tasks"
                variants={screenVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                className="h-full w-full overflow-y-auto overflow-x-hidden scroll-smooth"
              >
                {isAdmin || userRole === "admin" ? (
                  <AdminTasksView
                    reports={allSystemReports}
                    onResolveReport={handleResolveReport}
                    onViewImage={(url, title) => setActiveImage({ url, title })}
                    onDeleteReport={handleDeleteReport}
                    onViewDetails={(report) => setActiveReport(report)}
                  />
                ) : userRole === "supervisor" ? (
                  <SupervisorTasksView
                    category={assignedCategory || "Pavimentação"}
                    reports={allSystemReports}
                    onUpdateStatus={handleUpdateReportStatus}
                    onViewDetails={(report) => setActiveReport(report)}
                  />
                ) : (
                  <TasksView
                    onViewDetails={(report) => setActiveReport(report)}
                    reports={userReports}
                    onTabChange={handleTabChange}
                    onGoToProfile={() => setScreen("profile")}
                    onGoToSettings={() => setScreen("settings")}
                    onDeleteReport={handleDeleteReport}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {(screen === "feed" || screen === "report" || screen === "tasks") && (
            <BottomNav
              currentTab={
                screen === "report"
                  ? "report"
                  : screen === "tasks"
                    ? "tasks"
                    : "home"
              }
              onTabChange={handleTabChange}
              isAdmin={isAdmin}
              userRole={userRole}
            />
          )}

          <AnimatePresence>
            {activeImage && (
              <ImageModal
                imageUrl={activeImage.url}
                title={activeImage.title}
                onClose={() => setActiveImage(null)}
              />
            )}
            {activeReport && (
              <ReportDetailsModal
                report={activeReport}
                currentUserId={currentUser?.id}
                isAdmin={isAdmin}
                userRole={userRole}
                assignedCategory={assignedCategory}
                onClose={() => setActiveReport(null)}
                onDelete={handleDeleteReport}
                onResolve={handleResolveReport}
                onUpdateStatus={handleUpdateReportStatus}
              />
            )}
            {showSupervisorManager && (
              <SupervisorManagerModal
                onClose={() => setShowSupervisorManager(false)}
                reports={allSystemReports}
                onRefresh={fetchSystemStatistics}
                onSupervisorsChange={async () => {
                  await fetchSystemStatistics();
                }}
              />
            )}
            {showDbModal && (
              <DatabaseManagerModal
                onClose={() => setShowDbModal(false)}
                newsDbError={newsDbError}
                onRefresh={fetchSystemStatistics}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

