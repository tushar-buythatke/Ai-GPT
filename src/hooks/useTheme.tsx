
import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "black" | "white";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const THEMES: Record<Theme, string> = {
  light: "light",
  dark: "dark",
  black: "black",
  white: "white",
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem("hatke-theme");
    return (saved as Theme) || "dark";
  });

  useEffect(() => {
    localStorage.setItem("hatke-theme", theme);
    document.documentElement.classList.remove("light", "dark", "black", "white");
    document.documentElement.classList.add(THEMES[theme]);
  }, [theme]);

  const toggleTheme = () => setThemeState((t) => (t === "dark" ? "light" : "dark"));
  const setTheme = (newTheme: Theme) => setThemeState(newTheme);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
