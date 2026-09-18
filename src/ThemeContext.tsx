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

  const setTheme = (t: ThemeMode) => {
    setThemeState(t);
    try {
      localStorage.setItem("commuaria_theme", t);
    } catch (e) {
      console.warn("Error saving theme to localStorage:", e);
    }
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.remove("dark", "light");
    body.classList.remove("dark", "light");
    root.classList.add(theme);
    body.classList.add(theme);
    root.style.colorScheme = theme;
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

