import type { ReportItem, UserRole } from "../types";

export const canManageAccounts = (role?: UserRole): boolean => role === "admin";

export const canAuditAllSectors = (role?: UserRole): boolean =>
  role === "admin" || role === "diretor";

export const canDispatchWorkOrders = (role?: UserRole): boolean =>
  role === "admin" || role === "supervisor";

export const canExecuteWorkOrders = (role?: UserRole): boolean =>
  role === "admin" || role === "supervisor" || role === "funcionario";

/**
 * Applies the existing citizen-data visibility rules for each application role.
 * Keep this policy centralized and covered by tests when roles or report fields change.
 */
export const maskCitizenData = (report: ReportItem, viewerRole?: UserRole): ReportItem => {
  if (viewerRole === "admin") return report;

  if (viewerRole === "diretor") {
    return {
      ...report,
      user_name: report.anonymous ? "Cidadão Anônimo" : report.user_name || "Cidadão",
      user_email: undefined,
      user_id: undefined,
      image_url: report.anonymous ? undefined : report.image_url,
    };
  }

  if (viewerRole === "supervisor" || viewerRole === "funcionario") {
    return {
      ...report,
      user_name: "Cidadão",
      user_email: undefined,
      user_id: undefined,
    };
  }

  return {
    ...report,
    user_name: report.anonymous ? "Cidadão Anônimo" : "Cidadão",
    user_email: undefined,
    user_id: undefined,
    image_url: report.anonymous ? undefined : report.image_url,
  };
};
