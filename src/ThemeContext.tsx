import React, { createContext, useContext, useState, useEffect } from "react";

export type ThemeMode = "dark" | "light";

export interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (t: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  isDark: true,
  toggleTheme: () => {},
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem("commuaria_theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch (e) {
      console.warn("Error reading theme from localStorage:", e);
    }
    return "dark";
  });

  const isDark = theme === "dark";

  useEffect(() => {
    try {
      localStorage.setItem("commuaria_theme", theme);
    } catch (e) {
      console.warn("Error saving theme to localStorage:", e);
    }
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const setTheme = (t: ThemeMode) => {
    setThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
