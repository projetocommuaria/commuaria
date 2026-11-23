import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { AlertTriangle, FileText, LoaderCircle, Save, X } from "lucide-react";
import { useTheme } from "../ThemeContext";
import { fetchCurrentTerms, type TermsDocument } from "../lib/termsService";

interface AdminTermsModalProps {
  client: any;
  isRealSupabase: boolean;
  onClose: () => void;
  onPublish: (title: string, content: string) => Promise<TermsDocument>;
  onPublished: (document: TermsDocument) => void;
}

export const AdminTermsModal: React.FC<AdminTermsModalProps> = ({
  client,
  isRealSupabase,
  onClose,
  onPublish,
  onPublished,
}) => {
  const { isDark } = useTheme();
  const [currentDocument, setCurrentDocument] = useState<TermsDocument | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCurrent = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const document = await fetchCurrentTerms(client, isRealSupabase);
      setCurrentDocument(document);
      setTitle(document?.title || "Termos de Uso da Commuária");
      setContent(document?.content || "");
    } catch (loadError: any) {
      setError(loadError?.message || "Não foi possível carregar a versão atual dos Termos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCurrent();
    // The modal is bound to the active administrator's session for its lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePublish = async () => {
    setIsPublishing(true);
    setError(null);
    try {
      const published = await onPublish(title, content);
      setCurrentDocument(published);
      onPublished(published);
      onClose();
    } catch (publishError: any) {
      setError(publishError?.message || "Não foi possível publicar os novos Termos.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-terms-title"
    >
      <motion.section
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border shadow-2xl ${
          isDark
            ? "border-white/10 bg-[#162A2C] text-white"
            : "border-black/10 bg-white text-[#183a2b]"
        }`}
      >
        <header className={`flex items-start gap-4 border-b p-5 sm:p-7 ${isDark ? "border-white/10" : "border-black/10"}`}>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
            <FileText size={23} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
              Administração
            </p>
            <h2 id="admin-terms-title" className="mt-1 text-xl font-bold sm:text-2xl">
              Gerenciar Termos de Uso
            </h2>
            <p className={`mt-1 text-xs leading-relaxed ${isDark ? "text-white/60" : "text-[#2d4a3b]/70"}`}>
              Publicar cria uma nova versão. Contas que não são ADM terão que aceitá-la; ADM fica dispensado.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className={`rounded-full p-2 transition ${isDark ? "text-white/60 hover:bg-white/10 hover:text-white" : "text-[#2d4a3b]/70 hover:bg-black/5 hover:text-[#183a2b]"}`}
          >
            <X size={20} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-7">
          {currentDocument && (
            <div className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-3 text-xs ${isDark ? "border-white/10 bg-white/5" : "border-black/10 bg-black/[0.02]"}`}>
              <span className="font-semibold">Versão vigente: {currentDocument.version}</span>
              <span className={isDark ? "text-white/55" : "text-[#2d4a3b]/65"}>
                Publicada em {formatDate(currentDocument.published_at)}
              </span>
            </div>
          )}

          <label className="block space-y-2">
            <span className="text-xs font-bold">Título da versão</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={180}
              disabled={isLoading || isPublishing}
              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-emerald-500 disabled:opacity-60 ${isDark ? "border-white/15 bg-black/20 text-white" : "border-black/15 bg-white text-[#183a2b]"}`}
              placeholder="Termos de Uso da Commuária"
            />
          </label>

          <label className="block space-y-2">
            <span className="flex items-center justify-between gap-2 text-xs font-bold">
              <span>Texto dos Termos</span>
              <span className={`font-normal ${isDark ? "text-white/45" : "text-[#2d4a3b]/55"}`}>
                {content.length.toLocaleString("pt-BR")} / 50.000
              </span>
            </span>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={50000}
              rows={14}
              disabled={isLoading || isPublishing}
              className={`w-full resize-y rounded-xl border px-4 py-3 text-sm leading-relaxed outline-none transition focus:border-emerald-500 disabled:opacity-60 ${isDark ? "border-white/15 bg-black/20 text-white placeholder:text-white/35" : "border-black/15 bg-white text-[#183a2b] placeholder:text-[#2d4a3b]/45"}`}
              placeholder="Escreva os Termos de Uso. O texto será exibido aos usuários antes da aceitação."
            />
          </label>

          <div className={`flex items-start gap-3 rounded-2xl border p-4 text-xs leading-relaxed ${isDark ? "border-amber-400/20 bg-amber-400/10 text-amber-100/85" : "border-amber-500/20 bg-amber-50 text-amber-900"}`}>
            <AlertTriangle size={17} className="mt-0.5 shrink-0" />
            <p>
              Revise o conteúdo antes de publicar. A publicação é imediata, cria uma nova versão e volta a exigir aceite das contas não ADM.{" "}
              {isRealSupabase
                ? "No modo Supabase, versões e aceites ficam associados à conta e sincronizados entre dispositivos."
                : "No protótipo local, as versões e aceites ficam somente neste navegador."}
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm leading-relaxed text-red-700 dark:text-red-200">
              {error}
              <button
                type="button"
                onClick={() => void loadCurrent()}
                disabled={isLoading || isPublishing}
                className="ml-2 inline-flex items-center gap-1 font-bold underline disabled:opacity-50"
              >
                <LoaderCircle size={13} /> Recarregar
              </button>
            </div>
          )}
        </div>

        <footer className={`flex flex-col-reverse gap-3 border-t p-5 sm:flex-row sm:justify-end sm:p-7 ${isDark ? "border-white/10 bg-black/10" : "border-black/10 bg-black/[0.02]"}`}>
          <button
            type="button"
            onClick={onClose}
            disabled={isPublishing}
            className={`rounded-2xl border px-5 py-3 text-sm font-semibold transition disabled:opacity-50 ${isDark ? "border-white/15 bg-white/5 hover:bg-white/10" : "border-black/10 bg-white hover:bg-black/5"}`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handlePublish()}
            disabled={isLoading || isPublishing || !title.trim() || !content.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isPublishing ? <LoaderCircle size={17} className="animate-spin" /> : <Save size={17} />}
            {isPublishing ? "Publicando…" : "Publicar nova versão"}
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
