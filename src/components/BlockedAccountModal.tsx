import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Ban, AlertTriangle, Clock, ShieldAlert, Mail, LogOut, Phone } from "lucide-react";
import { useTheme } from "../ThemeContext";
import { BlockStatusResult } from "../utils/blockUtils";

interface BlockedAccountModalProps {
  isOpen: boolean;
  blockInfo: BlockStatusResult | null;
  userEmail?: string;
  onClose: () => void;
}

export const BlockedAccountModal: React.FC<BlockedAccountModalProps> = ({
  isOpen,
  blockInfo,
  userEmail,
  onClose,
}) => {
  const { isDark } = useTheme();

  if (!isOpen || !blockInfo) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className={`relative w-full max-w-md rounded-[32px] p-6 sm:p-8 shadow-2xl border ${
            isDark
              ? "bg-[#162A2C] border-rose-500/40 text-white"
              : "bg-white border-rose-300 text-[#183a2b]"
          }`}
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/20 text-rose-500 border border-rose-500/30 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/10 animate-bounce">
              <Ban size={36} />
            </div>

            <h3 className="text-xl sm:text-2xl font-bold font-serif text-rose-600 dark:text-rose-400 mb-1">
              {blockInfo.isPermanent ? "Acesso Suspenso Indeterminadamente" : "Conta Temporariamente Bloqueada"}
            </h3>

            <p className={`text-xs font-mono mb-4 ${isDark ? "text-white/60" : "text-[#2d4a3b]/70"}`}>
              {userEmail || "Sua conta"}
            </p>

            {/* Block Details Card */}
            <div
              className={`w-full p-4 rounded-2xl border text-left text-xs space-y-3 mb-6 ${
                isDark ? "bg-rose-950/30 border-rose-500/30 text-rose-200" : "bg-rose-50 border-rose-200 text-rose-900"
              }`}
            >
              <div>
                <span className="font-bold block text-[11px] opacity-75 uppercase font-mono">
                  Motivo da Moderação:
                </span>
                <p className="mt-0.5 font-semibold text-xs leading-relaxed">
                  {blockInfo.reason || "Determinação administrativa por violação das diretrizes comunitárias."}
                </p>
              </div>

              <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between">
                <span className="font-bold text-[11px] opacity-75 font-mono">Duração / Prazo:</span>
                <span className="font-bold font-mono px-2 py-0.5 rounded bg-rose-500/20 text-[11px]">
                  {blockInfo.isPermanent ? "Indeterminado" : blockInfo.formattedUntil}
                </span>
              </div>

              {!blockInfo.isPermanent && blockInfo.remainingText && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-300 font-mono">
                  <Clock size={12} />
                  <span>Tempo restante: <strong>{blockInfo.remainingText}</strong></span>
                </div>
              )}
            </div>

            <p className={`text-xs leading-relaxed mb-6 ${isDark ? "text-white/70" : "text-[#2d4a3b]/80"}`}>
              Caso acredite que isso foi um engano ou deseje solicitar uma reavaliação, entre em contato com a ouvidoria municipal através dos canais oficiais.
            </p>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
            >
              <LogOut size={16} />
              <span>Entendido, Voltar ao Início</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
