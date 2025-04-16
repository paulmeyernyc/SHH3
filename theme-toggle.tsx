import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { useTranslation } from 'react-i18next';

export function ThemeToggle() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  
  useEffect(() => {
    // Get the current theme from document
    const currentTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    setTheme(currentTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    
    // Update the document classes
    root.classList.remove("light", "dark");
    root.classList.add(newTheme);
    
    // Save to localStorage
    localStorage.setItem("theme", newTheme);
    
    // Update local state
    setTheme(newTheme);
  };

  return (
    <div className="flex flex-col">
      <button
        onClick={toggleTheme}
        className="flex items-center justify-between w-full rounded-md px-2 py-1 text-sm hover:bg-accent hover:text-accent-foreground"
      >
        <span>{theme === 'dark' ? t('header.darkMode') : t('header.lightMode')}</span>
        {theme === 'dark' ? (
          <Moon className="h-4 w-4 ml-2" />
        ) : (
          <Sun className="h-4 w-4 ml-2" />
        )}
      </button>
    </div>
  );
}