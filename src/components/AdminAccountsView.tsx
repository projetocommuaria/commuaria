import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  Shield,
  Search,
  Trash2,
  Ban,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  X,
  Clock,
  User,
  HardHat,
  Info,
  Mail,
  UserX,
  Edit3,
  ShieldCheck,
} from "lucide-react";
import { useTheme } from "../ThemeContext";
import { UserProfile, UserRole, ReportCategory, CATEGORIES_CONFIG } from "../types";
import { supabase, syncAllDataToSupabase } from "../lib/supabase";
import { checkAccountBlockStatus } from "../utils/blockUtils";
import { SafeLogoImage } from "./SafeLogoImage";

interface AdminAccountsViewProps {
  currentAdminId?: string;
  currentAdminEmail?: string;
  onRefreshStats?: () => Promise<void>;
  onViewDetails?: (user: UserProfile) => void;
}

export const AdminAccountsView: React.FC<AdminAccountsViewProps> = ({
  currentAdminId,
  currentAdminEmail,
  onRefreshStats,
}) => {
  const { isDark } = useTheme();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole | "blocked">("all");
  const [sortBy, setSortBy] = useState<"created_at" | "name" | "role">("created_at");

  // Modals state
  const [selectedUserForBlock, setSelectedUserForBlock] = useState<UserProfile | null>(null);
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<UserProfile | null>(null);
  const [selectedUserForRoleChange, setSelectedUserForRoleChange] = useState<UserProfile | null>(null);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);

  // Block Modal Form
  const [blockDurationType, setBlockDurationType] = useState<
    "1hour" | "24hours" | "3days" | "7days" | "15days" | "30days" | "90days" | "permanent" | "custom"
  >("7days");
  const [customUntilDate, setCustomUntilDate] = useState("");
  const [blockReasonPreset, setBlockReasonPreset] = useState("Envio reiterado de chamados falsos ou trotes");
  const [blockCustomReason, setBlockCustomReason] = useState("");
  const [blockLoading, setBlockLoading] = useState(false);

  // Add User Form
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("senha123");
  const [addRole, setAddRole] = useState<UserRole>("user");
  const [addCategory, setAddCategory] = useState<ReportCategory>("Pavimentação");
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  // Role Change Form
  const [newRole, setNewRole] = useState<UserRole>("user");
  const [newCategory, setNewCategory] = useState<ReportCategory | string>("Pavimentação");
  const [roleChangeLoading, setRoleChangeLoading] = useState(false);

  // Delete State
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

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

  const loadAllAccounts = async () => {
    setLoading(true);
    try {
      let supaProfiles: UserProfile[] = [];
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .order("created_at", { ascending: false });
          if (!error && data) {
            supaProfiles = data.filter((d: any) => !isLegacyMock(d));
          }
        } catch (e) {
          console.warn("Supabase profiles query error:", e);
        }
      }

      // Local storage fallback and merge
      const localProfiles: UserProfile[] = JSON.parse(
        localStorage.getItem("commuaria_profiles") || "[]"
      ).filter((p: any) => !isLegacyMock(p));

      const mergedMap = new Map<string, UserProfile>();

      // 1. Add Supabase profiles
      supaProfiles.forEach((p) => {
        const key = (p.email || p.id).toLowerCase();
        mergedMap.set(key, p);
      });

      // 2. Add local profiles
      localProfiles.forEach((lp) => {
        const key = (lp.email || lp.id).toLowerCase();
        if (!mergedMap.has(key)) {
          mergedMap.set(key, lp);
        } else {
          const existing = mergedMap.get(key)!;
          mergedMap.set(key, {
            ...existing,
            is_blocked: lp.is_blocked !== undefined ? lp.is_blocked : existing.is_blocked,
            blocked_until: lp.blocked_until !== undefined ? lp.blocked_until : existing.blocked_until,
            block_reason: lp.block_reason || existing.block_reason,
            assigned_category: lp.assigned_category || existing.assigned_category,
          });
        }
      });

      setProfiles(Array.from(mergedMap.values()));
    } catch (e) {
      console.error("Erro ao carregar contas:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAccounts();
  }, []);

  // Synchronize with Supabase
  const handleSyncWithSupabase = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await syncAllDataToSupabase();
      if (res.success) {
        setSyncMessage(`Sincronização concluída! ${res.profilesSynced} perfis sincronizados.`);
        await loadAllAccounts();
        if (onRefreshStats) await onRefreshStats();
      } else {
        setSyncMessage("Sincronização offline realizada no cache local.");
      }
    } catch (e: any) {
      setSyncMessage("Erro na sincronização: " + (e.message || "Tente novamente."));
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  // Execute Account Block
  const handleConfirmBlock = async () => {
    if (!selectedUserForBlock) return;
    setBlockLoading(true);

    try {
      const now = new Date();
      let untilDateStr: string | null = null;

      if (blockDurationType === "1hour") {
        untilDateStr = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      } else if (blockDurationType === "24hours") {
        untilDateStr = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      } else if (blockDurationType === "3days") {
        untilDateStr = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
      } else if (blockDurationType === "7days") {
        untilDateStr = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (blockDurationType === "15days") {
        untilDateStr = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString();
      } else if (blockDurationType === "30days") {
        untilDateStr = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      } else if (blockDurationType === "90days") {
        untilDateStr = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
      } else if (blockDurationType === "permanent") {
        untilDateStr = "permanent";
      } else if (blockDurationType === "custom") {
        if (!customUntilDate) {
          alert("Por favor, selecione uma data e hora para a suspensão.");
          setBlockLoading(false);
          return;
        }
        untilDateStr = new Date(customUntilDate).toISOString();
      }

      const finalReason =
        blockReasonPreset === "Outro motivo (especificar)"
          ? blockCustomReason.trim() || "Suspensão temporária pela moderação"
          : blockReasonPreset + (blockCustomReason.trim() ? ` - ${blockCustomReason.trim()}` : "");

      const updatePayload = {
        is_blocked: true,
        blocked_until: untilDateStr,
        block_reason: finalReason,
        blocked_at: new Date().toISOString(),
      };

      // 1. Update in LocalStorage
      const localProfiles = JSON.parse(localStorage.getItem("commuaria_profiles") || "[]");
      const updatedProfiles = localProfiles.map((p: any) => {
        if (p.id === selectedUserForBlock.id || p.email?.toLowerCase() === selectedUserForBlock.email?.toLowerCase()) {
          return { ...p, ...updatePayload };
        }
        return p;
      });
      localStorage.setItem("commuaria_profiles", JSON.stringify(updatedProfiles));

      const localUsers = JSON.parse(localStorage.getItem("commuaria_users") || "[]");
      const updatedUsers = localUsers.map((u: any) => {
        if (u.id === selectedUserForBlock.id || u.email?.toLowerCase() === selectedUserForBlock.email?.toLowerCase()) {
          return { ...u, ...updatePayload };
        }
        return u;
      });
      localStorage.setItem("commuaria_users", JSON.stringify(updatedUsers));

      // 2. Update in Supabase
      if (supabase) {
        try {
          await supabase
            .from("profiles")
            .update(updatePayload)
            .eq("id", selectedUserForBlock.id);

          await supabase
            .from("profiles")
            .update(updatePayload)
            .eq("email", selectedUserForBlock.email);
        } catch (err) {
          console.warn("Supabase block update fallback:", err);
        }
      }

      setActionSuccess(`Conta de "${selectedUserForBlock.name || selectedUserForBlock.email}" suspensa com sucesso.`);
      setSelectedUserForBlock(null);
      await loadAllAccounts();
      if (onRefreshStats) await onRefreshStats();
    } catch (e: any) {
      alert("Erro ao bloquear conta: " + (e.message || "Tente novamente"));
    } finally {
      setBlockLoading(false);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  // Execute Unblock
  const handleUnblockUser = async (user: UserProfile) => {
    try {
      const updatePayload = {
        is_blocked: false,
        blocked_until: null,
        block_reason: null,
        blocked_at: null,
      };

      // 1. Update in LocalStorage
      const localProfiles = JSON.parse(localStorage.getItem("commuaria_profiles") || "[]");
      const updatedProfiles = localProfiles.map((p: any) => {
        if (p.id === user.id || p.email?.toLowerCase() === user.email?.toLowerCase()) {
          return { ...p, ...updatePayload };
        }
        return p;
      });
      localStorage.setItem("commuaria_profiles", JSON.stringify(updatedProfiles));

      const localUsers = JSON.parse(localStorage.getItem("commuaria_users") || "[]");
      const updatedUsers = localUsers.map((u: any) => {
        if (u.id === user.id || u.email?.toLowerCase() === user.email?.toLowerCase()) {
          return { ...u, ...updatePayload };
        }
        return u;
      });
      localStorage.setItem("commuaria_users", JSON.stringify(updatedUsers));

      // 2. Update in Supabase
      if (supabase) {
        try {
          await supabase
            .from("profiles")
            .update(updatePayload)
            .eq("id", user.id);

          await supabase
            .from("profiles")
            .update(updatePayload)
            .eq("email", user.email);
        } catch (err) {
          console.warn("Supabase unblock update fallback:", err);
        }
      }

      setActionSuccess(`Conta de "${user.name || user.email}" foi reativada.`);
      await loadAllAccounts();
      if (onRefreshStats) await onRefreshStats();
    } catch (e: any) {
      alert("Erro ao desbloquear conta: " + (e.message || "Tente novamente"));
    } finally {
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  // Execute Delete
  const handleConfirmDelete = async () => {
    if (!selectedUserForDelete) return;

    const targetEmail = (selectedUserForDelete.email || "").toLowerCase();
    const myEmail = (currentAdminEmail || "").toLowerCase();
    if (targetEmail === myEmail || selectedUserForDelete.id === currentAdminId) {
      alert("Operação negada: Você não pode apagar a sua própria conta de Administrador logada.");
      setSelectedUserForDelete(null);
      return;
    }

    setDeleteLoading(true);
    try {
      // 1. Remove from LocalStorage
      const localProfiles = JSON.parse(localStorage.getItem("commuaria_profiles") || "[]");
      const filteredProfiles = localProfiles.filter(
        (p: any) => p.id !== selectedUserForDelete.id && p.email?.toLowerCase() !== targetEmail
      );
      localStorage.setItem("commuaria_profiles", JSON.stringify(filteredProfiles));

      const localUsers = JSON.parse(localStorage.getItem("commuaria_users") || "[]");
      const filteredUsers = localUsers.filter(
        (u: any) => u.id !== selectedUserForDelete.id && u.email?.toLowerCase() !== targetEmail
      );
      localStorage.setItem("commuaria_users", JSON.stringify(filteredUsers));

      // 2. Remove from Supabase
      if (supabase) {
        try {
          await supabase.from("profiles").delete().eq("id", selectedUserForDelete.id);
          await supabase.from("profiles").delete().eq("email", selectedUserForDelete.email);
        } catch (err) {
          console.warn("Supabase delete profile fallback:", err);
        }
      }

      setActionSuccess(`Conta "${selectedUserForDelete.name || selectedUserForDelete.email}" excluída.`);
      setSelectedUserForDelete(null);
      await loadAllAccounts();
      if (onRefreshStats) await onRefreshStats();
    } catch (e: any) {
      alert("Erro ao apagar conta: " + (e.message || "Tente novamente"));
    } finally {
      setDeleteLoading(false);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  // Execute Change Role
  const handleConfirmRoleChange = async () => {
    if (!selectedUserForRoleChange) return;
    setRoleChangeLoading(true);

    try {
      const updatePayload = {
        role: newRole,
        assigned_category: newRole === "supervisor" ? newCategory : null,
        is_admin: newRole === "admin",
      };

      // 1. Update in LocalStorage
      const localProfiles = JSON.parse(localStorage.getItem("commuaria_profiles") || "[]");
      const updatedProfiles = localProfiles.map((p: any) => {
        if (p.id === selectedUserForRoleChange.id || p.email?.toLowerCase() === selectedUserForRoleChange.email?.toLowerCase()) {
          return { ...p, ...updatePayload };
        }
        return p;
      });
      localStorage.setItem("commuaria_profiles", JSON.stringify(updatedProfiles));

      const localUsers = JSON.parse(localStorage.getItem("commuaria_users") || "[]");
      const updatedUsers = localUsers.map((u: any) => {
        if (u.id === selectedUserForRoleChange.id || u.email?.toLowerCase() === selectedUserForRoleChange.email?.toLowerCase()) {
          return { ...u, ...updatePayload };
        }
        return u;
      });
      localStorage.setItem("commuaria_users", JSON.stringify(updatedUsers));

      // 2. Update in Supabase
      if (supabase) {
        try {
          await supabase
            .from("profiles")
            .update(updatePayload)
            .eq("id", selectedUserForRoleChange.id);

          await supabase
            .from("profiles")
            .update(updatePayload)
            .eq("email", selectedUserForRoleChange.email);
        } catch (err) {
          console.warn("Supabase role update fallback:", err);
        }
      }

      setActionSuccess(`Cargo de "${selectedUserForRoleChange.name || selectedUserForRoleChange.email}" atualizado.`);
      setSelectedUserForRoleChange(null);
      await loadAllAccounts();
      if (onRefreshStats) await onRefreshStats();
    } catch (e: any) {
      alert("Erro ao atualizar cargo: " + (e.message || "Tente novamente"));
    } finally {
      setRoleChangeLoading(false);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  // Create User
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddLoading(true);

    const cleanEmail = addEmail.trim().toLowerCase();
    const cleanName = addName.trim();

    if (!cleanEmail || !cleanName) {
      setAddError("Preencha todos os campos obrigatórios.");
      setAddLoading(false);
      return;
    }

    try {
      const uuid = "user_" + Math.random().toString(36).substring(2, 9);
      const newAccount: UserProfile = {
        id: uuid,
        name: cleanName,
        email: cleanEmail,
        role: addRole,
        assigned_category: addRole === "supervisor" ? addCategory : null,
        is_admin: addRole === "admin",
        password: addPassword.trim() || "senha123",
        created_at: new Date().toISOString(),
        is_blocked: false,
      };

      // 1. LocalStorage
      const localProfiles = JSON.parse(localStorage.getItem("commuaria_profiles") || "[]");
      localProfiles.unshift(newAccount);
      localStorage.setItem("commuaria_profiles", JSON.stringify(localProfiles));

      const localUsers = JSON.parse(localStorage.getItem("commuaria_users") || "[]");
      localUsers.unshift(newAccount);
      localStorage.setItem("commuaria_users", JSON.stringify(localUsers));

      // 2. Supabase
      if (supabase) {
        try {
          await supabase.from("profiles").insert({
            id: uuid,
            name: cleanName,
            email: cleanEmail,
            role: addRole,
            assigned_category: addRole === "supervisor" ? addCategory : null,
            is_admin: addRole === "admin",
          });
        } catch (err) {
          console.warn("Supabase insert user fallback:", err);
        }
      }

      setActionSuccess(`Conta de "${cleanName}" criada com sucesso.`);
      setShowAddAccountModal(false);
      setAddName("");
      setAddEmail("");
      setAddPassword("senha123");
      await loadAllAccounts();
      if (onRefreshStats) await onRefreshStats();
    } catch (err: any) {
      setAddError(err.message || "Erro ao criar conta.");
    } finally {
      setAddLoading(false);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  // Filtered & Sorted Profiles
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.id && p.id.toLowerCase().includes(q)) ||
        (p.assigned_category && p.assigned_category.toLowerCase().includes(q));

      const blockStatus = checkAccountBlockStatus(p);

      // Role filter tab
      let matchRole = true;
      if (roleFilter === "admin") {
        matchRole = p.role === "admin" || p.is_admin === true;
      } else if (roleFilter === "supervisor") {
        matchRole = p.role === "supervisor";
      } else if (roleFilter === "user") {
        matchRole = p.role === "user" || !p.role;
      } else if (roleFilter === "blocked") {
        matchRole = blockStatus.isBlocked;
      }

      return matchSearch && matchRole;
    }).sort((a, b) => {
      if (sortBy === "name") {
        return (a.name || "").localeCompare(b.name || "");
      }
      if (sortBy === "role") {
        return (a.role || "").localeCompare(b.role || "");
      }
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [profiles, searchQuery, roleFilter, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    let totalCitizens = 0;
    let totalSupervisors = 0;
    let totalAdmins = 0;
    let totalBlocked = 0;

    profiles.forEach((p) => {
      const blockStatus = checkAccountBlockStatus(p);
      if (blockStatus.isBlocked) totalBlocked++;

      if (p.role === "admin" || p.is_admin) {
        totalAdmins++;
      } else if (p.role === "supervisor") {
        totalSupervisors++;
      } else {
        totalCitizens++;
      }
    });

    return {
      total: profiles.length,
      citizens: totalCitizens,
      supervisors: totalSupervisors,
      admins: totalAdmins,
      blocked: totalBlocked,
      active: profiles.length - totalBlocked,
    };
  }, [profiles]);

  return (
    <div
      className={`relative min-h-[100dvh] sm:min-h-full w-full overflow-y-auto overflow-x-hidden font-sans pb-36 transition-colors duration-300 ${
        isDark ? "bg-[#5A635C] text-white" : "bg-[#F0F4F1] text-[#183a2b]"
      }`}
    >
      {/* Clean Municipal Header Bar */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-2xl transition-all duration-300 ${
          isDark
            ? "bg-[#5A635C]/90 border-white/15 text-white"
            : "bg-white/90 border-[#183a2b]/10 text-[#183a2b]"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            {/* Brand identity */}
            <div className="flex items-center gap-3">
              <SafeLogoImage
                isMinimal
                className="w-10 h-10 object-contain drop-shadow-sm"
                alt="Logo Commuária"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-serif font-bold tracking-wider">
                    COMMUÁRIA
                  </span>
                  <span className="bg-amber-500 text-[10px] px-2 py-0.5 rounded-full font-sans font-extrabold tracking-wide text-zinc-950 shadow-sm">
                    ADMIN
                  </span>
                </div>
                <p className={`text-xs font-medium ${isDark ? "text-white/70" : "text-[#2d4a3b]/80"}`}>
                  Gestão de Contas & Usuários
                </p>
              </div>
            </div>

            {/* Quick header action buttons */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleSyncWithSupabase}
                disabled={syncing}
                className={`px-3.5 py-2 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-sm ${
                  isDark
                    ? "bg-white/10 hover:bg-white/15 border-white/20 text-white"
                    : "bg-white hover:bg-zinc-50 border-black/10 text-[#183a2b]"
                }`}
                title="Sincronizar base de dados"
              >
                <RefreshCw size={14} className={syncing ? "animate-spin text-emerald-500" : ""} />
                <span>{syncing ? "Sincronizando..." : "Sincronizar"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddAccountModal(true)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 ${
                  isDark
                    ? "bg-white text-[#5A635C] hover:bg-white/90"
                    : "bg-[#183a2b] hover:bg-[#122c21] text-white"
                }`}
              >
                <Plus size={16} />
                <span>Nova Conta</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Banner Card / Municipal Intro */}
        <div
          className={`p-6 sm:p-7 rounded-[28px] border relative overflow-hidden transition-all duration-300 shadow-sm ${
            isDark
              ? "bg-gradient-to-br from-white/10 to-white/5 border-white/15 text-white"
              : "bg-gradient-to-br from-white to-[#E8EFEA] border-[#183a2b]/10 text-[#183a2b]"
          }`}
        >
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <ShieldCheck size={14} />
                Controle de Acessos & Moderação
              </div>
              <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-tight">
                Painel de Governança de Usuários
              </h1>
              <p className={`text-xs sm:text-sm font-medium leading-relaxed ${isDark ? "text-white/80" : "text-[#2d4a3b]/80"}`}>
                Visualize e gerencie os cidadãos cadastrados, supervisores de zeladoria pública municipal e administradores do sistema Commuária. Aplique suspensões preventivas ou altere permissões diretamente.
              </p>
            </div>

            {/* Quick stats snapshot badge */}
            <div
              className={`p-3.5 sm:p-4 rounded-2xl border flex items-center gap-3.5 shrink-0 backdrop-blur-md ${
                isDark ? "bg-black/20 border-white/10" : "bg-white/80 border-black/5"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Users size={20} />
              </div>
              <div>
                <span className={`text-[11px] font-mono block ${isDark ? "text-white/60" : "text-[#2d4a3b]/70"}`}>
                  Contas Registradas
                </span>
                <span className="text-lg sm:text-xl font-bold font-serif">{stats.total} contas</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sync Toast Feedback */}
        <AnimatePresence>
          {syncMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`p-3.5 rounded-2xl border text-xs flex items-center gap-3 shadow-md ${
                syncMessage.includes("Falha") || syncMessage.includes("Erro")
                  ? "bg-rose-500/15 border-rose-500/30 text-rose-800 dark:text-rose-200"
                  : "bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
              }`}
            >
              <Info size={16} className="shrink-0" />
              <span className="font-medium">{syncMessage}</span>
            </motion.div>
          )}

          {actionSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-3.5 rounded-2xl border bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-3 shadow-md"
            >
              <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
              <span className="font-bold">{actionSuccess}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summary Statistics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            onClick={() => setRoleFilter("user")}
            className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] ${
              roleFilter === "user"
                ? isDark
                  ? "bg-white/15 border-white/30 shadow-md"
                  : "bg-white border-[#183a2b]/30 shadow-md"
                : isDark
                ? "bg-white/5 border-white/10 hover:bg-white/10"
                : "bg-white border-black/5 hover:border-black/15 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold ${isDark ? "text-white/70" : "text-[#2d4a3b]/70"}`}>
                Cidadãos
              </span>
              <div className="w-7 h-7 rounded-lg bg-slate-500/15 flex items-center justify-center text-slate-600 dark:text-slate-300">
                <User size={14} />
              </div>
            </div>
            <span className="text-2xl font-bold font-serif">{stats.citizens}</span>
            <span className="block text-[10px] opacity-70 mt-0.5">Usuários munícipes</span>
          </div>

          <div
            onClick={() => setRoleFilter("supervisor")}
            className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] ${
              roleFilter === "supervisor"
                ? isDark
                  ? "bg-white/15 border-white/30 shadow-md"
                  : "bg-white border-[#183a2b]/30 shadow-md"
                : isDark
                ? "bg-white/5 border-white/10 hover:bg-white/10"
                : "bg-white border-black/5 hover:border-black/15 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold ${isDark ? "text-white/70" : "text-[#2d4a3b]/70"}`}>
                Supervisores
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <HardHat size={14} />
              </div>
            </div>
            <span className="text-2xl font-bold font-serif text-amber-600 dark:text-amber-400">
              {stats.supervisors}
            </span>
            <span className="block text-[10px] opacity-70 mt-0.5">Equipes de zeladoria</span>
          </div>

          <div
            onClick={() => setRoleFilter("admin")}
            className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] ${
              roleFilter === "admin"
                ? isDark
                  ? "bg-white/15 border-white/30 shadow-md"
                  : "bg-white border-[#183a2b]/30 shadow-md"
                : isDark
                ? "bg-white/5 border-white/10 hover:bg-white/10"
                : "bg-white border-black/5 hover:border-black/15 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-bold ${isDark ? "text-white/70" : "text-[#2d4a3b]/70"}`}>
                Administradores
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Shield size={14} />
              </div>
            </div>
            <span className="text-2xl font-bold font-serif text-emerald-600 dark:text-emerald-400">
              {stats.admins}
            </span>
            <span className="block text-[10px] opacity-70 mt-0.5">Gestão central</span>
          </div>

          <div
            onClick={() => setRoleFilter("blocked")}
            className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] ${
              roleFilter === "blocked"
                ? "bg-rose-500/20 border-rose-500/40 shadow-md"
                : stats.blocked > 0
                ? "bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/15"
                : isDark
                ? "bg-white/5 border-white/10 hover:bg-white/10"
                : "bg-white border-black/5 hover:border-black/15 shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                Suspensões
              </span>
              <div className="w-7 h-7 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <Ban size={14} />
              </div>
            </div>
            <span className="text-2xl font-bold font-serif text-rose-600 dark:text-rose-400">
              {stats.blocked}
            </span>
            <span className="block text-[10px] opacity-70 mt-0.5">Contas suspensas</span>
          </div>
        </div>

        {/* Filter and Search Box */}
        <div
          className={`p-4 sm:p-5 rounded-3xl border space-y-3.5 shadow-sm transition-colors ${
            isDark
              ? "bg-white/5 border-white/10 text-white"
              : "bg-white border-black/5 text-[#183a2b]"
          }`}
        >
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={18}
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                  isDark ? "text-white/40" : "text-[#2d4a3b]/50"
                }`}
              />
              <input
                type="text"
                placeholder="Buscar usuário por nome, e-mail, ID ou setor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-10 py-2.5 rounded-2xl border text-xs sm:text-sm font-sans outline-none transition-all ${
                  isDark
                    ? "bg-black/20 border-white/10 text-white placeholder-white/40 focus:border-white/30"
                    : "bg-zinc-50 border-black/10 text-[#183a2b] placeholder-black/40 focus:border-black/30"
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <span className={`font-mono text-[11px] ${isDark ? "text-white/60" : "text-[#2d4a3b]/70"}`}>
                Ordenar:
              </span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className={`px-3 py-2 rounded-xl border text-xs outline-none font-medium cursor-pointer ${
                  isDark
                    ? "bg-black/30 border-white/15 text-white"
                    : "bg-zinc-50 border-black/15 text-[#183a2b]"
                }`}
              >
                <option value="created_at">Mais Recentes</option>
                <option value="name">Nome (A-Z)</option>
                <option value="role">Função / Cargo</option>
              </select>
            </div>
          </div>

          {/* Segmented Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-black/5 dark:border-white/10">
            <button
              type="button"
              onClick={() => setRoleFilter("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                roleFilter === "all"
                  ? isDark
                    ? "bg-white text-[#5A635C] shadow-sm"
                    : "bg-[#183a2b] text-white shadow-sm"
                  : isDark
                  ? "bg-white/5 text-white/70 hover:bg-white/10"
                  : "bg-zinc-100 text-[#2d4a3b] hover:bg-zinc-200"
              }`}
            >
              Todas ({profiles.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("user")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                roleFilter === "user"
                  ? isDark
                    ? "bg-white text-[#5A635C] shadow-sm"
                    : "bg-[#183a2b] text-white shadow-sm"
                  : isDark
                  ? "bg-white/5 text-white/70 hover:bg-white/10"
                  : "bg-zinc-100 text-[#2d4a3b] hover:bg-zinc-200"
              }`}
            >
              Cidadãos ({stats.citizens})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("supervisor")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                roleFilter === "supervisor"
                  ? isDark
                    ? "bg-white text-[#5A635C] shadow-sm"
                    : "bg-[#183a2b] text-white shadow-sm"
                  : isDark
                  ? "bg-white/5 text-white/70 hover:bg-white/10"
                  : "bg-zinc-100 text-[#2d4a3b] hover:bg-zinc-200"
              }`}
            >
              Supervisores ({stats.supervisors})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("admin")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                roleFilter === "admin"
                  ? isDark
                    ? "bg-white text-[#5A635C] shadow-sm"
                    : "bg-[#183a2b] text-white shadow-sm"
                  : isDark
                  ? "bg-white/5 text-white/70 hover:bg-white/10"
                  : "bg-zinc-100 text-[#2d4a3b] hover:bg-zinc-200"
              }`}
            >
              Administradores ({stats.admins})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("blocked")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                roleFilter === "blocked"
                  ? "bg-rose-600 text-white shadow-sm"
                  : isDark
                  ? "bg-white/5 text-rose-300 hover:bg-white/10"
                  : "bg-zinc-100 text-rose-700 hover:bg-zinc-200"
              }`}
            >
              Bloqueados ({stats.blocked})
            </button>
          </div>
        </div>

        {/* User Cards Grid */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-20 text-center">
              <RefreshCw size={32} className="animate-spin text-emerald-500 mx-auto mb-3" />
              <p className={`text-sm ${isDark ? "text-white/60" : "text-[#2d4a3b]/70"}`}>
                Carregando contas e perfis...
              </p>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div
              className={`p-12 text-center rounded-3xl border ${
                isDark ? "bg-white/5 border-white/10" : "bg-white border-black/5 shadow-sm"
              }`}
            >
              <UserX size={44} className="mx-auto mb-3 opacity-40 text-emerald-500" />
              <h3 className="text-lg font-bold font-serif mb-1">Nenhum usuário encontrado</h3>
              <p className={`text-xs max-w-md mx-auto ${isDark ? "text-white/60" : "text-[#2d4a3b]/70"}`}>
                Nenhum usuário corresponde aos filtros ou busca selecionada.
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setRoleFilter("all");
                  }}
                  className={`mt-4 px-4 py-2 rounded-xl text-xs font-bold ${
                    isDark ? "bg-white text-[#5A635C]" : "bg-[#183a2b] text-white"
                  }`}
                >
                  Limpar Filtros
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProfiles.map((user) => {
                const blockStatus = checkAccountBlockStatus(user);
                const isMe =
                  user.id === currentAdminId ||
                  (user.email && user.email.toLowerCase() === (currentAdminEmail || "").toLowerCase());

                return (
                  <motion.div
                    key={user.id || user.email}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-5 rounded-3xl border flex flex-col justify-between transition-all ${
                      blockStatus.isBlocked
                        ? isDark
                          ? "bg-rose-950/25 border-rose-500/40"
                          : "bg-rose-50/80 border-rose-300 shadow-sm"
                        : isDark
                        ? "bg-white/5 border-white/10 hover:border-white/20"
                        : "bg-white border-black/5 hover:border-black/15 shadow-sm"
                    }`}
                  >
                    <div>
                      {/* Top Header inside card */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 shadow-sm ${
                              user.role === "admin" || user.is_admin
                                ? "bg-emerald-600 text-white"
                                : user.role === "supervisor"
                                ? "bg-amber-500 text-zinc-950"
                                : isDark
                                ? "bg-white/10 text-white"
                                : "bg-[#183a2b] text-white"
                            }`}
                          >
                            {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <h4 className="font-bold text-sm sm:text-base font-serif truncate">
                              {user.name || "Cidadão de Araucária"}
                            </h4>
                            <div className="flex items-center gap-1.5 text-xs opacity-75 font-mono truncate">
                              <Mail size={12} className="shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status tag */}
                        {blockStatus.isBlocked ? (
                          <span className="px-2 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40 flex items-center gap-1 shrink-0">
                            <Ban size={10} />
                            {blockStatus.isPermanent ? "Permanente" : "Suspenso"}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1 shrink-0">
                            <CheckCircle2 size={10} />
                            Ativa
                          </span>
                        )}
                      </div>

                      {/* Middle metadata badges */}
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        {isMe && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            Sua Conta
                          </span>
                        )}

                        {user.role === "admin" || user.is_admin ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <Shield size={11} /> Administrador
                          </span>
                        ) : user.role === "supervisor" ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <HardHat size={11} /> {user.assigned_category || "Supervisor Geral"}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-500/20 text-slate-800 dark:text-slate-300 border border-slate-500/30 flex items-center gap-1">
                            <User size={11} /> Cidadão
                          </span>
                        )}

                        <span className="text-[10px] opacity-60 font-mono">
                          ID: {user.id && user.id.length > 14 ? user.id.substring(0, 14) + "..." : user.id}
                        </span>
                      </div>

                      {/* Block reason box if blocked */}
                      {blockStatus.isBlocked && (
                        <div
                          className={`mb-3 p-3 rounded-2xl border text-xs space-y-1 ${
                            isDark
                              ? "bg-rose-950/40 border-rose-500/30 text-rose-200"
                              : "bg-rose-100/90 border-rose-300 text-rose-900"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold">
                            <AlertTriangle size={13} className="shrink-0 text-rose-500" />
                            <span className="truncate">Motivo: {blockStatus.reason}</span>
                          </div>
                          <div className="text-[11px] opacity-80 flex items-center justify-between">
                            <span>Até: {blockStatus.formattedUntil}</span>
                            {blockStatus.remainingText && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 font-mono font-bold">
                                {blockStatus.remainingText}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Action Controls Footer */}
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-black/5 dark:border-white/10">
                      {/* Left: Role editor button */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUserForRoleChange(user);
                          setNewRole(user.role || "user");
                          setNewCategory(user.assigned_category || "Pavimentação");
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                          isDark
                            ? "bg-white/10 hover:bg-white/15 text-white"
                            : "bg-zinc-100 hover:bg-zinc-200 text-[#183a2b]"
                        }`}
                        title="Alterar cargo e setor"
                      >
                        <Edit3 size={13} />
                        <span>Cargo</span>
                      </button>

                      {/* Right: Moderation Actions */}
                      <div className="flex items-center gap-2">
                        {blockStatus.isBlocked ? (
                          <button
                            type="button"
                            onClick={() => handleUnblockUser(user)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                            title="Reativar conta"
                          >
                            <Unlock size={13} />
                            <span>Desbloquear</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUserForBlock(user);
                              setBlockDurationType("7days");
                              setBlockReasonPreset("Envio reiterado de chamados falsos ou trotes");
                              setBlockCustomReason("");
                            }}
                            disabled={isMe}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 ${
                              isMe
                                ? "opacity-30 cursor-not-allowed bg-black/5 dark:bg-white/5"
                                : "bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                            }`}
                            title={isMe ? "Você não pode suspender sua própria conta" : "Suspender ou bloquear conta"}
                          >
                            <Ban size={13} />
                            <span>Suspender</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedUserForDelete(user)}
                          disabled={isMe}
                          className={`p-2 rounded-xl transition-all ${
                            isMe
                              ? "opacity-30 cursor-not-allowed text-zinc-400"
                              : "text-zinc-500 hover:text-rose-600 hover:bg-rose-500/10 active:scale-95"
                          }`}
                          title={isMe ? "Você não pode excluir sua própria conta" : "Excluir conta definitivamente"}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* MODAL: Bloqueio / Suspensão */}
      <AnimatePresence>
        {selectedUserForBlock && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-lg rounded-3xl p-6 sm:p-7 border shadow-2xl space-y-5 ${
                isDark ? "bg-[#3D443F] border-white/20 text-white" : "bg-white border-black/15 text-[#183a2b]"
              }`}
            >
              <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <Ban size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-serif">Suspender Conta</h3>
                    <p className={`text-xs ${isDark ? "text-white/70" : "text-[#2d4a3b]/70"}`}>
                      {selectedUserForBlock.name || selectedUserForBlock.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUserForBlock(null)}
                  className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block font-bold mb-1.5">Duração da Suspensão:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "1hour", label: "1 Hora" },
                      { id: "24hours", label: "24 Horas" },
                      { id: "3days", label: "3 Dias" },
                      { id: "7days", label: "7 Dias" },
                      { id: "15days", label: "15 Dias" },
                      { id: "30days", label: "30 Dias" },
                      { id: "90days", label: "90 Dias" },
                      { id: "permanent", label: "Permanente" },
                      { id: "custom", label: "Personalizado" },
                    ].map((dur) => (
                      <button
                        key={dur.id}
                        type="button"
                        onClick={() => setBlockDurationType(dur.id as any)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                          blockDurationType === dur.id
                            ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                            : isDark
                            ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                            : "bg-zinc-50 border-black/10 text-[#183a2b] hover:bg-zinc-100"
                        }`}
                      >
                        {dur.label}
                      </button>
                    ))}
                  </div>
                </div>

                {blockDurationType === "custom" && (
                  <div>
                    <label className="block font-bold mb-1">Data e Hora de Desbloqueio:</label>
                    <input
                      type="datetime-local"
                      value={customUntilDate}
                      onChange={(e) => setCustomUntilDate(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                        isDark ? "bg-black/30 border-white/20 text-white" : "bg-zinc-50 border-black/20 text-black"
                      }`}
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold mb-1.5">Motivo da Moderação:</label>
                  <select
                    value={blockReasonPreset}
                    onChange={(e) => setBlockReasonPreset(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none mb-2 font-medium ${
                      isDark ? "bg-black/30 border-white/20 text-white" : "bg-zinc-50 border-black/20 text-black"
                    }`}
                  >
                    <option value="Envio reiterado de chamados falsos ou trotes">Envio reiterado de chamados falsos ou trotes</option>
                    <option value="Linguagem ofensiva ou descumprimento dos termos de uso">Linguagem ofensiva ou descumprimento dos termos de uso</option>
                    <option value="Spam ou duplicação massiva de ocorrências">Spam ou duplicação massiva de ocorrências</option>
                    <option value="Uso indevido dos recursos municipais">Uso indevido dos recursos municipais</option>
                    <option value="Outro motivo (especificar)">Outro motivo (especificar detalhadamente)</option>
                  </select>

                  <textarea
                    rows={2}
                    placeholder="Observações complementares sobre a suspensão..."
                    value={blockCustomReason}
                    onChange={(e) => setBlockCustomReason(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none resize-none ${
                      isDark ? "bg-black/30 border-white/20 text-white placeholder-white/40" : "bg-zinc-50 border-black/20 text-black placeholder-black/40"
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForBlock(null)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs ${
                    isDark ? "bg-white/10 hover:bg-white/15 text-white" : "bg-zinc-100 hover:bg-zinc-200 text-[#183a2b]"
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBlock}
                  disabled={blockLoading}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2 shadow-lg active:scale-95"
                >
                  {blockLoading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Ban size={14} />
                  )}
                  <span>Confirmar Suspensão</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Alterar Cargo */}
      <AnimatePresence>
        {selectedUserForRoleChange && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl space-y-5 ${
                isDark ? "bg-[#3D443F] border-white/20 text-white" : "bg-white border-black/15 text-[#183a2b]"
              }`}
            >
              <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Edit3 size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-serif">Alterar Cargo</h3>
                    <p className={`text-xs ${isDark ? "text-white/70" : "text-[#2d4a3b]/70"}`}>
                      {selectedUserForRoleChange.name || selectedUserForRoleChange.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUserForRoleChange(null)}
                  className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block font-bold mb-1.5">Selecione o Novo Cargo:</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewRole("user")}
                      className={`p-3 rounded-2xl border text-center font-bold text-xs flex flex-col items-center gap-1.5 transition-all ${
                        newRole === "user"
                          ? "bg-slate-600 text-white border-slate-600 shadow-sm"
                          : isDark
                          ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                          : "bg-zinc-50 border-black/10 text-[#183a2b] hover:bg-zinc-100"
                      }`}
                    >
                      <User size={16} />
                      <span>Cidadão</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewRole("supervisor")}
                      className={`p-3 rounded-2xl border text-center font-bold text-xs flex flex-col items-center gap-1.5 transition-all ${
                        newRole === "supervisor"
                          ? "bg-amber-500 text-zinc-950 border-amber-500 shadow-sm font-extrabold"
                          : isDark
                          ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                          : "bg-zinc-50 border-black/10 text-[#183a2b] hover:bg-zinc-100"
                      }`}
                    >
                      <HardHat size={16} />
                      <span>Supervisor</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewRole("admin")}
                      className={`p-3 rounded-2xl border text-center font-bold text-xs flex flex-col items-center gap-1.5 transition-all ${
                        newRole === "admin"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm font-extrabold"
                          : isDark
                          ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                          : "bg-zinc-50 border-black/10 text-[#183a2b] hover:bg-zinc-100"
                      }`}
                    >
                      <Shield size={16} />
                      <span>Admin</span>
                    </button>
                  </div>
                </div>

                {newRole === "supervisor" && (
                  <div>
                    <label className="block font-bold mb-1.5">Setor de Zeladoria Designado:</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-xs outline-none font-medium ${
                        isDark ? "bg-black/30 border-white/20 text-white" : "bg-zinc-50 border-black/20 text-black"
                      }`}
                    >
                      {CATEGORIES_CONFIG.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForRoleChange(null)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs ${
                    isDark ? "bg-white/10 hover:bg-white/15 text-white" : "bg-zinc-100 hover:bg-zinc-200 text-[#183a2b]"
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRoleChange}
                  disabled={roleChangeLoading}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-lg active:scale-95"
                >
                  {roleChangeLoading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>Salvar Alteração</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Excluir Conta */}
      <AnimatePresence>
        {selectedUserForDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl space-y-4 ${
                isDark ? "bg-[#3D443F] border-white/20 text-white" : "bg-white border-black/15 text-[#183a2b]"
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <Trash2 size={24} />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold font-serif">Excluir Conta Permanentemente?</h3>
                <p className={`text-xs ${isDark ? "text-white/70" : "text-[#2d4a3b]/70"}`}>
                  Você está prestes a apagar a conta de <strong>{selectedUserForDelete.name || selectedUserForDelete.email}</strong> do sistema Commuária e do Supabase. Esta ação é irreversível.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedUserForDelete(null)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs ${
                    isDark ? "bg-white/10 hover:bg-white/15 text-white" : "bg-zinc-100 hover:bg-zinc-200 text-[#183a2b]"
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleteLoading}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2 shadow-lg active:scale-95"
                >
                  {deleteLoading ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  <span>Excluir Definitivamente</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Nova Conta */}
      <AnimatePresence>
        {showAddAccountModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-lg rounded-3xl p-6 sm:p-7 border shadow-2xl space-y-5 ${
                isDark ? "bg-[#3D443F] border-white/20 text-white" : "bg-white border-black/15 text-[#183a2b]"
              }`}
            >
              <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Plus size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-serif">Cadastrar Nova Conta</h3>
                    <p className={`text-xs ${isDark ? "text-white/70" : "text-[#2d4a3b]/70"}`}>
                      Criar acesso direto na base de dados Commuária
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              {addError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle size={14} />
                  <span>{addError}</span>
                </div>
              )}

              <form onSubmit={handleCreateAccount} className="space-y-3.5 text-xs sm:text-sm">
                <div>
                  <label className="block font-bold mb-1">Nome Completo:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo Silva"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                      isDark ? "bg-black/30 border-white/20 text-white placeholder-white/40" : "bg-zinc-50 border-black/20 text-black placeholder-black/40"
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Endereço de E-mail:</label>
                  <input
                    type="email"
                    required
                    placeholder="Ex: cidadao@araucaria.pr.gov.br"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                      isDark ? "bg-black/30 border-white/20 text-white placeholder-white/40" : "bg-zinc-50 border-black/20 text-black placeholder-black/40"
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Senha Provisória:</label>
                  <input
                    type="text"
                    placeholder="senha123"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none font-mono ${
                      isDark ? "bg-black/30 border-white/20 text-white placeholder-white/40" : "bg-zinc-50 border-black/20 text-black placeholder-black/40"
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Perfil de Acesso:</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAddRole("user")}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs ${
                        addRole === "user"
                          ? "bg-slate-600 text-white border-slate-600"
                          : isDark
                          ? "bg-white/5 border-white/10 text-white"
                          : "bg-zinc-50 border-black/10 text-[#183a2b]"
                      }`}
                    >
                      Cidadão
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddRole("supervisor")}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs ${
                        addRole === "supervisor"
                          ? "bg-amber-500 text-zinc-950 border-amber-500 font-extrabold"
                          : isDark
                          ? "bg-white/5 border-white/10 text-white"
                          : "bg-zinc-50 border-black/10 text-[#183a2b]"
                      }`}
                    >
                      Supervisor
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddRole("admin")}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs ${
                        addRole === "admin"
                          ? "bg-emerald-600 text-white border-emerald-600 font-extrabold"
                          : isDark
                          ? "bg-white/5 border-white/10 text-white"
                          : "bg-zinc-50 border-black/10 text-[#183a2b]"
                      }`}
                    >
                      Admin
                    </button>
                  </div>
                </div>

                {addRole === "supervisor" && (
                  <div>
                    <label className="block font-bold mb-1">Setor Designado:</label>
                    <select
                      value={addCategory}
                      onChange={(e) => setAddCategory(e.target.value as ReportCategory)}
                      className={`w-full p-2.5 rounded-xl border text-xs outline-none font-medium ${
                        isDark ? "bg-black/30 border-white/20 text-white" : "bg-zinc-50 border-black/20 text-black"
                      }`}
                    >
                      {CATEGORIES_CONFIG.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddAccountModal(false)}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs ${
                      isDark ? "bg-white/10 hover:bg-white/15 text-white" : "bg-zinc-100 hover:bg-zinc-200 text-[#183a2b]"
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-lg active:scale-95"
                  >
                    {addLoading ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                    <span>Criar Conta</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
