import { useEffect, useRef, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type ThemePreference } from "../hooks/useTheme";

interface ThemeToggleProps {
  compact?: boolean;
}

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { themePreference, setThemePreference } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const options: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <Sun className="h-4 w-4" /> },
    { value: "dark", label: "Dark", icon: <Moon className="h-4 w-4" /> },
    { value: "system", label: "System", icon: <Monitor className="h-4 w-4" /> },
  ];

  const currentIcon =
    themePreference === "light"
      ? <Sun className="h-5 w-5" />
      : themePreference === "dark"
      ? <Moon className="h-5 w-5" />
      : <Monitor className="h-5 w-5" />;

  const handleSelect = (value: ThemePreference) => {
    setThemePreference(value);
    setIsOpen(false);
  };

  return (
    <div className="relative flex" ref={menuRef}>
      {compact ? (
        <button
          type="button"
          aria-label="Change theme"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
        >
          {currentIcon}
        </button>
      ) : (
        <button
          type="button"
          aria-label="Change theme"
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-white"
        >
          {currentIcon}
          Theme
        </button>
      )}

      {isOpen && (
        <div className={`absolute z-50 w-48 rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 ${
          compact 
            ? "right-0 top-full mt-2" 
            : "bottom-full left-0 mb-2 lg:bottom-auto lg:left-full lg:ml-2 lg:top-0 lg:mb-0"
        }`}>
          <div className="px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Appearance</div>
          <div className="h-px bg-zinc-100 dark:bg-zinc-800 mb-1"></div>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                themePreference === option.value
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white font-medium"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                {option.icon}
                {option.label}
              </div>
              {themePreference === option.value && (
                <span className="text-emerald-600 dark:text-emerald-500">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
