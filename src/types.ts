export type UserRole = "user" | "supervisor" | "admin";

export type ReportStatus = "unresolved" | "in_analysis" | "in_progress" | "resolved";

export type ReportCategory =
  | "Pavimentação"
  | "Iluminação Pública"
  | "Limpeza Urbana"
  | "Saneamento"
  | "Arborização"
  | "Outros";

export interface CategoryDefinition {
  id: ReportCategory;
  label: string;
  shortLabel: string;
  description: string;
  iconName: string;
  color: string;
  bgLight: string;
  bgDark: string;
  borderLight: string;
  borderDark: string;
  textLight: string;
  textDark: string;
}

export const CATEGORIES_CONFIG: CategoryDefinition[] = [
  {
    id: "Pavimentação",
    label: "Pavimentação & Vias",
    shortLabel: "Pavimentação",
    description: "Buracos, asfalto danificado, recapeamento, meio-fio e calçadas",
    iconName: "Cone",
    color: "#f59e0b",
    bgLight: "bg-amber-500/10",
    bgDark: "bg-amber-500/20",
    borderLight: "border-amber-500/30",
    borderDark: "border-amber-500/40",
    textLight: "text-amber-700",
    textDark: "text-amber-300",
  },
  {
    id: "Iluminação Pública",
    label: "Iluminação Pública",
    shortLabel: "Iluminação",
    description: "Postes apagados, lâmpadas queimadas, fios caídos e luminárias",
    iconName: "Sun",
    color: "#eab308",
    bgLight: "bg-yellow-500/10",
    bgDark: "bg-yellow-500/20",
    borderLight: "border-yellow-500/30",
    borderDark: "border-yellow-500/40",
    textLight: "text-yellow-800",
    textDark: "text-yellow-300",
  },
  {
    id: "Limpeza Urbana",
    label: "Limpeza Urbana",
    shortLabel: "Limpeza",
    description: "Lixo acumulado, entulho irregular, descarte de móveis e varrição",
    iconName: "Trash2",
    color: "#10b981",
    bgLight: "bg-emerald-500/10",
    bgDark: "bg-emerald-500/20",
    borderLight: "border-emerald-500/30",
    borderDark: "border-emerald-500/40",
    textLight: "text-emerald-800",
    textDark: "text-emerald-300",
  },
  {
    id: "Saneamento",
    label: "Saneamento & Água",
    shortLabel: "Saneamento",
    description: "Vazamento de água, rede de esgoto, bueiros entupidos e drenagem",
    iconName: "Droplets",
    color: "#0284c7",
    bgLight: "bg-sky-500/10",
    bgDark: "bg-sky-500/20",
    borderLight: "border-sky-500/30",
    borderDark: "border-sky-500/40",
    textLight: "text-sky-800",
    textDark: "text-sky-300",
  },
  {
    id: "Arborização",
    label: "Arborização & Meio Ambiente",
    shortLabel: "Arborização",
    description: "Árvores caídas, risco de queda, poda de galhos e vegetação alta",
    iconName: "Trees",
    color: "#16a34a",
    bgLight: "bg-green-500/10",
    bgDark: "bg-green-500/20",
    borderLight: "border-green-500/30",
    borderDark: "border-green-500/40",
    textLight: "text-green-800",
    textDark: "text-green-300",
  },
  {
    id: "Outros",
    label: "Outros Serviços de Zeladoria",
    shortLabel: "Outros",
    description: "Placas danificadas, sinalização viária e outras demandas municipais",
    iconName: "HelpCircle",
    color: "#8b5cf6",
    bgLight: "bg-purple-500/10",
    bgDark: "bg-purple-500/20",
    borderLight: "border-purple-500/30",
    borderDark: "border-purple-500/40",
    textLight: "text-purple-800",
    textDark: "text-purple-300",
  },
];

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assigned_category?: ReportCategory | string | null;
  is_admin?: boolean;
  open?: number;
  resolved?: number;
  anonymous?: boolean;
  password?: string;
  created_at?: string;
}

export interface ReportItem {
  id: string;
  title: string;
  description: string;
  category: ReportCategory | string;
  address: string;
  latitude: number;
  longitude: number;
  status: ReportStatus | string;
  status_notes?: string | null;
  image_url?: string;
  anonymous?: boolean;
  user_id?: string;
  user_email?: string;
  user_name?: string;
  created_at?: string;
  resolved_at?: string;
  is_work_order?: boolean;
  work_order_number?: string;
  assigned_team?: string;
  priority?: "low" | "medium" | "high" | "emergency";
  deadline?: string;
  maintenance_type?: string;
  technical_notes?: string;
}

export interface WorkOrderItem {
  id: string;
  order_number: string;
  title: string;
  category: ReportCategory | string;
  address: string;
  priority: "low" | "medium" | "high" | "emergency";
  deadline: string;
  assigned_team: string;
  maintenance_type: string;
  description: string;
  technical_instructions?: string;
  status: "open" | "dispatched" | "in_progress" | "completed" | "cancelled";
  status_notes?: string;
  supervisor_name?: string;
  supervisor_email?: string;
  linked_report_id?: string;
  created_at: string;
  completed_at?: string;
}

