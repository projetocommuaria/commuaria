import { UserProfile } from "../types";

export interface BlockStatusResult {
  isBlocked: boolean;
  isPermanent: boolean;
  formattedUntil: string | null;
  reason: string | null;
  remainingText: string | null;
}

export function checkAccountBlockStatus(user: UserProfile | any): BlockStatusResult {
  if (!user) {
    return {
      isBlocked: false,
      isPermanent: false,
      formattedUntil: null,
      reason: null,
      remainingText: null,
    };
  }

  // If user is explicitly not blocked and blocked_until is not set
  if (!user.is_blocked && !user.blocked_until) {
    return {
      isBlocked: false,
      isPermanent: false,
      formattedUntil: null,
      reason: null,
      remainingText: null,
    };
  }

  const reason = user.block_reason || "Suspensão temporária por determinação administrativa.";

  // Check permanent / indefinite
  if (
    user.blocked_until === "permanent" ||
    user.blocked_until === "indefinite" ||
    user.blocked_until === "indeterminado" ||
    (user.is_blocked && !user.blocked_until)
  ) {
    return {
      isBlocked: true,
      isPermanent: true,
      formattedUntil: "Indeterminado (Sem data limite)",
      reason,
      remainingText: "Bloqueio permanente",
    };
  }

  // Check timestamp date
  try {
    const untilDate = new Date(user.blocked_until);
    const now = new Date();

    if (isNaN(untilDate.getTime())) {
      // Invalid date string, treat as permanent if is_blocked is true
      if (user.is_blocked) {
        return {
          isBlocked: true,
          isPermanent: true,
          formattedUntil: "Indeterminado",
          reason,
          remainingText: "Bloqueio permanente",
        };
      }
      return {
        isBlocked: false,
        isPermanent: false,
        formattedUntil: null,
        reason: null,
        remainingText: null,
      };
    }

    // If expiration date has already passed
    if (untilDate.getTime() <= now.getTime()) {
      return {
        isBlocked: false,
        isPermanent: false,
        formattedUntil: null,
        reason: null,
        remainingText: null,
      };
    }

    // Still active temporary block
    const diffMs = untilDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    let remainingText = "";
    if (diffDays > 0) {
      remainingText = `${diffDays} dia${diffDays > 1 ? "s" : ""} restante${diffDays > 1 ? "s" : ""}`;
    } else if (diffHours > 0) {
      remainingText = `${diffHours} hora${diffHours > 1 ? "s" : ""} restante${diffHours > 1 ? "s" : ""}`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      remainingText = `${diffMinutes} minuto${diffMinutes > 1 ? "s" : ""} restante${diffMinutes > 1 ? "s" : ""}`;
    }

    const formattedUntil = untilDate.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return {
      isBlocked: true,
      isPermanent: false,
      formattedUntil,
      reason,
      remainingText,
    };
  } catch (_) {
    return {
      isBlocked: !!user.is_blocked,
      isPermanent: true,
      formattedUntil: "Indeterminado",
      reason,
      remainingText: "Bloqueio permanente",
    };
  }
}
