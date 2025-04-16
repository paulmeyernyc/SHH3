import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Safely get initial theme without calling hooks outside a component
const getInitialTheme = (): Theme => {
  // Check if window is available (client-side)
  if (typeof window !== "undefined" && window.localStorage) {
    const storedTheme = window.localStorage.getItem("theme") as Theme | null;
    if (storedTheme && (storedTheme === "light" || storedTheme === "dark")) {
      return storedTheme;
    }
  }
  // Default to dark mode
  return "dark";
};

// Set up a default theme initially (without hooks)
let defaultTheme = getInitialTheme();

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize state with the function return result, not the function itself
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  // Effect to apply theme class to document
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    
    // Save to localStorage
    if (typeof window !== "undefined") {
      window.localStorage.setItem("theme", theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}