import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  X,
  UserCheck,
  Plus,
  Shield,
  Briefcase,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  HardHat,
  Filter,
} from "lucide-react";
import { useTheme } from "../ThemeContext";
import { CATEGORIES_CONFIG, ReportCategory, UserProfile } from "../types";
import { supabase } from "../lib/supabase";

interface SupervisorManagerModalProps {
  onClose: () => void;
  reports?: any[];
  onRefresh?: () => Promise<void>;
  onSupervisorsChange?: () => Promise<void>;
}

export const SupervisorManagerModal: React.FC<SupervisorManagerModalProps> = ({
  onClose,
  reports = [],
  onRefresh,
  onSupervisorsChange,
}) => {
  const { isDark } = useTheme();
  const [supervisors, setSupervisors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("super123");
  const [formCategory, setFormCategory] = useState<ReportCategory>("Pavimentação");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const isLegacyMock = (p: any) => {
    const id = p?.id || "";
    const email = (p?.email || "").toLowerCase();
    const legacyIds = ["u1", "u2", "user-cidadao-001", "admin-system-001", "mock-r1", "mock-r2"];
    const legacyEmails = [
      "supervisor.pav@commuaria.com",
      "supervisor.luz@commuaria.com",
      "supervisor.limpeza@commuaria.com",
      "supervisor.saneamento@commuaria.com",
      "supervisor.arvore@commuaria.com",
      "supervisor.arborizacao@commuaria.com",
    ];
    return legacyIds.includes(id) || legacyEmails.includes(email);
  };

  const loadSupervisors = async () => {
    setLoading(true);
    try {
      let profilesList: any[] = [];
      if (supabase) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "supervisor");
        if (!error && data && data.length > 0) {
          profilesList = data.filter((d: any) => !isLegacyMock(d));
        }
      }

      // Merge with localStorage and purge legacy mocks
      const rawLocalProfiles = JSON.parse(
        localStorage.getItem("commuaria_profiles") || "[]"
      );
      const cleanedLocalProfiles = rawLocalProfiles.filter(
        (p: any) => !isLegacyMock(p)
      );
      if (cleanedLocalProfiles.length !== rawLocalProfiles.length) {
        localStorage.setItem(
          "commuaria_profiles",
          JSON.stringify(cleanedLocalProfiles)
        );
      }

      const rawLocalUsers = JSON.parse(
        localStorage.getItem("commuaria_users") || "[]"
      );
      const cleanedLocalUsers = rawLocalUsers.filter(
        (u: any) => !isLegacyMock(u)
      );
      if (cleanedLocalUsers.length !== rawLocalUsers.length) {
        localStorage.setItem(
          "commuaria_users",
          JSON.stringify(cleanedLocalUsers)
        );
      }

      const localSupervisors = cleanedLocalProfiles.filter(
        (p: any) => p.role === "supervisor"
      );

      const merged = [...profilesList];
      localSupervisors.forEach((ls: any) => {
        if (!merged.some((m: any) => m.id === ls.id || m.email?.toLowerCase() === ls.email?.toLowerCase())) {
          merged.push(ls);
        }
      });

      setSupervisors(merged);
    } catch (err) {
      console.warn("Erro ao carregar supervisores:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSupervisors();
  }, []);

  const generateUUID = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      try {
        return crypto.randomUUID();
      } catch (_) {}
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  const handleCreateSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formName.trim() || !formEmail.trim()) {
      setFormError("Preencha o nome e o e-mail do supervisor.");
      return;
    }

    try {
      const cleanEmail = formEmail.trim().toLowerCase();
      const cleanName = formName.trim();
      const assignedCat = formCategory;

      // 1. Check existing in localStorage users & profiles
      const localUsers = JSON.parse(
        localStorage.getItem("commuaria_users") || "[]"
      );
      const localProfiles = JSON.parse(
        localStorage.getItem("commuaria_profiles") || "[]"
      );

      const existingUserIdx = localUsers.findIndex(
        (u: any) => (u.email || "").toLowerCase() === cleanEmail
      );
      const existingProfileIdx = localProfiles.findIndex(
        (p: any) => (p.email || "").toLowerCase() === cleanEmail
      );

      let targetId = generateUUID();
      if (existingProfileIdx !== -1 && localProfiles[existingProfileIdx].id) {
        targetId = localProfiles[existingProfileIdx].id;
      } else if (existingUserIdx !== -1 && localUsers[existingUserIdx].id) {
        targetId = localUsers[existingUserIdx].id;
      }

      const updatedProfile: UserProfile = {
        id: targetId,
        name: cleanName,
        email: cleanEmail,
        password: formPassword || (existingUserIdx !== -1 ? localUsers[existingUserIdx].password : "super123"),
        role: "supervisor",
        assigned_category: assignedCat,
        is_admin: false,
        created_at: existingProfileIdx !== -1 ? localProfiles[existingProfileIdx].created_at : new Date().toISOString(),
      };

      // Update or insert in commuaria_users
      if (existingUserIdx !== -1) {
        localUsers[existingUserIdx] = {
          ...localUsers[existingUserIdx],
          name: cleanName,
          role: "supervisor",
          assigned_category: assignedCat,
          ...(formPassword ? { password: formPassword } : {}),
        };
      } else {
        localUsers.push(updatedProfile);
      }
      localStorage.setItem("commuaria_users", JSON.stringify(localUsers));

      // Update or insert in commuaria_profiles
      if (existingProfileIdx !== -1) {
        localProfiles[existingProfileIdx] = {
          ...localProfiles[existingProfileIdx],
          name: cleanName,
          role: "supervisor",
          assigned_category: assignedCat,
          ...(formPassword ? { password: formPassword } : {}),
        };
      } else {
        localProfiles.push(updatedProfile);
      }
      localStorage.setItem("commuaria_profiles", JSON.stringify(localProfiles));

      // 2. If Supabase is connected, register in Auth and sync to profiles table
      if (supabase) {
        try {
          let authUserId: string | null = null;

          // Attempt to register in Supabase Auth if not already there
          try {
            const { data: authData } = await supabase.auth.signUp({
              email: cleanEmail,
              password: formPassword || "super123",
              options: {
                data: {
                  name: cleanName,
                  role: "supervisor",
                  assigned_category: assignedCat,
                },
              },
            });
            if (authData?.user?.id) {
              authUserId = authData.user.id;
            }
          } catch (authErr) {
            console.warn("Supabase auth signUp warning:", authErr);
          }

          // Check if profile exists with this email in database
          const { data: existingDbProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", cleanEmail)
            .maybeSingle();

          const dbId = existingDbProfile?.id || authUserId || targetId;

          // Upsert profile in Supabase
          const { error: upsertErr } = await supabase.from("profiles").upsert({
            id: dbId,
            name: cleanName,
            email: cleanEmail,
            role: "supervisor",
            assigned_category: assignedCat,
            is_admin: false,
          });

          if (upsertErr) {
            console.warn("Supabase upsert error, tentando update direto por email:", upsertErr);
            await supabase
              .from("profiles")
              .update({
                name: cleanName,
                role: "supervisor",
                assigned_category: assignedCat,
                is_admin: false,
              })
              .eq("email", cleanEmail);
          }
        } catch (dbErr) {
          console.warn("Supabase sync warning:", dbErr);
        }
      }

      setFormSuccess(`Supervisor de ${formCategory} salvo com sucesso!`);
      setFormName("");
      setFormEmail("");
      setFormPassword("super123");
      setShowAddForm(false);
      await loadSupervisors();
      if (onSupervisorsChange) await onSupervisorsChange();
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      setFormError(err.message || "Erro ao salvar supervisor.");
    }
  };

  const handleUpdateCategory = async (supId: string, newCategory: string) => {
    try {
      // 1. Update localStorage
      const localProfiles = JSON.parse(
        localStorage.getItem("commuaria_profiles") || "[]"
      );
      const targetProfile = localProfiles.find((p: any) => p.id === supId);
      const updated = localProfiles.map((p: any) =>
        p.id === supId ? { ...p, assigned_category: newCategory } : p
      );
      localStorage.setItem("commuaria_profiles", JSON.stringify(updated));

      const localUsers = JSON.parse(
        localStorage.getItem("commuaria_users") || "[]"
      );
      const updatedUsers = localUsers.map((u: any) =>
        u.id === supId ? { ...u, assigned_category: newCategory } : u
      );
      localStorage.setItem("commuaria_users", JSON.stringify(updatedUsers));

      // 2. Update Supabase if available
      if (supabase) {
        await supabase
          .from("profiles")
          .update({ assigned_category: newCategory })
          .eq("id", supId);

        if (targetProfile?.email) {
          await supabase
            .from("profiles")
            .update({ assigned_category: newCategory })
            .eq("email", targetProfile.email.toLowerCase());
        }
      }

      setEditingId(null);
      await loadSupervisors();
      if (onSupervisorsChange) await onSupervisorsChange();
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error("Erro ao atualizar categoria do supervisor:", err);
    }
  };

  const handleDeleteSupervisor = async (supId: string, name: string) => {
    if (!confirm(`Deseja realmente remover o supervisor ${name}?`)) return;

    try {
      const localProfiles = JSON.parse(
        localStorage.getItem("commuaria_profiles") || "[]"
      );
      const targetProfile = localProfiles.find((p: any) => p.id === supId);
      const filtered = (localProfiles || []).filter((p: any) => p.id !== supId);
      localStorage.setItem("commuaria_profiles", JSON.stringify(filtered));

      const localUsers = JSON.parse(
        localStorage.getItem("commuaria_users") || "[]"
      );
      const filteredUsers = (localUsers || []).filter((u: any) => u.id !== supId);
      localStorage.setItem("commuaria_users", JSON.stringify(filteredUsers));

      if (supabase) {
        await supabase.from("profiles").delete().eq("id", supId);
        if (targetProfile?.email) {
          await supabase.from("profiles").delete().eq("email", targetProfile.email.toLowerCase());
        }
      }

      await loadSupervisors();
      if (onSupervisorsChange) await onSupervisorsChange();
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error("Erro ao excluir supervisor:", err);
    }
  };

  // Get report count per category
  const getCategoryStats = (categoryName: string) => {
    const safeReports = Array.isArray(reports) ? reports : [];
    const catReports = safeReports.filter(
      (r) =>
        (r?.category && r.category.toLowerCase() === categoryName.toLowerCase()) ||
        (r?.title && r.title.toLowerCase().includes(categoryName.toLowerCase()))
    );
    const pending = catReports.filter((r) => r?.status !== "resolved").length;
    const resolved = catReports.filter((r) => r?.status === "resolved").length;
    return { total: catReports.length, pending, resolved };
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 15, opacity: 0 }}
        className={`relative max-w-2xl w-full rounded-[36px] border overflow-hidden flex flex-col p-6 sm:p-8 shadow-2xl max-h-[90vh] transition-colors duration-300 ${
          isDark
            ? "bg-[#162A2C] border-white/20 text-white"
            : "bg-white border-black/10 text-[#183a2b]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-6 right-6 z-50 w-10 h-10 rounded-full border flex items-center justify-center transition-all shadow-md active:scale-95 ${
            isDark
              ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
              : "bg-black/5 border-black/10 text-[#183a2b] hover:bg-black/10"
          }`}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-left mb-6 pr-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
              <Shield size={13} />
              <span>Painel do Administrador</span>
            </span>
          </div>
          <h3
            className={`text-2xl sm:text-3xl font-serif font-bold tracking-tight ${
              isDark ? "text-white" : "text-[#183a2b]"
            }`}
          >
            Gestão de Supervisores & Setores
          </h3>
          <p
            className={`text-xs sm:text-sm mt-1 font-sans ${
              isDark ? "text-white/70" : "text-[#2d4a3b]"
            }`}
          >
            Supervisores atendem chamados específicos da sua categoria designada.
          </p>
        </div>

        {/* Categories Overview Pills */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 gap-2 text-left">
          {CATEGORIES_CONFIG.map((cat) => {
            const stats = getCategoryStats(cat.id);
            return (
              <div
                key={cat.id}
                className={`p-3 rounded-2xl border flex flex-col justify-between transition-all ${
                  isDark
                    ? "bg-white/5 border-white/10"
                    : "bg-black/5 border-black/10"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-bold truncate">
                    {cat.shortLabel}
                  </span>
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="text-amber-500 font-bold">
                    {stats.pending} abertos
                  </span>
                  <span className="text-emerald-500 font-bold">
                    {stats.resolved} feitos
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Form to Add Supervisor */}
        {showAddForm ? (
          <form
            onSubmit={handleCreateSupervisor}
            className={`p-5 rounded-3xl border mb-6 text-left transition-all ${
              isDark
                ? "bg-white/5 border-white/20"
                : "bg-black/5 border-black/15"
            }`}
          >
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <HardHat size={16} className="text-amber-500" />
                Cadastrar Novo Supervisor
              </h4>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs opacity-60 hover:opacity-100"
              >
                Cancelar
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-red-500/20 text-red-600 dark:text-red-200 text-xs mb-3 border border-red-500/30">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[11px] font-bold block mb-1 opacity-70">
                  Nome do Supervisor
                </label>
                <input
                  type="text"
                  placeholder="Ex: Nome do Supervisor"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none ${
                    isDark
                      ? "bg-black/30 border-white/20 text-white"
                      : "bg-white border-black/20 text-[#183a2b]"
                  }`}
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-bold block mb-1 opacity-70">
                  E-mail de Acesso
                </label>
                <input
                  type="email"
                  placeholder="supervisor@municipio.gov.br"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none ${
                    isDark
                      ? "bg-black/30 border-white/20 text-white"
                      : "bg-white border-black/20 text-[#183a2b]"
                  }`}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[11px] font-bold block mb-1 opacity-70">
                  Categoria Designada
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ReportCategory)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none ${
                    isDark
                      ? "bg-zinc-800 border-white/20 text-white"
                      : "bg-white border-black/20 text-[#183a2b]"
                  }`}
                >
                  {CATEGORIES_CONFIG.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold block mb-1 opacity-70">
                  Senha Provisória
                </label>
                <input
                  type="text"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none ${
                    isDark
                      ? "bg-black/30 border-white/20 text-white"
                      : "bg-white border-black/20 text-[#183a2b]"
                  }`}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-xl text-xs border border-transparent hover:bg-black/5 dark:hover:bg-white/5"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all active:scale-95"
              >
                Salvar Supervisor
              </button>
            </div>
          </form>
        ) : (
          <div className="flex justify-between items-center mb-4">
            <h4
              className={`text-sm font-bold flex items-center gap-2 ${
                isDark ? "text-white" : "text-[#183a2b]"
              }`}
            >
              <UserCheck size={17} className="text-emerald-500" />
              <span>Supervisores Cadastrados ({supervisors.length})</span>
            </h4>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Plus size={14} />
              <span>Novo Supervisor</span>
            </button>
          </div>
        )}

        {/* Supervisors List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-left scrollbar-thin">
          {loading ? (
            <p className="text-center text-xs py-8 opacity-60">
              Carregando supervisores...
            </p>
          ) : supervisors.length === 0 ? (
            <div className="text-center py-8 opacity-60 text-xs border rounded-2xl border-dashed p-6">
              Nenhum supervisor cadastrado ainda. Clique em "Novo Supervisor" para
              adicionar o responsável por cada categoria.
            </div>
          ) : (
            supervisors.map((sup) => {
              const assignedCat = sup.assigned_category || "Pavimentação";
              const catObj = CATEGORIES_CONFIG.find(
                (c) => c.id.toLowerCase() === assignedCat.toLowerCase()
              );
              const isEditing = editingId === sup.id;

              return (
                <div
                  key={sup.id}
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                    isDark
                      ? "bg-white/5 border-white/10 hover:border-white/20"
                      : "bg-black/5 border-black/10 hover:border-black/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0"
                      style={{
                        backgroundColor: catObj?.color || "#f59e0b",
                      }}
                    >
                      {sup.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm">{sup.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          {assignedCat}
                        </span>
                      </div>
                      <span
                        className={`text-xs block font-mono ${
                          isDark ? "text-white/60" : "text-[#2d4a3b]/70"
                        }`}
                      >
                        {sup.email}
                      </span>
                    </div>
                  </div>

                  {/* Actions & Category reassign */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          defaultValue={assignedCat}
                          onChange={(e) =>
                            handleUpdateCategory(sup.id, e.target.value)
                          }
                          className={`text-xs px-2.5 py-1.5 rounded-xl border focus:outline-none ${
                            isDark
                              ? "bg-zinc-800 border-white/20 text-white"
                              : "bg-white border-black/20 text-[#183a2b]"
                          }`}
                        >
                          {CATEGORIES_CONFIG.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.shortLabel}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 rounded-lg opacity-60 hover:opacity-100"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingId(sup.id)}
                          title="Alterar Categoria do Supervisor"
                          className={`p-2 rounded-xl border text-xs flex items-center gap-1 font-medium transition-all ${
                            isDark
                              ? "bg-white/5 border-white/10 hover:bg-white/15 text-white/80"
                              : "bg-black/5 border-black/10 hover:bg-black/10 text-[#183a2b]"
                          }`}
                        >
                          <Edit2 size={13} />
                          <span className="hidden sm:inline">Setor</span>
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteSupervisor(sup.id, sup.name)
                          }
                          title="Excluir Supervisor"
                          className="p-2 rounded-xl border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-300 hover:bg-red-500 hover:text-white transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-black/10 dark:border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all ${
              isDark
                ? "bg-white text-zinc-900 hover:bg-white/90"
                : "bg-[#183a2b] text-white hover:bg-[#122c21]"
            }`}
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
