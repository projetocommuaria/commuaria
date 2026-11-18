import React from "react";
import { motion } from "motion/react";
import { Check, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { useTheme } from "../ThemeContext";
import type { TermsDocument } from "../lib/termsService";

interface TermsAcceptanceModalProps {
  document: TermsDocument | null;
  isLoading: boolean;
  error: string | null;
  isAccepting: boolean;
  onAccept: () => void;
  onRetry: () => void;
  onLogout: () => void;
}

export const TermsAcceptanceModal: React.FC<TermsAcceptanceModalProps> = ({
  document,
  isLoading,
  error,
  isAccepting,
  onAccept,
  onRetry,
  onLogout,
}) => {
  const { isDark } = useTheme();

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-acceptance-title"
    >
      <motion.section
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border shadow-2xl ${
          isDark
            ? "border-emerald-300/20 bg-[#162A2C] text-white"
            : "border-emerald-900/15 bg-white text-[#183a2b]"
        }`}
      >
        <header className={`flex items-start gap-4 border-b p-5 sm:p-7 ${isDark ? "border-white/10" : "border-black/10"}`}>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
            <ShieldCheck size={25} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
              Confirmação necessária
            </p>
            <h2 id="terms-acceptance-title" className="mt-1 text-xl font-bold sm:text-2xl">
              {document?.title || "Termos de Uso"}
            </h2>
            {document && (
              <p className={`mt-1 text-xs ${isDark ? "text-white/55" : "text-[#2d4a3b]/65"}`}>
                Versão {document.version} · publicada em {formatDate(document.published_at)}
              </p>
            )}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
          {isLoading && !document ? (
            <div className="flex min-h-40 items-center justify-center gap-3 text-sm opacity-70">
              <RefreshCw size={17} className="animate-spin" />
              <span>Verificando a versão vigente dos Termos…</span>
            </div>
          ) : document ? (
            <div className={`whitespace-pre-wrap break-words text-sm leading-7 ${isDark ? "text-white/85" : "text-[#2d4a3b]"}`}>
              {document.content}
            </div>
          ) : (
            <p className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-800 dark:text-amber-200">
              Não foi possível carregar os Termos vigentes. O acesso continuará bloqueado até que a versão seja verificada.
            </p>
          )}

          {isLoading && document && (
            <p className="mt-4 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
              <RefreshCw size={14} className="animate-spin" />
              Confirmando que esta ainda é a versão vigente…
            </p>
          )}

          {error && (
            <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm leading-relaxed text-red-700 dark:text-red-200">
              {error}
            </div>
          )}
        </div>

        <footer className={`space-y-3 border-t p-5 sm:p-7 ${isDark ? "border-white/10 bg-black/10" : "border-black/10 bg-black/[0.02]"}`}>
          {document && (
            <button
              type="button"
              onClick={onAccept}
              disabled={isAccepting || isLoading || Boolean(error)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isAccepting ? <RefreshCw size={17} className="animate-spin" /> : <Check size={17} />}
              {isAccepting ? "Registrando aceite…" : "Li e aceito os Termos de Uso"}
            </button>
          )}
          {error && (
            <button
              type="button"
              onClick={onRetry}
              disabled={isLoading}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition disabled:opacity-50 ${
                isDark ? "border-white/15 bg-white/5 hover:bg-white/10" : "border-black/10 bg-white hover:bg-black/5"
              }`}
            >
              <RefreshCw size={15} />
              Tentar novamente
            </button>
          )}
          <button
            type="button"
            onClick={onLogout}
            disabled={isAccepting}
            className={`w-full rounded-2xl px-5 py-2.5 text-xs font-semibold transition disabled:opacity-50 ${
              isDark ? "text-white/60 hover:bg-white/5 hover:text-white" : "text-[#2d4a3b]/70 hover:bg-black/5 hover:text-[#183a2b]"
            }`}
          >
            <span className="inline-flex items-center gap-2"><LogOut size={14} /> Sair da conta</span>
          </button>
        </footer>
      </motion.section>
    </div>
  );
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "data indisponível";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}
