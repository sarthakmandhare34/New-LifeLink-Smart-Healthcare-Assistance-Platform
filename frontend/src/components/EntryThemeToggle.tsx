import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export type EntryTheme = 'light' | 'dark';

export const getEntryThemeToggleCopy = (theme: EntryTheme) => (
  theme === 'light'
    ? { action: 'Switch to dark mode', label: 'Dark mode' }
    : { action: 'Switch to light mode', label: 'Light mode' }
);

export const EntryThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const copy = getEntryThemeToggleCopy(theme);
  const Icon = theme === 'light' ? Moon : Sun;

  return (
    <button
      type="button"
      className="auth-theme-toggle"
      aria-label={copy.action}
      title={copy.action}
      onClick={toggleTheme}
    >
      <Icon size={16} aria-hidden="true" />
      <span>{copy.label}</span>
    </button>
  );
};
