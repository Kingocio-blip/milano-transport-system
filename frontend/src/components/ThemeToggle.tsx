// ============================================
// MILANO - Theme Toggle
// Boton para cambiar entre: claro / oscuro / sistema
// ============================================

import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  // Evitar hidratacion incorrecta
  useEffect(() => {
    setMounted(true);
  }, []);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = () => setOpen(false);
    if (open) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [open]);

  if (!mounted) {
    return (
      <button className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors">
        <Sun className="h-5 w-5" />
      </button>
    );
  }

  const options = [
    { value: 'light', label: 'Claro', icon: Sun },
    { value: 'dark', label: 'Oscuro', icon: Moon },
    { value: 'system', label: 'Sistema', icon: Monitor },
  ] as const;

  const currentOption = options.find(o => o.value === theme) || options[2];
  const CurrentIcon = currentOption.icon;

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
        title={`Tema: ${currentOption.label}`}
      >
        <CurrentIcon className="h-5 w-5" />
        {resolvedTheme === 'dark' && (
          <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-indigo-500 rounded-full" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Apariencia
          </div>
          {options.map((option) => {
            const Icon = option.icon;
            const isActive = theme === option.value;
            return (
              <button
                key={option.value}
                onClick={() => {
                  setTheme(option.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{option.label}</span>
                {isActive && <Check className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
