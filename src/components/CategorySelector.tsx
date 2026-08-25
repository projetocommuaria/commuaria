import React from "react";
import {
  Cone,
  Sun,
  Trash2,
  Droplets,
  Trees,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import { CATEGORIES_CONFIG, ReportCategory } from "../types";
import { useTheme } from "../ThemeContext";

interface CategorySelectorProps {
  selectedCategory: ReportCategory | string;
  onSelectCategory: (category: ReportCategory) => void;
  disabled?: boolean;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategory,
  onSelectCategory,
  disabled = false,
}) => {
  const { isDark } = useTheme();

  const getIcon = (iconName: string, size = 20, color = "currentColor") => {
    switch (iconName) {
      case "Cone":
        return <Cone size={size} color={color} />;
      case "Sun":
        return <Sun size={size} color={color} />;
      case "Trash2":
        return <Trash2 size={size} color={color} />;
      case "Droplets":
        return <Droplets size={size} color={color} />;
      case "Trees":
        return <Trees size={size} color={color} />;
      default:
        return <HelpCircle size={size} color={color} />;
    }
  };

  return (
    <div className="space-y-3 text-left">
      <div className="flex items-center justify-between">
        <label
          className={`text-xl font-serif font-bold tracking-wide block ${
            isDark ? "text-white" : "text-[#183a2b]"
          }`}
        >
          Categoria do problema
        </label>
        <span
          className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
            isDark
              ? "bg-white/10 text-white/90 border border-white/20"
              : "bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-xs"
          }`}
        >
          Etapa Obrigatória
        </span>
      </div>

      <p
        className={`text-xs font-sans font-medium ${
          isDark ? "text-white/80" : "text-[#183a2b]/80"
        }`}
      >
        Selecione o setor municipal responsável para que a ocorrência seja
        encaminhada diretamente ao supervisor correto:
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {CATEGORIES_CONFIG.map((cat) => {
          const isSelected =
            selectedCategory.toLowerCase() === cat.id.toLowerCase();

          return (
            <button
              key={cat.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectCategory(cat.id)}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 relative group flex items-start gap-3 active:scale-[0.98] ${
                isSelected
                  ? isDark
                    ? "bg-emerald-950/80 border-emerald-400 shadow-lg ring-2 ring-emerald-500/40 text-white"
                    : "bg-[#183a2b] border-[#183a2b] shadow-lg ring-2 ring-[#183a2b]/30 text-white"
                  : isDark
                  ? "bg-white/5 border-white/15 hover:bg-white/10 hover:border-white/30 text-white"
                  : "bg-white border-emerald-900/15 hover:bg-emerald-50/70 hover:border-emerald-800/30 text-[#183a2b] shadow-xs"
              }`}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105"
                style={{
                  backgroundColor: isSelected
                    ? "rgba(255, 255, 255, 0.2)"
                    : `${cat.color}25`,
                  color: isSelected ? "#ffffff" : cat.color,
                }}
              >
                {getIcon(cat.iconName, 20, isSelected ? "#ffffff" : cat.color)}
              </div>

              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-bold text-sm leading-tight block ${
                      isSelected
                        ? "text-white"
                        : isDark
                        ? "text-white"
                        : "text-[#183a2b]"
                    }`}
                  >
                    {cat.label}
                  </span>
                </div>
                <p
                  className={`text-[11px] leading-snug mt-1 font-sans ${
                    isSelected
                      ? "text-emerald-100/90 font-normal"
                      : isDark
                      ? "text-white/70 font-normal"
                      : "text-[#2d4a3b]/85 font-medium"
                  }`}
                >
                  {cat.description}
                </p>
              </div>

              {isSelected && (
                <div className="absolute top-3.5 right-3.5 text-white animate-in fade-in zoom-in-75 duration-200 drop-shadow-sm">
                  <CheckCircle2 size={18} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

