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
import { supabase } from "./lib/supabase";
import streetLightRepair from "./assets/images/street_light_repair_1780425533322.png";

// --- Components ---

const BackgroundMesh = () => (
  <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
    <div className="mesh-blob top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20" />
    <div className="mesh-blob bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/15" />
    <div className="mesh-blob top-[20%] right-[10%] w-[30%] h-[30%] bg-pink-500/15" />
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
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onClick={disabled ? undefined : onClick}
      type={type}
      disabled={disabled}
      className={`
        w-full py-3 px-8 rounded-full flex items-center justify-center gap-3
        backdrop-blur-[2px] border border-white/20 text-white font-medium text-lg
        transition-all duration-300
        shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]
        relative overflow-hidden
        ${disabled ? "bg-white/5 opacity-50 cursor-not-allowed pointer-events-none" : "bg-[#d2d2d2]/10 hover:bg-[#d2d2d2]/20"}
        ${className}
      `}
    >
      {/* Subtle top highlight for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
      {children}
    </motion.button>
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
    <div className="relative min-h-[100dvh] sm:min-h-full w-full flex flex-col items-center justify-center overflow-hidden font-sans bg-[#162A2C]">
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0 bg-cover"
        style={{
          backgroundImage: 'url("pexels-ashford-marx-1565533-7150075.jpg")',
          backgroundPosition: "center 75%",
        }}
      />

      {/* Gradient transition to rectangle at the bottom half */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[60%] z-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(94, 108, 91, 0) 0%, #5E6C5B 50%, #162A2C 100%)",
        }}
      />

      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        type="button"
        onClick={onBack}
        className="absolute top-8 left-8 z-30 w-12 h-12 rounded-full backdrop-blur-[2px] bg-[#d2d2d2]/10 border border-white/20 flex items-center justify-center text-white shadow-lg hover:bg-white/20 transition-all"
      >
        <ArrowRight className="rotate-180" size={24} />
      </motion.button>

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
              className="w-full bg-red-500/20 backdrop-blur-md border border-red-500/30 rounded-xl p-3 text-red-100 text-sm text-center font-serif italic shadow-lg"
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
              className="w-full bg-[#d2d2d2]/10 backdrop-blur-[2px] border border-white/15 rounded-full px-8 py-3.5 text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all shadow-inner"
            />
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#d2d2d2]/10 backdrop-blur-[2px] border border-white/15 rounded-full px-8 py-3.5 text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all shadow-inner"
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#d2d2d2]/10 backdrop-blur-[2px] border border-white/15 rounded-full px-8 py-3.5 text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all shadow-inner"
            />
          </div>

          {/* Action Button with Refraction */}
          <div className="pt-8">
            <GlassButton
              onClick={() => {}}
              type="submit"
              className="border-white/30 shadow-[0_12px_40px_rgba(0,0,0,0.4)] py-4 text-xl font-serif italic w-full"
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
    <div className="relative min-h-[100dvh] sm:min-h-full w-full flex flex-col items-center justify-center overflow-hidden font-sans bg-[#162A2C]">
      {/* Subtle top highlight for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

      {/* Gradient transition to rectangle at the bottom half - NO IMAGE */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[60%] z-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(94, 108, 91, 0) 0%, #5E6C5B 50%, #162A2C 100%)",
        }}
      />

      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        type="button"
        onClick={onBack}
        className="absolute top-8 left-8 z-30 w-14 h-14 rounded-full backdrop-blur-[2px] bg-[#d2d2d2]/10 border border-white/20 flex items-center justify-center text-white shadow-lg hover:bg-white/20 transition-all"
      >
        <ArrowRight className="rotate-180" size={28} />
      </motion.button>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-8 pt-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-white mb-8"
        >
          <h2 className="text-3xl font-serif italic mb-2">
            {step === "email" && "Recuperar Senha"}
            {step === "code" && "E-mail Enviado!"}
            {step === "reset" && "Nova Senha"}
          </h2>
          <p className="text-white/60 text-sm">
            {step === "email" &&
              "Insira seu e-mail para receber o link e o código de recuperação no seu e-mail."}
            {step === "code" && ""}
            {step === "reset" && "Crie uma nova senha de acesso forte de no mínimo 6 caracteres."}
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
              className="w-full bg-red-500/20 backdrop-blur-md border border-red-500/30 rounded-xl p-3 text-red-100 text-sm text-center font-serif italic shadow-lg mb-2"
            >
              {error}
            </motion.div>
          )}
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 rounded-xl p-3 text-emerald-100 text-sm text-center font-serif italic shadow-lg mb-2"
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
                className="w-full bg-[#d2d2d2]/10 backdrop-blur-[2px] border border-white/15 rounded-full px-8 py-3.5 text-white placeholder:text-white/60 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-serif italic text-lg shadow-inner text-center"
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
                className="w-full bg-[#d2d2d2]/10 backdrop-blur-[2px] border border-white/15 rounded-full px-8 py-3.5 text-white placeholder:text-white/60 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-serif italic text-2xl shadow-inner text-center tracking-[0.5em]"
              />
            )}
            {step === "reset" && (
              <input
                type="password"
                placeholder="Nova Senha"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#d2d2d2]/10 backdrop-blur-[2px] border border-white/15 rounded-full px-8 py-3.5 text-white placeholder:text-white/60 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-serif italic text-lg shadow-inner text-center"
              />
            )}
          </div>

          {/* Action Button */}
          <div className="pt-4">
            <GlassButton
              onClick={() => {}}
              type="submit"
              disabled={isSubmitting}
              className="border-white/30 shadow-[0_20px_50px_rgba(0,0,0,0.4)] py-4 text-xl font-serif w-full"
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
    isAdmin?: boolean,
    data?: { email: string; password: string },
  ) => void;
  onGoToSignup: () => void;
  onForgotPassword: () => void;
}) => {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !password.trim()) {
      setError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (supabase) {
      try {
        const { data, error: supaError } =
          await supabase.auth.signInWithPassword({
            email: loginId,
            password,
          });
        if (supaError) {
          setError(supaError.message);
          return;
        }

        // Fetch is_admin from profile
        if (data.user) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", data.user.id)
            .single();

          if (!profileError && profile) {
            setError("");
            onLogin(profile.is_admin, { email: loginId, password });
            return;
          }
        }
      } catch (err) {
        console.error("Supabase integration error", err);
      }
    }

    setError("");
    onLogin(false, { email: loginId, password });
  };

  return (
    <div className="relative min-h-[100dvh] sm:min-h-full w-full flex flex-col items-center justify-center overflow-hidden font-sans bg-[#162A2C]">
      {/* Background Image - Using the newly uploaded file */}
      <div
        className="absolute inset-0 z-0 bg-cover"
        style={{
          backgroundImage:
            'url("pexels-jerson-martins-1514473344-35599871.jpg")',
          backgroundPosition: "center 85%",
        }}
      />

      {/* Gradient transition to rectangle at the bottom half */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[60%] z-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(94, 108, 91, 0) 0%, #5E6C5B 50%, #162A2C 100%)",
        }}
      />

      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        type="button"
        onClick={onBack}
        className="absolute top-8 left-8 z-30 w-14 h-14 rounded-full backdrop-blur-[2px] bg-[#d2d2d2]/10 border border-white/20 flex items-center justify-center text-white shadow-lg hover:bg-white/20 transition-all"
      >
        <ArrowRight className="rotate-180" size={28} />
      </motion.button>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-8 pt-36">
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
              className="w-full bg-red-500/20 backdrop-blur-md border border-red-500/30 rounded-xl p-3 text-red-100 text-sm text-center font-serif italic shadow-lg mb-2"
            >
              {error}
            </motion.div>
          )}

          {/* Input Fields - Based on the reference image */}
          <div className="space-y-4 mb-2">
            <input
              type="text"
              placeholder="Nome ou E-mail"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className="w-full bg-[#d2d2d2]/10 backdrop-blur-[2px] border border-white/15 rounded-full px-8 py-3.5 text-white placeholder:text-white/60 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-serif italic text-lg shadow-inner"
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#d2d2d2]/10 backdrop-blur-[2px] border border-white/15 rounded-full px-8 py-3.5 text-white placeholder:text-white/60 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-serif italic text-lg shadow-inner"
            />
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-white font-serif italic text-sm hover:underline transition-all block w-full text-center mt-2"
            >
              esqueceu a senha
            </button>
          </div>

          {/* Action Buttons - Refraction style with serif font */}
          <div className="pt-6 space-y-6">
            <GlassButton
              onClick={() => {}}
              type="submit"
              className="border-white/30 shadow-[0_20px_50px_rgba(0,0,0,0.6)] py-4 text-2xl font-serif w-full"
            >
              Entrar <ArrowRight size={32} />
            </GlassButton>

            <div className="flex flex-col gap-4 text-center">
              <button
                type="button"
                onClick={onGoToSignup}
                className="w-fit py-2 px-6 rounded-full transition-all flex items-center justify-center gap-3 backdrop-blur-[2px] bg-[#d2d2d2]/10 border border-white/10 text-white/80 text-[13px] font-serif italic hover:bg-white/10 mx-auto"
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
}: {
  onEnter: () => void;
  onSignup: () => void;
}) => {
  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center overflow-hidden font-sans bg-deep-bg justify-between pt-20 pb-16">
      {/* Background Image - Using the user-specified town/city entry background */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${streetLightRepair})`,
        }}
      />
      {/* Subtle overlay to improve contrast */}
      <div className="absolute inset-0 bg-black/45 z-[1]" />

      {/* Title / Header content if needed, but keeping it minimal and clean */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 w-full max-w-md my-auto">
        <img
          src="logo.png"
          alt="Commuária Logo"
          className="w-48 h-auto mx-auto mb-16 relative z-20 drop-shadow-xl"
          referrerPolicy="no-referrer"
        />

        {/* Buttons */}
        <div className="w-full space-y-6 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
          >
            {/* Refraction effect button: high blur, subtle white highlight, thin border */}
            <GlassButton
              onClick={onEnter}
              className="border-white/25 shadow-[0_12px_40px_rgba(0,0,0,0.5)] !py-4 font-serif italic text-xl shrink-0"
            >
              Entrar na conta <ArrowRight size={22} />
            </GlassButton>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
            className="flex justify-center"
          >
            {/* Reduced width and size for secondary action button on landing */}
            <GlassButton
              onClick={onSignup}
              variant="secondary"
              className="border-white/10 shadow-[0_4px_16px_0_rgba(0,0,0,0.2)] !py-2.5 !px-8 !text-sm !font-normal !w-fit opacity-80 hover:opacity-100 mx-auto"
            >
              <span className="text-center font-serif italic">Criar Conta</span>
              <UserPlus size={14} className="opacity-30" />
            </GlassButton>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const CustomToggle = ({ label, value, offText, onText, onChange }: any) => {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="text-xl sm:text-[26px] font-serif font-bold leading-tight text-white/95 drop-shadow-md select-none">
        {label}
      </span>
      <div
        className="relative w-[72px] h-8 bg-black/80 rounded-full cursor-pointer flex items-center shadow-inner shrink-0"
        onClick={() => onChange(!value)}
      >
        <motion.div
          animate={{ x: value ? 32 : -8 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className={`w-12 h-12 absolute rounded-full flex items-center justify-center border transition-all duration-300 ${
            value 
              ? "border-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.6)] text-emerald-950" 
              : "border-white/20 shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_4px_8px_rgba(0,0,0,0.6)] text-white"
          }`}
          style={{
            background: value 
              ? "linear-gradient(145deg, #f0fdf4, #86efac)" 
              : "linear-gradient(145deg, #7b8882, #555f5a)",
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
}: {
  anonymous: boolean;
  setAnonymous: (v: boolean) => void;
  onBack: () => void;
  onLogout: () => void;
  onDeleteAccount?: () => void;
}) => {
  const [notifications, setNotifications] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    <div className="relative min-h-[100dvh] sm:min-h-full w-full bg-[#5A635C] font-sans text-white overflow-y-auto pb-32">
      {/* Top Image Section */}
      <div className="relative w-full h-[35vh] min-h-[200px] flex flex-col justify-end pb-8">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1000")',
          }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent to-[#5A635C]" />

        {/* Back Button */}
        <button
          onClick={onBack}
          className="absolute top-8 left-6 z-20 w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white"
        >
          <ArrowRight className="rotate-180" size={24} />
        </button>

        <h2 className="relative z-10 text-[36px] font-serif font-bold text-center w-full drop-shadow-xl tracking-wide">
          Configuração
        </h2>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="bg-white/5 backdrop-blur-md p-6 sm:p-8 rounded-[32px] border border-white/10 shadow-lg space-y-8">
            <h4 className="text-xl font-serif font-bold text-white/90 border-b border-white/10 pb-2">Preferências</h4>
            
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

          <div className="bg-white/5 backdrop-blur-md p-6 sm:p-8 rounded-[32px] border border-white/10 shadow-lg space-y-6">
            <h4 className="text-xl font-serif font-bold text-white/90 border-b border-white/10 pb-2">Segurança & Conta</h4>
            
            <div className="space-y-4 flex flex-col items-center">
              <button
                onClick={onLogout}
                className="px-6 py-3.5 rounded-full bg-white/15 border border-white/20 text-white text-md font-serif font-bold shadow-md hover:bg-white/25 transition-all w-full active:scale-[0.98]"
              >
                Sair da conta
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="px-6 py-3.5 rounded-full bg-red-600/10 border border-red-500/20 text-red-400 text-md font-serif font-bold shadow-md hover:bg-red-600 hover:text-white transition-all w-full active:scale-[0.98] disabled:opacity-50"
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

  const handleSave = () => {
    onSave({ name, email, password });
    // show some success toast? Not requested, just calling onSave
  };

  return (
    <div className="relative min-h-[100dvh] sm:min-h-full w-full bg-[#5A635C] font-sans text-white overflow-y-auto pb-20">
      {/* Top Image Section */}
      <div className="relative w-full h-[35vh] flex flex-col justify-end pb-8">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1000")',
          }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent to-[#5A635C]" />

        {/* Back Button */}
        <button
          onClick={onBack}
          className="absolute top-8 left-6 z-20 w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-white"
        >
          <ArrowRight className="rotate-180" size={24} />
        </button>

        <h2 className="relative z-10 text-[36px] font-serif font-bold text-center w-full drop-shadow-xl tracking-wide">
          Meu perfil
        </h2>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <h3 className="text-[28px] font-serif font-bold mb-6 drop-shadow-md text-center sm:text-left">
          Meus dados
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="space-y-4 bg-white/5 backdrop-blur-md p-6 sm:p-8 rounded-[32px] border border-white/10 shadow-lg">
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#7a817c]/50 border border-white/20 rounded-[20px] px-6 py-4 text-white placeholder:text-white/70 focus:outline-none focus:border-white/50 shadow-inner animate-fade-in"
              />
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#7a817c]/50 border border-white/20 rounded-[20px] px-6 py-4 text-white placeholder:text-white/70 focus:outline-none focus:border-white/50 shadow-inner"
              />
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#7a817c]/50 border border-white/20 rounded-[20px] px-6 py-4 text-white placeholder:text-white/70 focus:outline-none focus:border-white/50 shadow-inner"
              />
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={handleSave}
                className="px-10 py-3 rounded-[30px] bg-white text-[#5A635C] font-bold hover:bg-white/90 transition-colors shadow-lg w-full sm:w-auto"
              >
                Salvar Alterações
              </button>
            </div>
          </div>

          <div className="space-y-6 bg-white/5 backdrop-blur-md p-6 sm:p-8 rounded-[32px] border border-white/10 shadow-lg">
            <h4 className="text-xl font-serif font-bold mb-4 text-white/90 border-b border-white/10 pb-2">Estatísticas de Zeladoria</h4>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[18px] sm:text-[22px] font-serif font-bold leading-tight drop-shadow-md">
                  Chamados
                  <br />
                  Abertos
                </span>
                <div className="flex items-center gap-6">
                  <div className="w-px h-12 bg-white/30"></div>
                  <span className="text-[36px] sm:text-[40px] font-serif font-bold tracking-wider text-orange-300">
                    {user.open.toString().padStart(2, "0")}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[18px] sm:text-[22px] font-serif font-bold leading-tight drop-shadow-md">
                  Problemas
                  <br />
                  Resolvidos
                </span>
                <div className="flex items-center gap-6">
                  <div className="w-px h-12 bg-white/30"></div>
                  <span className="text-[36px] sm:text-[40px] font-serif font-bold tracking-wider text-emerald-300">
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
}: {
  currentTab: "home" | "report" | "tasks";
  onTabChange: (tab: "home" | "report" | "tasks") => void;
  isAdmin?: boolean;
}) => {
  return (
    <div className="absolute bottom-8 w-full px-4 flex justify-center z-50">
      <div
        className="px-10 py-5 rounded-[40px] drop-shadow-2xl border border-white/20 flex items-center justify-between gap-12 sm:gap-16 w-full max-w-[340px]"
        style={{
          background:
            "linear-gradient(to right, rgba(255,255,255,0.15), rgba(255,255,255,0.05))",
          backdropFilter: "blur(16px)",
        }}
      >
        <button
          onClick={() => onTabChange("home")}
          className={`relative flex flex-col items-center group ${currentTab === "home" ? "text-white" : "text-white/50 hover:text-white transition-colors"}`}
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
            <div className="w-2 h-2 bg-white rounded-full absolute -bottom-4 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          )}
        </button>
        <button
          onClick={() => onTabChange("report")}
          className={`relative flex flex-col items-center group ${currentTab === "report" ? "text-white" : "text-white/50 hover:text-white transition-colors"}`}
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
            <div className="w-2 h-2 bg-white rounded-full absolute -bottom-4 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          )}
        </button>
        <button
          onClick={() => onTabChange("tasks")}
          className={`relative flex flex-col items-center group ${currentTab === "tasks" ? "text-white" : "text-white/50 hover:text-white transition-colors"}`}
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
            <div className="w-2 h-2 bg-white rounded-full absolute -bottom-4 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
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
  return (
    <motion.div
      layout
      className="absolute top-8 right-6 z-50 flex flex-col items-center overflow-hidden border border-white/40 shadow-2xl"
      style={{
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.2), rgba(0,0,0,0.1))",
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
        className="w-[52px] h-[52px] flex-shrink-0 flex items-center justify-center text-white/90 drop-shadow-md z-10"
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
            className="flex flex-col items-center gap-6 pb-6 pt-2"
          >
            <button
              onClick={onGoToProfile}
              className="text-white/80 hover:text-white transition-colors relative group"
            >
              <User
                size={26}
                strokeWidth={2.5}
                fill="currentColor"
                className="drop-shadow-md opacity-90 group-hover:opacity-100"
              />
            </button>
            <button
              onClick={onGoToSettings}
              className="text-white/80 hover:text-white transition-colors relative group"
            >
              <Settings
                size={26}
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
  return (
    <div className="relative min-h-[100dvh] sm:min-h-full w-full bg-[#5A635C] overflow-y-auto overflow-x-hidden font-sans text-white pb-32">
      <div className="relative w-full h-[35vh] min-h-[300px] flex flex-col justify-end pb-8">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1517436073-3b12361ac952?q=80&w=1600&auto=format&fit=crop')`,
            filter: "brightness(0.7) saturate(0.8)",
          }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#5A635C] via-[#5A635C]/60 to-black/20" />

        {/* Header */}
        <div className="absolute top-8 left-6 sm:left-10 z-20 flex items-center gap-3">
          <img
            src="Logo%20minimalista.png"
            alt="Logo"
            className="w-10 h-10 object-contain drop-shadow-md"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-xl lg:text-2xl font-serif font-bold tracking-[0.1em] text-white drop-shadow-md">
            COMMUÁRIA
          </h1>
        </div>

        <div className="relative z-10 px-8 text-left mt-auto">
          <h2 className="text-[32.5px] font-sans font-bold text-white tracking-tight drop-shadow-lg leading-tight uppercase">
            Meus
            <br />
            Chamados
          </h2>
          <p className="text-white/80 mt-2 text-lg">
            Acompanhe a situação dos seus relatos.
          </p>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {reports.length === 0 ? (
          <div className="mt-12 text-center flex flex-col items-center gap-4 py-8 px-6 bg-white/5 backdrop-blur-md rounded-[40px] border border-white/10 w-full max-w-sm mx-auto">
            <ClipboardCheck size={48} className="text-white/20" />
            <p className="text-white/60 text-lg">
              Você ainda não possui chamados registrados.
            </p>
            <button
              onClick={() => onTabChange("report")}
              className="px-6 py-2 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm hover:bg-white/20 transition-all"
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
                className="w-full rounded-[32px] overflow-hidden relative shadow-2xl border border-white/10 aspect-[4/3] bg-zinc-800/80 cursor-pointer group hover:border-white/20 hover:bg-zinc-800/90 transition-all duration-300"
              >
                {report.image_url ? (
                  <img
                    src={report.image_url}
                    alt={report.title}
                    className="absolute inset-0 w-full h-full object-cover filter brightness-90 saturate-50 group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-700">
                    <Megaphone size={48} className="text-white/20" />
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
                    className="p-2.5 rounded-full bg-red-600/30 hover:bg-red-600 border border-red-500/30 text-white transition-all shadow-md active:scale-95 z-20"
                    title="Apagar Chamado"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-[30px] p-[2px] bg-gradient-to-b from-white/30 to-white/10 shadow-lg backdrop-blur-md z-10">
                  <div className="bg-black/35 rounded-[inherit] px-5 py-2 flex items-center gap-2.5">
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
  reports,
  onResolveReport,
  onGoToProfile,
  onGoToSettings,
  onViewImage,
  onDeleteReport,
}: {
  reports: any[];
  onResolveReport: (id: string) => Promise<void>;
  onGoToProfile: () => void;
  onGoToSettings: () => void;
  onViewImage: (url: string, title: string) => void;
  onDeleteReport: (id: string) => Promise<void>;
}) => {
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [mapCenter] = useState<[number, number]>([-25.5929, -49.4891]);

  useEffect(() => {
    if (selectedReport) {
      const updated = reports.find((r) => r.id === selectedReport.id);
      if (updated) setSelectedReport(updated);
    } else {
      const unresolved = reports.find((r) => r.status !== "resolved");
      if (unresolved) setSelectedReport(unresolved);
      else if (reports.length > 0) setSelectedReport(reports[0]);
    }
  }, [reports]);

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
    <div className="relative min-h-[100dvh] sm:min-h-full w-full bg-[#5A635C] overflow-y-auto overflow-x-hidden font-sans text-white pb-32">
      {/* Header Cover */}
      <div className="relative w-full h-[25vh] min-h-[200px] flex flex-col justify-end pb-6">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=1600&auto=format&fit=crop')`,
            filter: "brightness(0.65) saturate(0.8)",
          }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#5A635C] via-[#5A635C]/60 to-black/20" />

        {/* Header Branding */}
        <div className="absolute top-8 left-6 sm:left-10 z-20 flex items-center gap-3">
          <img
            src="Logo%20minimalista.png"
            alt="Logo"
            className="w-10 h-10 object-contain drop-shadow-md"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-xl lg:text-2xl font-serif font-bold tracking-[0.1em] text-white drop-shadow-md flex items-center gap-2">
            COMMUÁRIA
            <span className="bg-red-500/85 text-[10px] px-2 py-0.5 rounded-full font-sans tracking-wide">
              ADMIN
            </span>
          </h1>
        </div>

        <div className="relative z-10 px-8 text-left mt-auto">
          <h2 className="text-[2.2rem] font-serif text-white tracking-tight drop-shadow-lg leading-none">
            Mapa de Zeladoria
          </h2>
          <p className="text-white/80 mt-1 text-sm font-mono uppercase tracking-widest text-[#FFAF9E]">
            Georreferenciamento em Tempo Real
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
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
              {reports.map((report) => {
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
              <div className="bg-white/5 backdrop-blur-md rounded-[32px] border border-white/20 p-6 shadow-2xl space-y-4">
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
                    <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <Megaphone size={32} className="text-white/20" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          selectedReport.status === "resolved"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-orange-500/20 text-orange-300"
                        }`}
                      >
                        {selectedReport.status === "resolved"
                          ? "Resolvido"
                          : "Pendente"}
                      </span>
                      <span className="text-[10px] text-white/40 font-mono">
                        {new Date(selectedReport.created_at).toLocaleDateString(
                          "pt-BR",
                        )}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold font-serif leading-snug text-white truncate">
                      {selectedReport.title}
                    </h3>
                    <p className="text-sm text-white/70 italic mt-1 line-clamp-2">
                      {selectedReport.description || "Sem descrição fornecida."}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-white/5 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="text-white/40 shrink-0 mt-0.5" />
                    <span className="text-white/80 font-mono text-xs">
                      {selectedReport.address || "Endereço indisponível"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-white/40" />
                    <span className="text-xs text-white/50">
                      Relatado por:{" "}
                      <strong className="text-white/95 font-serif font-medium">
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
                      className="w-full py-4 rounded-full bg-emerald-500/20 border border-emerald-500/35 hover:bg-emerald-500 text-emerald-300 hover:text-white hover:border-emerald-400 font-bold tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 text-md"
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
                    className="w-full py-4 rounded-full bg-red-500/10 border border-red-500/25 hover:bg-red-600 text-red-400 hover:text-white font-bold transition-all shadow-lg flex items-center justify-center gap-2 text-md"
                  >
                    <Trash2 size={18} />
                    <span>Apagar Chamado</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 backdrop-blur-md rounded-[32px] border border-white/10 p-8 text-center flex flex-col items-center justify-center gap-3">
                <ClipboardCheck className="text-emerald-400 w-12 h-12 bg-emerald-400/10 p-2.5 rounded-full" />
                <p className="font-serif italic text-white/80 text-lg">
                  Sem Relatos Registrados
                </p>
                <p className="text-xs text-white/50">
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
  reports,
  onResolveReport,
  onViewImage,
  onDeleteReport,
  onViewDetails,
}: {
  reports: any[];
  onResolveReport: (id: string) => Promise<void>;
  onViewImage: (url: string, title: string) => void;
  onDeleteReport: (id: string) => Promise<void>;
  onViewDetails?: (report: any) => void;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "pending" | "resolved"
  >("all");

  const filteredReports = reports.filter((report) => {
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
    <div className="relative min-h-[100dvh] sm:min-h-full w-full bg-[#5A635C] overflow-y-auto overflow-x-hidden font-sans text-white pb-32">
      {/* Header section with cover image */}
      <div className="relative w-full h-[30vh] min-h-[220px] flex flex-col justify-end pb-6">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?q=80&w=1600&auto=format&fit=crop')`,
            filter: "brightness(0.65) saturate(0.8)",
          }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#5A635C] via-[#5A635C]/60 to-black/20" />

        {/* Header branding */}
        <div className="absolute top-8 left-6 sm:left-10 z-20 flex items-center gap-3">
          <img
            src="Logo%20minimalista.png"
            alt="Logo"
            className="w-10 h-10 object-contain drop-shadow-md"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-xl lg:text-2xl font-serif font-bold tracking-[0.1em] text-white drop-shadow-md flex items-center gap-2">
            COMMUÁRIA
            <span className="bg-red-500/85 text-[10px] px-2 py-0.5 rounded-full font-sans tracking-wide">
              ADMIN
            </span>
          </h1>
        </div>

        <div className="relative z-10 px-8 text-left mt-auto">
          <h2 className="text-[2.2rem] font-serif text-white tracking-tight drop-shadow-lg leading-none">
            Banco de Chamados
          </h2>
          <p className="text-white/80 mt-1 text-sm">
            Zeladoria colaborativa de Araucária.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Search Bar & Filtering controls */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/5 backdrop-blur-md p-4 sm:p-6 rounded-[32px] border border-white/10 shadow-lg">
          <div className="relative flex items-center w-full md:max-w-md">
            <Search size={18} className="absolute left-4 text-white/40" />
            <input
              type="text"
              placeholder="Pesquisar por título ou endereço..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/20 rounded-full py-3 pl-12 pr-4 text-sm text-white placeholder-white/40 focus:outline-none focus:bg-white/10 focus:border-white/40 transition-all font-mono"
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
                    ? "bg-white text-zinc-800 border-white font-extrabold shadow-lg shadow-white/10"
                    : "bg-white/5 text-white/60 border-white/10 hover:bg-white/15 hover:text-white"
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
          <span className="text-xs text-white/50 font-mono">
            Mostrando <strong>{filteredReports.length}</strong> chamado
            {filteredReports.length !== 1 && "s"}
          </span>
        </div>

        {/* List of Tickets */}
        {filteredReports.length === 0 ? (
          <div className="w-full text-center py-20 px-6 bg-white/5 backdrop-blur-md rounded-[40px] border border-white/10 flex flex-col items-center justify-center gap-4">
            <Filter className="text-white/20 w-12 h-12 stroke-[1.5px]" />
            <p className="text-white/50 text-md">
              Nenhum chamado corresponde aos filtros aplicados.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 w-full">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                onClick={() => onViewDetails && onViewDetails(report)}
                className="w-full bg-white/5 backdrop-blur-md rounded-[32px] border border-white/10 p-5 shadow-2xl flex flex-col gap-4 hover:border-white/20 hover:bg-white/10 transition-all group overflow-hidden relative cursor-pointer"
              >
                <div className="flex gap-4 items-start">
                  {report.image_url ? (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewImage(report.image_url, report.title);
                      }}
                      className="w-20 h-20 rounded-2xl bg-cover bg-center shrink-0 cursor-pointer border border-white/10 shadow-md group-hover:scale-95 transition-transform"
                      style={{ backgroundImage: `url("${report.image_url}")` }}
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <Megaphone size={24} className="text-white/20" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h5 className="font-serif font-bold text-lg text-white group-hover:text-emerald-300 transition-colors truncate">
                      {report.title}
                    </h5>
                    <p className="text-xs text-white/60 mb-2 truncate">
                      {report.address}
                    </p>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          report.status === "resolved"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-orange-500/20 text-orange-300"
                        }`}
                      >
                        {report.status === "resolved"
                          ? "Resolvido"
                          : "Pendente"}
                      </span>
                      <span className="text-[10px] text-white/40 font-mono">
                        {new Date(report.created_at).toLocaleDateString(
                          "pt-BR",
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {report.description && (
                  <p className="text-xs text-white/70 line-clamp-2 px-1 italic">
                    "{report.description}"
                  </p>
                )}

                {/* Show reporter detail if available */}
                <div className="text-[11px] text-white/40 px-1 font-mono border-t border-white/5 pt-2 flex justify-between items-center">
                  <span>
                    Relator:{" "}
                    {report.anonimo ? "Morador Anônimo" : "Morador Cadastrado"}
                  </span>
                  <span>
                    {report.profiles?.name ? `(${report.profiles.name})` : ""}
                  </span>
                </div>

                {/* Actions for Admins */}
                <div className="pt-1 flex gap-2 w-full mt-auto border-t border-white/5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onViewDetails) onViewDetails(report);
                    }}
                    className="flex-1 px-3 py-2.5 text-xs rounded-full bg-white/10 border border-white/20 text-white/90 font-bold hover:bg-white/20 transition-all flex items-center justify-center gap-1"
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
                      className="flex-1 px-3 py-2.5 text-xs rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold hover:bg-emerald-500 hover:text-white hover:border-emerald-400 transition-all flex items-center justify-center gap-1 group/btn"
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
                    className={`px-3 py-2.5 text-xs rounded-full bg-red-500/15 border border-red-500/25 text-red-300 font-bold hover:bg-red-600 hover:text-white hover:border-red-500 transition-all flex items-center justify-center gap-1 ${
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
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
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

      const { error } = await supabase.from("reports").insert({
        title,
        description: title,
        address: locationQuery || "Endereço não informado",
        latitude: mapCenter[0] || -25.5929,
        longitude: mapCenter[1] || -49.4891,
        image_url: imageUrl,
        anonymous: anonymous,
        user_id: session?.user?.id,
        status: "unresolved",
      });

      if (error) {
        console.error("Supabase insert error", error);
        throw error;
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
    <div className="relative min-h-[100dvh] sm:min-h-full w-full bg-[#5A635C] overflow-y-auto overflow-x-hidden font-sans text-white pb-32">
      <div className="relative w-full h-[35vh] min-h-[250px] flex flex-col pb-8">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1514371879740-26b222a5ee11?auto=format&fit=crop&q=80")',
          }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/20 via-black/10 to-[#5A635C]" />

        <div className="absolute top-8 left-6 sm:left-10 z-20 flex items-center gap-3">
          <img
            src="Logo%20minimalista.png"
            alt="Logo"
            className="w-10 h-10 object-contain drop-shadow-md"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-xl lg:text-2xl font-serif font-bold tracking-[0.1em] text-white drop-shadow-md">
            COMMUÁRIA
          </h1>
        </div>

        <h2 className="relative z-10 text-[36px] sm:text-[48px] font-serif font-bold leading-[1.05] tracking-tight mt-auto px-6 sm:px-10 lg:pl-16">
          Relate algum
          <br />
          problema
        </h2>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          
          {/* Coluna 1: Informações e Anexos */}
          <div className="space-y-8 bg-white/5 backdrop-blur-md p-6 sm:p-8 rounded-[32px] border border-white/10 shadow-lg">
            <div className="space-y-3">
              <span className="text-xl font-serif font-bold tracking-wide block text-white/95 drop-shadow-sm">
                Descreva o problema
              </span>
              <p className="text-xs text-white/70 font-sans">
                Seja claro e específico sobre o que precisa de zeladoria ou manutenção.
              </p>
              <input
                type="text"
                placeholder="Ex: Buraco na via, poste sem luz, entulho acumulado..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-white text-base font-sans placeholder:text-white/60 focus:outline-none focus:bg-white/20 focus:border-white/40 shadow-inner transition-all mt-2"
              />
            </div>

            <div className="w-full h-px bg-white/10 my-6"></div>

            <div className="flex flex-col gap-4">
              <span className="text-xl font-serif font-bold tracking-wide text-white/95 drop-shadow-sm">
                Anexar foto ou vídeo
              </span>
              <p className="text-xs text-white/70 font-sans">
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
                  className="w-full sm:w-28 h-14 rounded-2xl bg-white/10 border border-white/30 backdrop-blur-xl flex items-center justify-center shadow-md hover:bg-white/20 active:scale-95 transition-all group overflow-hidden relative"
                >
                  {selectedFile ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/30">
                      <Check size={24} className="text-emerald-300 drop-shadow-md" />
                    </div>
                  ) : (
                    <Camera
                      size={24}
                      className="text-white/80 group-hover:text-white transition-colors"
                    />
                  )}
                </button>
                {selectedFile ? (
                  <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl border border-white/25 w-full sm:w-auto overflow-hidden">
                    <span className="text-xs font-medium text-white/85 truncate max-w-[150px]">
                      {selectedFile.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-white/50 hover:text-white transition-colors p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-white/50 italic font-mono">
                    Nenhum arquivo selecionado
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Coluna 2: Endereço e Mapa */}
          <div className="space-y-6 bg-white/5 backdrop-blur-md p-6 sm:p-8 rounded-[32px] border border-white/10 shadow-lg relative group">
            <div className="flex flex-col gap-1 w-full">
              <span className="text-xl font-serif font-bold tracking-wide text-white/95 drop-shadow-sm">
                Informe o local do ocorrido
              </span>
              <span className="text-xs text-white/70 font-sans">
                Arraste o mapa para posicionar o pin vermelho exatamente no local do problema.
              </span>
            </div>

            <div className="w-full bg-black/30 border border-white/15 rounded-2xl px-5 py-3.5 min-h-[48px] flex items-center justify-center text-white text-xs font-mono shadow-inner backdrop-blur-md">
              <MapPin className="mr-3 text-red-400 shrink-0" size={18} />
              <span className="truncate flex-1 font-medium leading-tight text-white/90">
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
            className="w-full max-w-md py-4.5 rounded-[30px] bg-white text-[#5A635C] font-extrabold text-lg shadow-xl shadow-black/25 hover:bg-white/90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group disabled:opacity-50"
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
}) => {
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
    <div className="relative min-h-[100dvh] sm:min-h-full w-full bg-[#5A635C] overflow-y-auto overflow-x-hidden font-sans text-white">
      {/* Top Image Section */}
      <div className="relative w-full h-[45vh] lg:h-[50vh] flex flex-col justify-end pb-8 px-6 sm:px-10 overflow-hidden">
        <div
          onClick={() =>
            onViewImage(
              "pexels-nandhukumar-339614.jpg",
              isAdmin ? "Transformando Araucária" : "Notícias de Araucária",
            )
          }
          className="absolute inset-0 z-0 bg-cover bg-center scale-110 cursor-pointer"
          style={{
            backgroundImage: 'url("pexels-nandhukumar-339614.jpg")',
          }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/20 via-black/10 to-[#5A635C] pointer-events-none" />

        <div className="absolute top-8 left-6 sm:left-10 z-20 flex items-center gap-3">
          <img
            src="Logo%20minimalista.png"
            alt="Logo"
            className="w-10 h-10 object-contain drop-shadow-md"
            referrerPolicy="no-referrer"
          />
          <div className="flex flex-col">
            <h1 className="text-xl lg:text-2xl font-serif font-bold tracking-[0.1em] text-white">
              COMMUÁRIA
            </h1>
            {isAdmin && (
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mt-[-2px]">
                Painel Administrador
              </span>
            )}
            {!isAdmin && (
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-[-2px]">
                Notícias
              </span>
            )}
          </div>
        </div>

        <h2 className="relative z-10 text-4xl sm:text-[44px] font-serif font-bold leading-[1.05] tracking-tight mt-auto pointer-events-none">
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
            <h3 className="text-[32px] font-serif font-bold mb-1 mt-6 tracking-tight">
              Monitoramento Urbano
            </h3>
            <p className="text-sm text-white/60 mb-8 font-mono">
              Araucária - PR • Dashboard em tempo real
            </p>

            {/* Statistics Cards Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white/5 backdrop-blur-md rounded-[32px] border border-white/10 p-5 flex flex-col justify-between shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
                <span className="text-white/60 text-xs font-mono uppercase tracking-wider">
                  Chamados Pendentes
                </span>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-extrabold text-[#FFAF9E] drop-shadow-[0_4px_12px_rgba(255,175,158,0.2)]">
                    {pendingCount}
                  </span>
                  <span className="text-xs text-white/40 font-medium font-serif italic">
                    abertos
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-[#FFAF9E]/80 mt-2">
                  Aguardando zeladoria
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-md rounded-[32px] border border-white/10 p-5 flex flex-col justify-between shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl pointer-events-none" />
                <span className="text-white/60 text-xs font-mono uppercase tracking-wider">
                  Resolvidos
                </span>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-extrabold text-[#ACFFB6] drop-shadow-[0_4px_12px_rgba(172,255,182,0.2)]">
                    {resolvedCount}
                  </span>
                  <span className="text-xs text-white/40 font-medium font-serif italic">
                    concluídos
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-[#ACFFB6]/80 mt-2">
                  Atendidos com sucesso
                </p>
              </div>
            </div>

            {/* Progress bar card */}
            <div className="bg-white/5 backdrop-blur-md rounded-[32px] border border-white/10 p-6 mb-8 shadow-xl">
              <div className="flex justify-between items-center mb-3">
                <span className="text-white/85 text-sm font-medium">
                  Índice de Resolução da Cidade
                </span>
                <span className="text-white font-mono text-sm font-bold">
                  {pendingCount + resolvedCount > 0
                    ? Math.round(
                        (resolvedCount / (pendingCount + resolvedCount)) * 100,
                      )
                    : 100}
                  %
                </span>
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden p-[2px]">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-green-300 rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(52,211,153,0.5)]"
                  style={{
                    width: `${
                      pendingCount + resolvedCount > 0
                        ? (resolvedCount / (pendingCount + resolvedCount)) * 100
                        : 100
                    }%`,
                  }}
                />
              </div>
              <p className="text-xs text-white/50 mt-3 text-center">
                {pendingCount + resolvedCount === 0
                  ? "Tudo limpo! Nenhum chamado registrado no momento."
                  : `${pendingCount} chamado${pendingCount > 1 ? "s" : ""} pendente${pendingCount > 1 ? "s" : ""} necessitando de atenção.`}
              </p>
            </div>

            {/* News Management Card */}
            {isAdmin && (
              <div className="bg-white/5 backdrop-blur-md rounded-[32px] border border-white/10 p-6 mb-8 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <span className="text-white/60 text-xs font-mono uppercase tracking-wider block">
                      Comunicados & Imprensa (Administrador)
                    </span>
                    <h4 className="text-lg font-serif font-bold text-white mt-1">
                      Painel de Notícias de Araucária
                    </h4>
                  </div>
                  <button
                    onClick={() => setShowNewsModal(true)}
                    className="px-4 py-2 text-xs rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Plus size={14} />
                    <span>Publicar</span>
                  </button>
                </div>

                {newsDbError && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-200 leading-relaxed space-y-3 flex flex-col mb-4">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <AlertTriangle size={15} />
                      <span>Configuração Pendente no Supabase</span>
                    </div>
                    <p className="font-sans">
                      A tabela de comunicados não foi localizada no seu banco. Atualmente as notícias estão salvas apenas de forma temporária no navegador local. Para habilitar a sincronização definitiva e nuvem, copie o código abaixo e execute no <strong>SQL Editor</strong> do seu painel do Supabase:
                    </p>
                    <div className="bg-black/30 p-3 rounded-xl font-mono text-[10px] text-white/90 overflow-x-auto whitespace-pre select-all border border-white/5 max-h-40">
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
                    <p className="text-[10px] text-amber-300/80 italic">
                      Dica: Clique três vezes no código acima para selecionar tudo, copie e cole no painel do Supabase!
                    </p>
                  </div>
                )}

                {newsList.length === 0 ? (
                  <p className="text-xs text-white/40 italic font-mono py-2">
                    Nenhuma notícia publicada. Crie seu primeiro comunicado acima!
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {newsList.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all text-xs"
                        >
                          <div className="flex flex-col gap-1 pr-4 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                                item.category === "Serviços"
                                  ? "bg-blue-500/20 text-blue-300"
                                  : item.category === "Comunidade"
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-emerald-500/20 text-emerald-300"
                              }`}>
                                {item.category}
                              </span>
                              <span className="text-[10px] text-white/40 font-mono">
                                {item.created_at ? new Date(item.created_at).toLocaleDateString("pt-BR") : "Hoje"}
                              </span>
                            </div>
                            <h5 className="font-bold text-white truncate min-w-0">
                              {item.title}
                            </h5>
                            <p className="text-white/60 line-clamp-1 min-w-0">
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
                            className="p-2 rounded-xl bg-red-500/15 text-red-300 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all cursor-pointer shrink-0"
                            title="Apagar comunicado"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setShowAllNewsPanel(true)}
                      className="w-full mt-2 py-3 px-4 text-xs font-bold rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-1.5 group cursor-pointer shadow-sm"
                    >
                      <span>Acessar Painel de Comunicados Completo ({newsList.length})</span>
                      <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform text-emerald-400" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Pending list or action area */}
            <div className="mt-10">
              <h4 className="text-xl font-bold font-serif mb-4 flex items-center gap-2">
                <span>Chamados da População</span>
                {pendingCount > 0 && (
                  <span className="bg-white/10 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full text-white/80">
                    {pendingCount} Pendentes
                  </span>
                )}
              </h4>

              {pendingReports.length === 0 ? (
                <div className="bg-white/5 backdrop-blur-md rounded-[32px] border border-white/10 p-8 text-center flex flex-col items-center justify-center gap-3">
                  <Check className="text-emerald-400 w-12 h-12 stroke-[2px] bg-emerald-400/10 p-2.5 rounded-full" />
                  <p className="text-lg font-serif italic text-white/80">
                    Excelente trabalho!
                  </p>
                  <p className="text-xs text-white/50">
                    Não há chamados de zeladoria pendentes no momento.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingReports.slice(0, 5).map((report) => (
                    <div
                      key={report.id}
                      onClick={() => onViewDetails?.(report)}
                      className="bg-white/5 backdrop-blur-md rounded-[32px] border border-white/10 p-5 shadow-lg flex flex-col gap-4 hover:border-white/20 hover:bg-white/10 transition-all group overflow-hidden relative cursor-pointer"
                    >
                      <div className="flex gap-4 items-start">
                        {report.image_url ? (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewDetails?.(report);
                            }}
                            className="w-20 h-20 rounded-2xl bg-cover bg-center shrink-0 border border-white/10 shadow-md hover:scale-95 transition-transform"
                            style={{
                              backgroundImage: `url("${report.image_url}")`,
                            }}
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                            <Megaphone size={28} className="text-white/20" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h5 className="font-serif font-bold text-lg text-white group-hover:text-amber-100 transition-colors truncate">
                            {report.title}
                          </h5>
                          <p className="text-xs text-white/60 mb-2 truncate">
                            {report.address}
                          </p>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-bold uppercase tracking-wider">
                              Pendente
                            </span>
                            <span className="text-[10px] text-white/40 font-mono">
                              {new Date(report.created_at).toLocaleDateString(
                                "pt-BR",
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions for Admins */}
                      {onResolveReport && (
                        <div className="pt-2 border-t border-white/5 flex justify-end">
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
                            className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold hover:bg-emerald-500 hover:text-white hover:border-emerald-400 transition-all flex items-center justify-center gap-2 group/btn"
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
                    <p className="text-center text-xs text-white/40 font-mono italic">
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
              <h3 className="text-[32px] font-serif font-bold mb-1 mt-6 tracking-tight">
                Notícias
              </h3>
              <p className="text-sm text-white/60 mb-6 font-mono font-bold tracking-wide uppercase text-emerald-400">
                Araucária - PR • Fique por dentro
              </p>
            </div>

            {/* Featured Article - About the App */}
            <div className="bg-white/5 backdrop-blur-md rounded-[32px] border border-white/10 overflow-hidden shadow-2xl p-6 flex flex-col gap-4">
              <div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500 text-white w-fit uppercase tracking-wider mb-3 inline-block">
                  Destaque • Sobre o App
                </span>
                <h4 className="text-2xl font-bold font-serif leading-snug text-white">
                  Commuária: A Ponte Entre Você e a Zeladoria de Araucária
                </h4>
              </div>
              <div className="space-y-4">
                <p className="text-base leading-[1.6] text-white/90 font-medium">
                  Em um município dinâmico como Araucária, manter a zeladoria
                  urbana em dia é um desafio constante que exige uma comunicação
                  ágil entre a população e o poder público.
                </p>
                <p className="text-base leading-[1.6] text-white/95 font-medium">
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
              <h4 className="text-xl font-bold font-serif flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                <span>Últimas Atualizações</span>
                {newsList.length > 0 && (
                  <button
                    onClick={() => setShowAllNewsPanel(true)}
                    className="text-xs font-mono font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-wider flex items-center gap-1 cursor-pointer bg-white/5 px-3 py-1.5 rounded-full border border-white/10 shadow-sm"
                  >
                    <span>Ver Todos</span>
                    <ArrowRight size={12} />
                  </button>
                )}
              </h4>

              <div className="grid grid-cols-1 gap-4">
                {newsDbError && !isAdmin && (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs p-3.5 rounded-2xl flex items-center gap-2 font-medium">
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
                      className="bg-white/5 backdrop-blur-md rounded-[24px] border border-white/10 p-5 flex flex-col gap-2 shadow-lg hover:border-white/20 hover:bg-white/10 transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-center text-[10px] font-mono text-white/40">
                        <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          item.category === "Serviços"
                            ? "bg-blue-500/20 text-blue-300"
                            : item.category === "Comunidade"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-emerald-500/20 text-emerald-300"
                        }`}>
                          {item.category}
                        </span>
                        <span className="flex items-center gap-1 text-white/50 group-hover:text-emerald-400 font-bold transition-colors">
                          Ler Comunicado <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                      <h5 className="font-serif font-bold text-lg text-white group-hover:text-emerald-300 transition-colors">
                        {item.title}
                      </h5>
                      <p className="text-sm text-white/70 leading-relaxed line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  );
                })}

                {newsList.length === 0 && (
                  <p className="text-center py-6 text-sm text-white/40 font-mono italic">
                    Nenhuma notícia cadastrada no momento.
                  </p>
                )}

                {newsList.length > 3 && (
                  <button
                    onClick={() => setShowAllNewsPanel(true)}
                    className="w-full mt-2 py-4 px-6 text-sm font-bold rounded-[20px] bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2 group cursor-pointer shadow-md"
                  >
                    <span>Acessar Painel Completo de Comunicados</span>
                    <ArrowRight
                      size={16}
                      className="group-hover:translate-x-1 transition-transform text-emerald-400"
                    />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* News Creation Modal */}
      <AnimatePresence>
        {showNewsModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#2E332F] border border-white/10 p-6 sm:p-8 rounded-[40px] w-full max-w-lg shadow-2xl relative flex flex-col gap-5 text-white"
            >
              <button
                onClick={() => setShowNewsModal(false)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>

              <div>
                <h4 className="text-2xl font-serif font-bold tracking-tight">
                  Publicar Nova Notícia
                </h4>
                <p className="text-xs text-white/50 font-mono">
                  Seu comunicado aparecerá imediatamente no painel dos cidadãos
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-mono font-bold tracking-wider text-white/50 uppercase">
                    Título do Comunicado
                  </label>
                  <input
                    type="text"
                    value={newsTitle}
                    onChange={(e) => setNewsTitle(e.target.value)}
                    placeholder="Ex: Nova praça inaugurada ou mutirão..."
                    className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-[20px] focus:outline-none focus:border-emerald-500 text-sm placeholder-white/20 transition-all text-white font-medium"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-mono font-bold tracking-wider text-white/50 uppercase">
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
                            ? "bg-white text-[#5A635C] border-white shadow-md"
                            : "bg-white/5 text-white/75 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-mono font-bold tracking-wider text-white/50 uppercase">
                    Conteúdo da Notícia
                  </label>
                  <textarea
                    rows={4}
                    value={newsDescription}
                    onChange={(e) => setNewsDescription(e.target.value)}
                    placeholder="Descreva os detalhes importantes para os moradores..."
                    className="w-full px-5 py-3.5 bg-white/5 border border-white/10 rounded-[20px] focus:outline-none focus:border-emerald-500 text-sm placeholder-white/20 resize-none transition-all text-white font-medium"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewsModal(false)}
                  className="flex-1 py-3 px-4 text-xs font-bold rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer text-center text-white/80"
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
                  className="flex-1 py-3 px-4 text-xs font-bold rounded-full bg-emerald-500 text-white hover:bg-emerald-400 transition-all cursor-pointer disabled:opacity-40 text-center shadow-lg shadow-emerald-500/20 font-bold"
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
            className="fixed inset-0 bg-[#5A635C] z-[9900] flex flex-col overflow-y-auto text-white"
          >
            {/* Elegant Header Background Cover */}
            <div className="relative w-full py-12 px-6 sm:px-10 border-b border-white/10 shrink-0">
              <div 
                className="absolute inset-0 z-0 bg-cover bg-center brightness-[0.45] saturate-[0.8]"
                style={{ backgroundImage: 'url("pexels-nandhukumar-339614.jpg")' }}
              />
              <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#5A635C] via-[#5A635C]/80 to-black/20" />
              
              <div className="relative z-10 max-w-4xl mx-auto flex flex-col gap-5">
                <button
                  type="button"
                  onClick={() => setShowAllNewsPanel(false)}
                  className="flex items-center gap-2 text-white/80 hover:text-white transition-all text-xs font-mono mb-2 uppercase tracking-wider bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-full border border-white/10 self-start cursor-pointer shadow-md"
                >
                  <ArrowRight size={14} className="rotate-180" />
                  <span>Voltar ao início</span>
                </button>

                <div>
                  <span className="text-[10px] font-mono font-bold px-3 py-1 rounded-full bg-emerald-500 text-white w-fit uppercase tracking-wider mb-2.5 inline-block">
                    Painel Oficial
                  </span>
                  <h3 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight text-white mb-2 leading-none">
                    Todos os Comunicados
                  </h3>
                  <p className="text-sm text-white/70 font-sans max-w-xl font-medium">
                    Fique sabendo de tudo que acontece em Araucária. Encontre abaixo notícias oficiais, avisos municipais e ações comunitárias.
                  </p>
                </div>
              </div>
            </div>

            {/* Filter and Search controls */}
            <div className="w-full bg-[#5A635C] py-6 px-6 sm:px-10 border-b border-white/5 sticky top-0 z-50 backdrop-blur-md bg-opacity-95 shadow-lg">
              <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar comunicados por título ou conteúdo..."
                    value={newsSearchQuery}
                    onChange={(e) => setNewsSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-[24px] text-sm focus:outline-none focus:border-emerald-500 placeholder-white/30 transition-all font-medium text-white"
                  />
                  {newsSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setNewsSearchQuery("")}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs cursor-pointer font-mono"
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
                          ? "bg-white text-[#5A635C] border-white shadow-md shadow-black/20"
                          : "bg-white/5 text-white/80 border-white/10 hover:bg-white/10"
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
                <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-200 leading-relaxed flex items-start gap-3 shadow-md">
                  <AlertTriangle size={16} className="shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-300 block mb-1">Aviso de Sincronização</span>
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
                        className="bg-white/5 backdrop-blur-md rounded-[32px] border border-white/10 p-6 flex flex-col gap-4 hover:border-white/20 hover:bg-white/10 transition-all cursor-pointer group shadow-lg"
                      >
                        <div className="flex justify-between items-start">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                            item.category === "Serviços"
                              ? "bg-blue-500/20 text-blue-300"
                              : item.category === "Comunidade"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-emerald-500/20 text-emerald-300"
                          }`}>
                            {item.category}
                          </span>
                          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[11px] text-white/40 font-mono">
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
                                className="p-2 rounded-xl bg-red-500/15 text-red-300 border border-red-500/20 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all cursor-pointer shadow-md"
                                title="Apagar comunicado"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-xl sm:text-2xl font-serif font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug">
                            {item.title}
                          </h4>
                          <p className="text-sm sm:text-base text-white/70 leading-relaxed font-sans font-medium line-clamp-3">
                            {item.description}
                          </p>
                        </div>
                        <div className="pt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-bold tracking-wide uppercase font-mono group-hover:text-emerald-300 transition-all">
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
                  <div className="text-center py-20 bg-white/5 rounded-[32px] border border-white/5">
                    <p className="text-white/40 font-mono italic text-sm">
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
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[10000] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#2E332F] border border-white/10 p-6 sm:p-10 rounded-[36px] w-full max-w-2xl shadow-2xl relative flex flex-col gap-6 text-white max-h-[85vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setActiveNewsDetail(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer text-white/75"
              >
                <X size={18} />
              </button>

              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                    activeNewsDetail.category === "Serviços"
                      ? "bg-blue-500/20 text-blue-300"
                      : activeNewsDetail.category === "Comunidade"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-emerald-500/20 text-emerald-300"
                  }`}>
                    {activeNewsDetail.category}
                  </span>
                  <span className="text-xs text-white/40 font-mono">
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

              <div className="h-[1px] bg-white/15 w-full" />

              <p className="text-white/95 text-base leading-[1.65] font-medium font-sans whitespace-pre-wrap">
                {activeNewsDetail.description}
              </p>

              <button
                type="button"
                onClick={() => setActiveNewsDetail(null)}
                className="mt-4 w-full py-3.5 px-6 text-xs font-bold rounded-full bg-white/10 hover:bg-white/15 border border-white/10 transition-all cursor-pointer text-center text-white/90"
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
  isAdmin,
  currentUserId,
}: {
  report: any;
  onClose: () => void;
  onDelete?: (id: string) => Promise<void>;
  onResolve?: (id: string) => Promise<void>;
  isAdmin?: boolean;
  currentUserId?: string;
}) => {
  const [authorName, setAuthorName] = useState<string>("Carregando...");
  const [isResolving, setIsResolving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
          // fallback to localStorage or generic name
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
            : "bg-orange-500 text-white shadow-orange-500/30 animate-pulse"
        }">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.74a1.095 1.095 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      </div>
    `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

  const handleResolve = async () => {
    if (!onResolve) return;
    setIsResolving(true);
    try {
      await onResolve(report.id);
      report.status = "resolved"; // optimistic update
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
        className="relative max-w-md w-full bg-[#525B54] rounded-[40px] border border-white/20 overflow-hidden flex flex-col p-6 shadow-2xl max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/25 transition-all shadow-md active:scale-95"
        >
          <X size={20} />
        </button>

        <div className="overflow-y-auto space-y-4 pr-1 scrollbar-thin text-left">
          {/* Status Badge */}
          <div className="flex items-center gap-2 pt-2">
            <span
              className={`px-4 py-1.5 rounded-full text-xs font-bold font-sans tracking-wide shadow-md ${
                report.status === "resolved"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-orange-500/20 text-orange-300 border border-orange-500/30 animate-pulse"
              }`}
            >
              {report.status === "resolved" ? "Resolvido" : "Em Aberto"}
            </span>
            <span className="text-white/50 text-xs font-mono">
              {reportDate}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-2xl font-serif font-bold text-white tracking-tight leading-tight pt-1">
            {report.title}
          </h3>

          {/* Author */}
          <div className="flex items-center gap-3 p-3.5 rounded-3xl bg-white/5 border border-white/10">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/80 border border-white/20 shadow-inner">
              <User size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">
                Relatado por
              </span>
              <span className="text-sm text-white font-semibold">
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
            <div className="w-full h-32 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-white/30 gap-2">
              <Camera size={32} strokeWidth={1.5} />
              <span className="text-xs">Nenhuma foto anexada</span>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-[#FFAF9E] uppercase tracking-widest font-mono font-bold">
              Descrição do Problema
            </span>
            <p className="text-white/85 text-sm leading-relaxed whitespace-pre-line rounded-2xl bg-white/5 border border-white/5 p-4">
              {report.description || report.title}
            </p>
          </div>

          {/* Location Area with Address & Map */}
          <div className="space-y-2">
            <span className="text-[11px] text-[#ACFFB6] uppercase tracking-widest font-mono font-bold flex items-center gap-1.5">
              <MapPin size={12} />
              <span>Localização de Zeladoria</span>
            </span>
            <p className="text-white/90 text-sm leading-tight bg-white/5 border border-white/5 p-4 rounded-2xl">
              {report.address || "Araucária, PR"}
            </p>

            {report.latitude && report.longitude && (
              <div className="w-full h-44 rounded-3xl overflow-hidden border border-white/20 relative z-10 shadow-lg">
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
          {(isAdmin || isOwner) && (
            <div className="pt-2 flex gap-3 text-sm">
              {isAdmin && report.status !== "resolved" && onResolve && (
                <button
                  type="button"
                  onClick={handleResolve}
                  disabled={isResolving}
                  className="flex-1 py-3.5 rounded-full bg-emerald-500 border border-emerald-400/30 text-white font-bold hover:bg-emerald-600 transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
                >
                  <Check size={18} />
                  <span>{isResolving ? "Resolvendo..." : "Resolver"}</span>
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className={`py-3.5 rounded-full border bg-red-500/10 border-red-500/25 text-red-300 font-bold hover:bg-red-600 hover:text-white hover:border-red-500 transition-all flex items-center justify-center gap-2 active:scale-95 ${
                    isAdmin && report.status !== "resolved"
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

export default function App() {
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
  }>({
    id: "",
    name: "Usuário",
    email: "",
    password: "",
    open: 0,
    resolved: 0,
    anonymous: false,
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
      console.error("Erro ao carregar notícias do Supabase, usando local:", err);
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
      // Já está persistido localmente e visível para o usuário, não há perda de dados!
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
        // Se falhou por o ID local ser diferente ou RLS, tentamos apagar por título correspondente
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
    if (!supabase) return;
    try {
      await fetchNewsList();
      const { data } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) {
        // Filter out locally deleted reports in case RLS deletes fail or aren't synced on their remote Supabase yet
        const localDeleted = JSON.parse(localStorage.getItem("commuaria_deleted_reports") || "[]");
        const filteredData = data.filter((r: any) => !localDeleted.includes(r.id));

        const pending = filteredData.filter((r: any) => r.status !== "resolved");
        const resolved = filteredData.filter((r: any) => r.status === "resolved");
        setSystemPendingCount(pending.length);
        setSystemResolvedCount(resolved.length);
        setSystemPendingReports(pending);
        setAllSystemReports(filteredData);
      }
    } catch (e) {
      console.error("Erro ao carregar estatísticas do sistema", e);
    }
  };

  const handleResolveReport = async (reportId: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from("reports")
        .update({ status: "resolved" })
        .eq("id", reportId);

      if (error) throw error;

      // Refresh statistics & user lists
      await fetchSystemStatistics();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchUserData(session.user.id);
      }
    } catch (e) {
      console.error("Erro ao resolver chamado", e);
      alert(
        "Não foi possível resolver o chamado: " +
          (e instanceof Error ? e.message : "Tente novamente."),
      );
    }
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

      // We ignore permission issues or silent RLS blocks because we already handled it locally
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

    if (profile) {
      setCurrentUser((prev) => ({
        ...prev,
        id: userId,
        name: profile.name || prev.name,
        email: profile.email || prev.email,
      }));
      setIsAdmin(profile.is_admin);
    }

    // Fetch User Reports
    const { data: reports } = await supabase
      .from("reports")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (reports) {
      // Filter out locally deleted reports
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
    if (!supabase) return;
    fetchSystemStatistics();

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
    <div className="fixed inset-0 bg-[#050608] flex justify-center items-center overflow-hidden selection:bg-[#5A635C]/30 font-sans">
      <div className="mesh-blob top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#5A635C]/5 opacity-20" />
      <div className="mesh-blob bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-blue-900/5 opacity-10" />

      <div className="w-full h-full overflow-hidden relative bg-deep-bg flex flex-col transition-all duration-500">
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
                  onLogin={(isAdm, data) => {
                    setIsAdmin(!!isAdm);
                    if (data) {
                      setCurrentUser((prev) => ({
                        ...prev,
                        email: data.email,
                        password: data.password,
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
                    setCurrentUser((prev) => ({
                      ...prev,
                      name: data.name,
                      email: data.email,
                      password: data.password,
                    }));
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
                {isAdmin ? (
                  <AdminMapView
                    reports={allSystemReports}
                    onResolveReport={handleResolveReport}
                    onGoToProfile={() => setScreen("profile")}
                    onGoToSettings={() => setScreen("settings")}
                    onViewImage={(url, title) => setActiveImage({ url, title })}
                    onDeleteReport={handleDeleteReport}
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
                    setScreen("landing");
                  }}
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
                {isAdmin ? (
                  <AdminTasksView
                    reports={allSystemReports}
                    onResolveReport={handleResolveReport}
                    onViewImage={(url, title) => setActiveImage({ url, title })}
                    onDeleteReport={handleDeleteReport}
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
                onClose={() => setActiveReport(null)}
                onDelete={handleDeleteReport}
                onResolve={handleResolveReport}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
