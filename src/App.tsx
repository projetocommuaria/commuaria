/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, UserPlus, Users, MessageSquare, MapPin, Calendar, Menu, Bell, Search, LayoutTemplate, Check, Home, Megaphone, ClipboardCheck, User, Settings, Camera, X, Download, Share2, Share } from 'lucide-react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from './lib/supabase';

// --- Components ---

const BackgroundMesh = () => (
  <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
    <div className="mesh-blob top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20" />
    <div className="mesh-blob bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/15" />
    <div className="mesh-blob top-[20%] right-[10%] w-[30%] h-[30%] bg-pink-500/15" />
  </div>
);

const GlassButton = ({ children, onClick, variant = 'primary', className = '', type = 'button' }: { 
  children: React.ReactNode, 
  onClick: () => void, 
  variant?: 'primary' | 'secondary',
  className?: string,
  type?: 'button' | 'submit' | 'reset'
}) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      type={type}
      className={`
        w-full py-3 px-8 rounded-full flex items-center justify-center gap-3
        backdrop-blur-[2px] border border-white/20 text-white font-medium text-lg
        transition-all duration-300
        shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]
        relative overflow-hidden
        bg-[#d2d2d2]/10 hover:bg-[#d2d2d2]/20
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

const SignupView = ({ onBack, onSignup }: { onBack: () => void, onSignup: (data: {name: string, email: string, password: string}) => void }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    setError('');

    if (import.meta.env.VITE_SUPABASE_URL) {
      try {
        const { data, error: supaError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
            }
          }
        });
        if (supaError) {
          setError(supaError.message);
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
          backgroundPosition: 'center 75%'
        }}
      />

      {/* Gradient transition to rectangle at the bottom half */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-[60%] z-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(94, 108, 91, 0) 0%, #5E6C5B 50%, #162A2C 100%)'
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
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="w-full bg-red-500/20 backdrop-blur-md border border-red-500/30 rounded-xl p-3 text-red-100 text-sm text-center font-serif italic shadow-lg">
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

const ForgotPasswordView = ({ onBack }: { onBack: () => void }) => {
  const [step, setStep] = useState<'email' | 'code' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Por favor, insira seu e-mail.');
      return;
    }
    setError('');
    setSuccessMsg('Código enviado para ' + email);
    setTimeout(() => setSuccessMsg(''), 3000);
    setStep('code');
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code !== '123456') {
      setError('Código incorreto. Tente usar "123456".');
      return;
    }
    setError('');
    setSuccessMsg('Código verificado com sucesso!');
    setTimeout(() => setSuccessMsg(''), 3000);
    setStep('reset');
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setError('A nova senha não pode estar vazia.');
      return;
    }
    setError('');
    setSuccessMsg('Senha alterada com sucesso! Redirecionando...');
    setTimeout(() => {
      onBack();
    }, 2000);
  };

  return (
    <div className="relative min-h-[100dvh] sm:min-h-full w-full flex flex-col items-center justify-center overflow-hidden font-sans bg-[#162A2C]">
      {/* Subtle top highlight for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

      {/* Gradient transition to rectangle at the bottom half - NO IMAGE */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-[60%] z-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(94, 108, 91, 0) 0%, #5E6C5B 50%, #162A2C 100%)'
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
            {step === 'email' && 'Recuperar Senha'}
            {step === 'code' && 'Inserir Código'}
            {step === 'reset' && 'Nova Senha'}
          </h2>
          <p className="text-white/60 text-sm">
            {step === 'email' && 'Insira seu e-mail para receber um código de recuperação.'}
            {step === 'code' && `Enviamos um código de 6 dígitos para o seu e-mail.`}
            {step === 'reset' && 'Crie uma nova senha de acesso forte.'}
          </p>
        </motion.div>

        <motion.form 
          key={step}
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full space-y-4"
          onSubmit={
            step === 'email' ? handleEmailSubmit : 
            step === 'code' ? handleCodeSubmit : handleResetSubmit
          }
        >
          {error && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="w-full bg-red-500/20 backdrop-blur-md border border-red-500/30 rounded-xl p-3 text-red-100 text-sm text-center font-serif italic shadow-lg mb-2">
              {error}
            </motion.div>
          )}
          {successMsg && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="w-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 rounded-xl p-3 text-emerald-100 text-sm text-center font-serif italic shadow-lg mb-2">
              {successMsg}
            </motion.div>
          )}

          {/* Dynamic Inputs Based on Step */}
          <div className="space-y-4 mb-2">
            {step === 'email' && (
              <input 
                type="email" 
                placeholder="E-mail cadastrado" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#d2d2d2]/10 backdrop-blur-[2px] border border-white/15 rounded-full px-8 py-3.5 text-white placeholder:text-white/60 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-serif italic text-lg shadow-inner text-center"
              />
            )}
            {step === 'code' && (
              <input 
                type="text" 
                placeholder="Código (ex: 123456)" 
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full bg-[#d2d2d2]/10 backdrop-blur-[2px] border border-white/15 rounded-full px-8 py-3.5 text-white placeholder:text-white/60 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-serif italic text-2xl shadow-inner text-center tracking-[0.5em]"
              />
            )}
            {step === 'reset' && (
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
              className="border-white/30 shadow-[0_20px_50px_rgba(0,0,0,0.4)] py-4 text-xl font-serif w-full"
            >
              {step === 'email' && 'Enviar Código '}
              {step === 'code' && 'Verificar '}
              {step === 'reset' && 'Alterar Senha '}
              {step !== 'reset' && <ArrowRight size={24} className="ml-2 inline-block"/>}
              {step === 'reset' && <Check size={24} className="ml-2 inline-block"/>}
            </GlassButton>
          </div>
        </motion.form>
      </div>
    </div>
  );
};

const LoginView = ({ onBack, onLogin, onGoToSignup, onForgotPassword }: { onBack: () => void, onLogin: (isAdmin?: boolean, data?: {email: string, password: string}) => void, onGoToSignup: () => void, onForgotPassword: () => void }) => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (import.meta.env.VITE_SUPABASE_URL) {
      try {
        const { data, error: supaError } = await supabase.auth.signInWithPassword({
          email: loginId,
          password
        });
        if (supaError) {
          setError(supaError.message);
          return;
        }

        // Fetch is_admin from profile
        if (data.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', data.user.id)
            .single();
          
          if (!profileError && profile) {
            setError('');
            onLogin(profile.is_admin, { email: loginId, password });
            return;
          }
        }
      } catch (err) {
        console.error("Supabase integration error", err);
      }
    }

    setError('');
    onLogin(false, { email: loginId, password });
  };

  return (
    <div className="relative min-h-[100dvh] sm:min-h-full w-full flex flex-col items-center justify-center overflow-hidden font-sans bg-[#162A2C]">
      {/* Background Image - Using the newly uploaded file */}
      <div 
        className="absolute inset-0 z-0 bg-cover"
        style={{ 
          backgroundImage: 'url("pexels-jerson-martins-1514473344-35599871.jpg")',
          backgroundPosition: 'center 85%'
        }}
      />

      {/* Gradient transition to rectangle at the bottom half */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-[60%] z-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(94, 108, 91, 0) 0%, #5E6C5B 50%, #162A2C 100%)'
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
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="w-full bg-red-500/20 backdrop-blur-md border border-red-500/30 rounded-xl p-3 text-red-100 text-sm text-center font-serif italic shadow-lg mb-2">
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
            <button type="button" onClick={onForgotPassword} className="text-white font-serif italic text-sm hover:underline transition-all block w-full text-center mt-2">
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

const LandingView = ({ onEnter, onSignup }: { onEnter: () => void, onSignup: () => void }) => {
  return (
    <div className="relative min-h-[100dvh] sm:min-h-full w-full flex flex-col items-center justify-center overflow-hidden font-sans bg-deep-bg">
      {/* Background Image - Using the uploaded local file */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ 
          backgroundImage: 'url("fundo%20tela%20de%20inicio.png")',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 w-full max-w-md">
        {/* Logo image - using the uploaded local file */}
        <img 
          src="logo.png" 
          alt="Commuária Logo" 
          className="w-48 h-auto mx-auto mb-12 relative z-20"
          referrerPolicy="no-referrer"
        />

        {/* Buttons */}
        <div className="w-full space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
          >
            {/* Refraction effect button: high blur, subtle white highlight, thin border */}
            <GlassButton 
              onClick={onEnter} 
              className="border-white/25 shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
            >
              Entrar <ArrowRight size={20} />
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
              <span className="text-center">Criar Conta</span>
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
    <div className="flex items-center justify-between">
      <span className="text-[26px] font-serif font-bold leading-tight drop-shadow-md">{label}</span>
      <div 
         className="relative w-[72px] h-8 bg-black/80 rounded-full cursor-pointer flex items-center shadow-inner"
         onClick={() => onChange(!value)}
      >
         <motion.div 
           initial={false}
           animate={{ x: value ? 32 : -8 }}
           className="w-12 h-12 absolute rounded-full flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_4px_8px_rgba(0,0,0,0.6)] border border-white/20"
           style={{ 
             background: 'linear-gradient(145deg, #7b8882, #555f5a)',
           }}
         >
           <span className="text-[10px] font-bold text-white drop-shadow-md tracking-wider">
             {value ? onText : offText}
           </span>
         </motion.div>
      </div>
    </div>
  )
}

const SettingsView = ({ anonymous, setAnonymous, onBack, onLogout, onDeleteAccount }: { anonymous: boolean, setAnonymous: (v: boolean) => void, onBack: () => void, onLogout: () => void, onDeleteAccount?: () => void }) => {
  const [notifications, setNotifications] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (window.confirm("Certeza que deseja excluir sua conta? Esta ação é irreversível.")) {
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
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1000")' }}
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

      <div className="px-10 pt-10 space-y-14 max-w-sm mx-auto">
        {/* Toggles */}
        <CustomToggle 
          label="Notificação" 
          value={notifications} 
          offText="OFF" 
          onText="ON" 
          onChange={setNotifications} 
        />
        
        <CustomToggle 
          label={<>Relato<br/>Anônimo</>} 
          value={anonymous} 
          offText="OFF" 
          onText="ON" 
          onChange={setAnonymous} 
        />

        <div className="pt-20 space-y-8 flex flex-col items-center">
            {/* Added Log Out button based on user request */}
            <button 
              onClick={onLogout}
              className="px-12 py-4 rounded-[40px] bg-white/20 border border-white/20 text-white text-[22px] font-serif font-bold shadow-xl backdrop-blur-md w-full active:scale-95 transition-transform"
            >
              Sair da conta
            </button>
            <button 
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="px-12 py-4 rounded-[40px] bg-[#6c766e]/40 border border-white/10 text-[#a32a2a] text-[22px] font-serif font-bold shadow-xl backdrop-blur-md w-full active:scale-95 transition-transform disabled:opacity-50">
              {isDeleting ? "Excluindo..." : "Excluir conta"}
            </button>
        </div>
      </div>
    </div>
  );
};

const ProfileView = ({ 
  user,
  onSave,
  onBack 
}: { 
  user: { name: string; email: string; password?: string, resolved: number, open: number },
  onSave: (data: any) => void,
  onBack: () => void 
}) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState(user.password || '');

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
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1000")' }}
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

      <div className="px-10 pt-6 space-y-6 max-w-sm mx-auto">
        <h3 className="text-[28px] font-serif font-bold mb-6 drop-shadow-md">Meus dados</h3>
        
        <div className="space-y-4">
          <input 
            type="text" 
            placeholder="Nome"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-[#7a817c]/50 border border-white/20 rounded-[20px] px-6 py-4 text-white placeholder:text-white/70 focus:outline-none focus:border-white/50 shadow-inner"
          />
          <input 
            type="email" 
            placeholder="E-mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-[#7a817c]/50 border border-white/20 rounded-[20px] px-6 py-4 text-white placeholder:text-white/70 focus:outline-none focus:border-white/50 shadow-inner"
          />
          <input 
             type="password" 
             placeholder="Senha"
             value={password}
             onChange={e => setPassword(e.target.value)}
             className="w-full bg-[#7a817c]/50 border border-white/20 rounded-[20px] px-6 py-4 text-white placeholder:text-white/70 focus:outline-none focus:border-white/50 shadow-inner"
          />
        </div>

        <div className="flex justify-center pt-2">
          <button onClick={handleSave} className="px-10 py-3 rounded-[30px] bg-[#7a817c]/50 border border-white/20 text-white font-medium hover:bg-white/20 transition-colors shadow-lg">
            Salvar
          </button>
        </div>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent my-10"></div>

        <div className="space-y-8 pb-10">
          <div className="flex items-center justify-between">
            <span className="text-[22px] font-serif font-bold leading-tight drop-shadow-md w-32">Chamados<br/>Abertos</span>
            <div className="flex items-center gap-6">
               <div className="w-px h-12 bg-white/50"></div>
               <span className="text-[40px] font-serif font-bold tracking-wider">{user.open.toString().padStart(2, '0')}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[22px] font-serif font-bold leading-tight drop-shadow-md w-32">Problemas<br/>Resolvidos</span>
            <div className="flex items-center gap-6">
               <div className="w-px h-12 bg-white/50"></div>
               <span className="text-[40px] font-serif font-bold tracking-wider">{user.resolved.toString().padStart(2, '0')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BottomNav = ({ currentTab, onTabChange }: { currentTab: 'home' | 'report' | 'tasks', onTabChange: (tab: 'home' | 'report' | 'tasks') => void }) => {
  return (
    <div className="fixed bottom-8 w-full px-4 sm:px-0 sm:w-auto sm:left-1/2 sm:-translate-x-1/2 z-50 flex justify-center">
      <div className="px-10 py-5 rounded-[40px] drop-shadow-2xl border border-white/20 flex items-center justify-between gap-16 min-w-[320px]"
        style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.15), rgba(255,255,255,0.05))', backdropFilter: 'blur(16px)' }}
      >
        <button onClick={() => onTabChange('home')} className={`relative flex flex-col items-center group ${currentTab === 'home' ? 'text-white' : 'text-white/50 hover:text-white transition-colors'}`}>
          <Home fill={currentTab === 'home' ? "currentColor" : "none"} size={32} strokeWidth={1.5} className={(currentTab !== 'home') ? "group-hover:scale-110 transition-transform" : ""} />
          {currentTab === 'home' && <div className="w-2 h-2 bg-white rounded-full absolute -bottom-4 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />}
        </button>
        <button onClick={() => onTabChange('report')} className={`relative flex flex-col items-center group ${currentTab === 'report' ? 'text-white' : 'text-white/50 hover:text-white transition-colors'}`}>
          <Megaphone fill={currentTab === 'report' ? "currentColor" : "none"} size={32} strokeWidth={1.5} className={(currentTab !== 'report') ? "group-hover:scale-110 transition-transform" : ""} />
          {currentTab === 'report' && <div className="w-2 h-2 bg-white rounded-full absolute -bottom-4 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />}
        </button>
        <button onClick={() => onTabChange('tasks')} className={`relative flex flex-col items-center group ${currentTab === 'tasks' ? 'text-white' : 'text-white/50 hover:text-white transition-colors'}`}>
          <ClipboardCheck fill={currentTab === 'tasks' ? "currentColor" : "none"} size={32} strokeWidth={1.5} className={(currentTab !== 'tasks') ? "group-hover:scale-110 transition-transform" : ""} />
          {currentTab === 'tasks' && <div className="w-2 h-2 bg-white rounded-full absolute -bottom-4 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />}
        </button>
      </div>
    </div>
  );
};

const FloatingMenu = ({ onGoToProfile, onGoToSettings }: { onGoToProfile: () => void, onGoToSettings: () => void }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <motion.div 
      layout
      className="fixed top-8 right-6 z-50 flex flex-col items-center overflow-hidden border border-white/40 shadow-2xl"
      style={{ 
        background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(0,0,0,0.1))',
        backdropFilter: 'blur(24px)',
        borderRadius: 40
      }}
      initial={{ height: 52, width: 52 }}
      animate={{ height: menuOpen ? 'auto' : 52, width: 52 }}
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
            <button onClick={onGoToProfile} className="text-white/80 hover:text-white transition-colors relative group">
              <User size={26} strokeWidth={2.5} fill="currentColor" className="drop-shadow-md opacity-90 group-hover:opacity-100" />
            </button>
            <button onClick={onGoToSettings} className="text-white/80 hover:text-white transition-colors relative group">
              <Settings size={26} strokeWidth={2.5} fill="currentColor" className="drop-shadow-md opacity-90 group-hover:opacity-100" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const MapWatcher = ({ onMoveEnd }: { onMoveEnd: (lat: number, lng: number) => void }) => {
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
    if (Math.abs(currentCenter.lat - center[0]) > 0.0001 || Math.abs(currentCenter.lng - center[1]) > 0.0001) {
      map.setView(center, 15, { animate: false });
    }
  }, [center, map]);
  return null;
};

const TasksView = ({ reports, onTabChange, onGoToProfile, onGoToSettings, onViewImage }: { reports: any[], onTabChange: (tab: 'home' | 'report' | 'tasks') => void, onGoToProfile: () => void, onGoToSettings: () => void, onViewImage: (url: string, title: string) => void }) => {
  return (
    <div className="relative min-h-[100dvh] sm:min-h-full w-full bg-[#5A635C] overflow-y-auto overflow-x-hidden font-sans text-white pb-32">
      <div className="relative w-full h-[35vh] min-h-[300px] flex flex-col justify-end pb-8">
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1517436073-3b12361ac952?q=80&w=1600&auto=format&fit=crop')`, filter: 'brightness(0.7) saturate(0.8)' }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#5A635C] via-[#5A635C]/60 to-black/20" />
        
        {/* Header */}
        <div className="absolute top-8 left-6 sm:left-10 z-20 flex items-center gap-3">
          <img src="Logo%20minimalista.png" alt="Logo" className="w-10 h-10 object-contain drop-shadow-md" referrerPolicy="no-referrer" />
          <h1 className="text-xl lg:text-2xl font-serif font-bold tracking-[0.1em] text-white drop-shadow-md">COMMUÁRIA</h1>
        </div>

        <FloatingMenu onGoToProfile={onGoToProfile} onGoToSettings={onGoToSettings} />

        <div className="relative z-10 px-8 text-left mt-auto">
          <h2 className="text-[3rem] font-serif text-white tracking-tight drop-shadow-lg leading-none">Meus<br/>Chamados</h2>
          <p className="text-white/80 mt-2 text-lg">Acompanhe a situação dos seus relatos.</p>
        </div>
      </div>

      <div className="relative z-10 px-6 mt-2 space-y-6 flex flex-col items-center">
        {reports.length === 0 ? (
          <div className="mt-12 text-center flex flex-col items-center gap-4 py-8 px-6 bg-white/5 backdrop-blur-md rounded-[40px] border border-white/10 w-full max-w-sm">
            <ClipboardCheck size={48} className="text-white/20" />
            <p className="text-white/60 font-serif italic text-lg">Você ainda não possui chamados registrados.</p>
            <button 
              onClick={() => onTabChange('report')}
              className="px-6 py-2 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm hover:bg-white/20 transition-all"
            >
              Fazer meu primeiro relato
            </button>
          </div>
        ) : (
          reports.map((report) => (
            <div 
              key={report.id}
              onClick={() => report.image_url && onViewImage(report.image_url, report.title)}
              className="w-full max-w-sm rounded-[40px] overflow-hidden relative shadow-2xl border border-white/20 aspect-square sm:aspect-[4/3] bg-zinc-800 cursor-pointer group"
            >
              {report.image_url ? (
                <img src={report.image_url} alt={report.title} className="absolute inset-0 w-full h-full object-cover filter brightness-90 saturate-50 group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-700">
                   <Megaphone size={48} className="text-white/20" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
              
              <div className="absolute top-6 left-6 right-6">
                <h4 className="text-white font-serif font-bold text-xl drop-shadow-md truncate">{report.title}</h4>
              </div>

              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-[30px] p-[2px] bg-gradient-to-b from-white/40 to-white/10 shadow-lg backdrop-blur-md">
                <div className="bg-black/20 rounded-[inherit] px-6 py-2 flex items-center gap-3">
                  <span className="text-white font-medium text-xl font-serif tracking-wide whitespace-nowrap">
                    {report.status === 'resolved' ? 'Resolvido' : 'Em Aberto'}
                  </span>
                  {report.status === 'resolved' ? (
                    <Check size={28} className="text-white stroke-[4px]" />
                  ) : (
                    <Calendar size={28} className="text-white stroke-[2px]" />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const ReportView = ({ onTabChange, onGoToProfile, onGoToSettings, onRefresh, anonymous = false }: { onTabChange: (tab: 'home' | 'report' | 'tasks') => void, onGoToProfile: () => void, onGoToSettings: () => void, onRefresh: () => Promise<void>, anonymous?: boolean }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([-25.5929, -49.4891]);
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
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const addressParts = data.display_name.split(', ');
          const shortAddress = addressParts.slice(0, 3).join(', ');
          setLocationQuery(shortAddress);
        } else {
          setLocationQuery('Endereço não encontrado');
        }
      }
    } catch (e) {
      console.error("Geocoding error", e);
      setLocationQuery('Erro ao buscar endereço');
    } finally {
      setIsLoadingAddress(false);
    }
  };

  useEffect(() => {
    handleMapMove(mapCenter[0], mapCenter[1]);
  }, []);

  const handleSendReport = async () => {
    if (!title.trim()) {
      alert('Por favor, descreva o problema.');
      return;
    }

    setIsSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // In a real app, you'd upload the file to Supabase Storage here
      // For this demo, we'll use a placeholder image if one isn't provided or just the description
      const imageUrl = selectedFile ? "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?q=80&w=800" : null;

      const { error } = await supabase
        .from('reports')
        .insert({
          title,
          description: title,
          address: locationQuery || 'Endereço não informado',
          latitude: mapCenter[0] || -25.5929,
          longitude: mapCenter[1] || -49.4891,
          image_url: imageUrl,
          anonymous: anonymous,
          user_id: session?.user?.id,
          status: 'unresolved'
        });

      if (error) {
        console.error("Supabase insert error", error);
        throw error;
      }
      
      // Update local state immediately via refresh function
      await onRefresh();
      
      onTabChange('tasks');
    } catch (err) {
      console.error("Error sending report", err);
      alert('Erro ao enviar relatório: ' + (err instanceof Error ? err.message : 'Tente novamente.'));
    } finally {
      setIsSending(false);
    }
  };

  const handleLocationSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && locationQuery) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery + ', Araucária, PR')}&format=json&limit=1`);
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
      <div className="relative w-full h-[40vh] min-h-[300px] flex flex-col pb-8">
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1514371879740-26b222a5ee11?auto=format&fit=crop&q=80")' }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/20 via-black/10 to-[#5A635C]" />
        
        <div className="absolute top-8 left-6 sm:left-10 z-20 flex items-center gap-3">
          <img src="Logo%20minimalista.png" alt="Logo" className="w-10 h-10 object-contain drop-shadow-md" referrerPolicy="no-referrer" />
          <h1 className="text-xl lg:text-2xl font-serif font-bold tracking-[0.1em] text-white drop-shadow-md">COMMUÁRIA</h1>
        </div>

        <FloatingMenu onGoToProfile={onGoToProfile} onGoToSettings={onGoToSettings} />
        
        <h2 className="relative z-10 text-[40px] sm:text-[48px] font-serif font-bold leading-[1.05] tracking-tight mt-auto px-6 sm:px-10">
          Relate algum<br/>problema
        </h2>
      </div>

      <div className="relative z-10 px-6 sm:px-10 mt-6 flex flex-col gap-10">
        <div className="w-full max-w-lg mx-auto">
          <input 
            type="text" 
            placeholder="Relate seu problema"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white/20 border border-white/40 rounded-[30px] px-8 py-4 text-white text-lg font-serif placeholder:text-white/90 focus:outline-none focus:bg-white/30 shadow-lg backdrop-blur-xl transition-all"
          />
        </div>

        <div className="flex flex-col items-center gap-4">
          <span className="text-xl font-serif font-bold tracking-wide drop-shadow-md">Anexar foto ou vídeo</span>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*,video/*" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-12 rounded-[24px] bg-white/10 border border-white/40 backdrop-blur-xl flex items-center justify-center shadow-lg hover:bg-white/20 transition-all group overflow-hidden relative"
          >
            {selectedFile ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/20">
                <Check size={24} className="text-white drop-shadow-md" />
              </div>
            ) : (
              <Camera size={24} className="text-white/80 group-hover:text-white transition-colors" />
            )}
          </button>
          {selectedFile && (
            <div className="flex items-center gap-2 mt-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/20">
              <span className="text-sm font-medium text-white/80 max-w-[200px] truncate">{selectedFile.name}</span>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setSelectedFile(null); 
                  if(fileInputRef.current) fileInputRef.current.value = ''; 
                }}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto relative group">
          <div className="text-center flex flex-col gap-1 w-full mb-2">
            <span className="text-xl font-serif font-bold tracking-wide drop-shadow-md">Informe o local do ocorrido</span>
            <span className="text-[15px] font-sans text-white/80 drop-shadow-md">Arraste o mapa para selecionar</span>
          </div>

          <div className="w-full bg-white/10 border border-white/20 rounded-[20px] px-6 py-3 min-h-[48px] flex items-center justify-center text-white text-[15px] font-sans shadow-inner backdrop-blur-md transition-all">
            <MapPin className="mr-3 text-white/70 shrink-0" size={20} />
            <span className="truncate flex-1 text-center font-medium leading-tight">
              {isLoadingAddress ? 'Buscando endereço...' : locationQuery || 'Nenhum endereço encontrado'}
            </span>
          </div>

          <div className="w-full h-72 rounded-[40px] overflow-hidden shadow-2xl border border-white/20 bg-white/5 relative z-10 mt-1">
            <MapContainer 
              center={mapCenter} 
              zoom={15} 
              minZoom={12}
              maxBounds={[[-25.8, -49.7], [-25.4, -49.2]]}
              maxBoundsViscosity={1.0}
              zoomControl={false}
              attributionControl={false}
              style={{ height: '100%', width: '100%', filter: 'saturate(0.8) contrast(1.1) brightness(0.9)' }} 
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapWatcher onMoveEnd={handleMapMove} />
              <MapRecenter center={mapCenter} />
            </MapContainer>
            {/* Center Pin overlay */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none drop-shadow-lg flex flex-col items-center z-[1000]">
               <div className="bg-red-500 text-white rounded-full p-2 mb-1 shadow-lg shadow-red-500/20">
                 <MapPin size={24} strokeWidth={2} />
               </div>
               <div className="w-2 h-1 bg-black/40 rounded-[100%] blur-[1px]"></div>
            </div>
            
            <button 
              onClick={() => {
                const btn = document.getElementById('btn-confirm-location');
                if (btn) {
                  btn.innerHTML = '<span class="flex items-center gap-2"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Localização Adicionada</span>';
                  btn.classList.add('bg-green-500/80', 'border-green-400', 'text-white');
                  btn.classList.remove('bg-white/20', 'border-white/30');
                  setTimeout(() => {
                    btn.innerHTML = 'Confirmar Localização';
                    btn.classList.remove('bg-green-500/80', 'border-green-400');
                    btn.classList.add('bg-white/20', 'border-white/30');
                  }, 3000);
                }
              }}
              id="btn-confirm-location"
              className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md border border-white/30 text-white font-medium px-6 py-2 rounded-full shadow-lg hover:bg-white/30 transition-colors z-[1000]"
            >
              Confirmar Localização
            </button>
          </div>
        </div>

        <div className="flex justify-center mt-6 mb-10">
          <button 
            onClick={handleSendReport}
            disabled={isSending}
            className="w-full max-w-sm py-4 rounded-[30px] bg-white text-[#5A635C] font-bold text-lg shadow-xl shadow-black/10 hover:bg-white/90 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {isSending ? 'Enviando...' : 'Enviar problema'}
            {!isSending && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
          </button>
        </div>
      </div>
    </div>
  );
};

const MainFeed = ({ onGoToSettings, onGoToProfile, onTabChange, isAdmin = false, onViewImage }: { onGoToSettings: () => void, onGoToProfile: () => void, onTabChange: (tab: 'home' | 'report' | 'tasks') => void, isAdmin?: boolean, onViewImage: (url: string, title: string) => void }) => {
  return (
    <div className="relative min-h-[100dvh] sm:min-h-full w-full bg-[#5A635C] overflow-y-auto overflow-x-hidden font-sans text-white">
      {/* Top Image Section */}
      <div className="relative w-full h-[45vh] lg:h-[50vh] flex flex-col justify-end pb-8 px-6 sm:px-10 overflow-hidden">
        <div 
          onClick={() => onViewImage('pexels-nandhukumar-339614.jpg', 'Transformando Araucária')}
          className="absolute inset-0 z-0 bg-cover bg-center sm:bg-top scale-125 cursor-pointer"
          style={{ backgroundImage: 'url("pexels-nandhukumar-339614.jpg")' }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/20 via-black/10 to-[#5A635C] pointer-events-none" />
        
        <div className="absolute top-8 left-6 sm:left-10 z-20 flex items-center gap-3">
          <img src="Logo%20minimalista.png" alt="Logo" className="w-10 h-10 object-contain drop-shadow-md" referrerPolicy="no-referrer" />
          <div className="flex flex-col">
            <h1 className="text-xl lg:text-2xl font-serif font-bold tracking-[0.1em] text-white">COMMUÁRIA</h1>
            {isAdmin && <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mt-[-2px]">Painel Administrador</span>}
          </div>
        </div>
        
        <h2 className="relative z-10 text-4xl sm:text-[44px] font-serif font-bold leading-[1.05] tracking-tight mt-auto pointer-events-none">
          Transformando<br/>Araucária
        </h2>
      </div>

      {/* Content Section */}
      <div className="relative z-10 px-6 sm:px-10 pb-40">
        <h3 className="text-[32px] font-extrabold mb-6 mt-4">Sobre</h3>
        <p className="text-lg leading-[1.5] text-white/90 mb-14 max-w-lg font-medium pr-4">
          Em um município dinâmico como Araucária, manter a zeladoria urbana em dia é um desafio constante que exige uma comunicação ágil entre a população e o poder público.
        </p>

        {/* Decorative Image bleeding to right */}
        <div 
          onClick={() => onViewImage('pexels-jerson-martins-1514473344-35599871.jpg', 'Araucária Colaborativa')}
          className="w-[100vw] h-64 bg-cover bg-center rounded-l-[40px] ml-12 mb-12 shadow-2xl relative cursor-pointer group overflow-hidden" 
          style={{ backgroundImage: 'url("pexels-jerson-martins-1514473344-35599871.jpg")' }} 
        >
          {/* Subtle dark overlay for the image to blend better */}
          <div className="absolute inset-0 rounded-l-[40px] bg-black/10 transition-colors group-hover:bg-black/20 mix-blend-overlay"></div>
        </div>

        <p className="text-lg leading-[1.5] text-white/90 text-right ml-6 sm:ml-12 max-w-xl md:ml-auto font-medium mb-12">
          Por isso, nosso projeto surge como um aliado estratégico da gestão municipal. Ao utilizar geolocalização para gerar relatórios automáticos e precisos, o app atua como uma 'ponte digital' que ajuda a prefeitura a mapear demandas com rapidez, permitindo que a manutenção chegue mais cedo onde é necessária e fortalecendo o cuidado com a nossa cidade de forma colaborativa.
        </p>
      </div>

      {/* Fixed Sticky UI Elements */}
      <FloatingMenu onGoToProfile={onGoToProfile} onGoToSettings={onGoToSettings} />
    </div>
  );
};

// --- Image Modal ---

const ImageModal = ({ imageUrl, title, onClose }: { imageUrl: string, title: string, onClose: () => void }) => {
  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `commuaria-${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download falhou', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Commuária - ${title}`,
          text: `Veja este relato: ${title}`,
          url: imageUrl,
        });
      } catch (error) {
        if ((error as any).name !== 'AbortError') {
          console.error('Erro ao compartilhar', error);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(imageUrl);
        alert('Link da imagem copiado!');
      } catch (err) {
        console.error('Erro ao copiar', err);
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
        onClick={e => e.stopPropagation()}
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
          <h3 className="text-xl font-serif font-bold text-white tracking-wide">{title}</h3>
          
          <div className="flex gap-4">
            <button 
              onClick={handleDownload}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 border border-white/20 text-white font-medium hover:bg-white/20 transition-all shadow-lg backdrop-blur-md"
            >
              <Download size={20} />
              <span>Baixar</span>
            </button>
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
  const [screen, setScreen] = useState<'landing' | 'login' | 'signup' | 'forgot-password' | 'settings' | 'profile' | 'feed' | 'report' | 'tasks'>('landing');
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeImage, setActiveImage] = useState<{ url: string, title: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
    password?: string;
    open: number;
    resolved: number;
    anonymous?: boolean;
  }>({
    name: 'Usuário',
    email: '',
    password: '',
    open: 0,
    resolved: 0,
    anonymous: false
  });
  const [userReports, setUserReports] = useState<any[]>([]);

  const fetchUserData = async (userId: string) => {
    if (!supabase) return;

    // Fetch Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profile) {
      setCurrentUser(prev => ({
        ...prev,
        name: profile.name || prev.name,
        email: profile.email || prev.email,
      }));
      setIsAdmin(profile.is_admin);
    }

    // Fetch User Reports
    const { data: reports } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (reports) {
      setUserReports(reports);
      const openCount = reports.filter(r => r.status !== 'resolved').length;
      const resolvedCount = reports.filter(r => r.status === 'resolved').length;
      setCurrentUser(prev => ({
        ...prev,
        open: openCount,
        resolved: resolvedCount
      }));
    }
  };

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await fetchUserData(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setIsAdmin(false);
        setUserReports([]);
        setCurrentUser({
          name: 'Usuário',
          email: '',
          password: '',
          open: 0,
          resolved: 0
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleTabChange = (tab: 'home' | 'report' | 'tasks') => {
    if (tab === 'home') setScreen('feed');
    if (tab === 'report') setScreen('report');
    if (tab === 'tasks') {
      setScreen('tasks');
      // Refresh user reports when moving to tasks tab
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          fetchUserData(session.user.id);
        }
      });
    }
  };

  return (
    <div className="fixed inset-0 sm:bg-zinc-950 flex justify-center sm:items-center overflow-hidden selection:bg-purple-500/30">
      <div className="w-full h-full sm:h-[90vh] sm:max-h-[900px] sm:w-[420px] sm:rounded-[40px] sm:border-8 sm:border-zinc-800 sm:shadow-2xl overflow-hidden relative bg-deep-bg shadow-black/50 flex flex-col">
        <div className="absolute inset-0 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
        {screen === 'landing' && (
          <motion.div
            key="landing"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            <LandingView 
              onEnter={() => setScreen('login')} 
              onSignup={() => setScreen('signup')}
            />
          </motion.div>
        )}

        {screen === 'login' && (
          <motion.div
            key="login"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            <LoginView 
              onBack={() => setScreen('landing')} 
              onLogin={(isAdm, data) => {
                setIsAdmin(!!isAdm);
                if (data) {
                  setCurrentUser(prev => ({ ...prev, email: data.email, password: data.password }));
                }
                setScreen('feed');
              }} 
              onGoToSignup={() => setScreen('signup')}
              onForgotPassword={() => setScreen('forgot-password')}
            />
          </motion.div>
        )}

        {screen === 'forgot-password' && (
          <motion.div
            key="forgot-password"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            <ForgotPasswordView onBack={() => setScreen('login')} />
          </motion.div>
        )}

        {screen === 'signup' && (
          <motion.div
            key="signup"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            <SignupView 
              onBack={() => setScreen('landing')} 
              onSignup={(data) => {
                setCurrentUser(prev => ({ ...prev, name: data.name, email: data.email, password: data.password }));
                setScreen('feed');
              }} 
            />
          </motion.div>
        )}

        {screen === 'feed' && (
          <motion.div
            key="feed"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            <MainFeed 
              onGoToSettings={() => setScreen('settings')} 
              onGoToProfile={() => setScreen('profile')} 
              onTabChange={handleTabChange} 
              isAdmin={isAdmin}
              onViewImage={(url, title) => setActiveImage({ url, title })}
            />
          </motion.div>
        )}

        {screen === 'report' && (
          <motion.div
            key="report"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
             <ReportView 
               onTabChange={handleTabChange} 
               onGoToProfile={() => setScreen('profile')} 
               onGoToSettings={() => setScreen('settings')} 
               anonymous={currentUser.anonymous}
               onRefresh={async () => {
                 const { data: { session } } = await supabase.auth.getSession();
                 if (session?.user) {
                   await fetchUserData(session.user.id);
                 }
               }}
             />
          </motion.div>
        )}

        {screen === 'profile' && (
          <motion.div
            key="profile"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
             <ProfileView 
               user={currentUser} 
               onSave={async (data) => {
                 setCurrentUser(prev => ({ ...prev, ...data }));
                 if (supabase) {
                   const { data: { user } } = await supabase.auth.getUser();
                   if (user) {
                     // Update Profile Table
                     await supabase.from('profiles').update({ name: data.name }).eq('id', user.id);
                     
                     // Update Auth
                     await supabase.auth.updateUser({
                       email: data.email,
                       password: data.password || undefined,
                       data: { name: data.name }
                     });
                   }
                 }
               }}
               onBack={() => setScreen('feed')} 
             />
          </motion.div>
        )}

        {screen === 'settings' && (
          <motion.div
            key="settings"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            <SettingsView 
              anonymous={currentUser.anonymous || false}
              setAnonymous={(v) => setCurrentUser(prev => ({ ...prev, anonymous: v }))}
              onBack={() => setScreen('feed')} 
              onLogout={async () => {
                setIsAdmin(false);
                if (supabase) {
                  await supabase.auth.signOut();
                }
                setScreen('landing');
              }} 
              onDeleteAccount={async () => {
                if (supabase) {
                  await supabase.rpc('delete_user');
                  await supabase.auth.signOut();
                }
                setIsAdmin(false);
                setScreen('landing');
              }}
            />
          </motion.div>
        )}

        {screen === 'tasks' && (
          <motion.div
            key="tasks"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
             <TasksView 
               reports={userReports}
               onTabChange={handleTabChange} 
               onGoToProfile={() => setScreen('profile')} 
               onGoToSettings={() => setScreen('settings')}
               onViewImage={(url, title) => setActiveImage({ url, title })}
             />
          </motion.div>
        )}
      </AnimatePresence>

      {(screen === 'feed' || screen === 'report' || screen === 'tasks') && (
        <BottomNav currentTab={screen === 'report' ? 'report' : screen === 'tasks' ? 'tasks' : 'home'} onTabChange={handleTabChange} />
      )}

      <AnimatePresence>
        {activeImage && (
          <ImageModal 
            imageUrl={activeImage.url} 
            title={activeImage.title} 
            onClose={() => setActiveImage(null)} 
          />
        )}
      </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
