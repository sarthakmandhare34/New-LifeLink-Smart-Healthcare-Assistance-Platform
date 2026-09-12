import { Moon, Sun } from 'lucide-react';                                                       // Theme mode icons
import { useTheme } from '../context/ThemeContext';                                             // Theme context hook

export type EntryTheme = 'light' | 'dark';                                                      // Supported visual themes

// Returns accessible button title and action text based on active theme
export const getEntryThemeToggleCopy = (theme: EntryTheme) => (
  theme === 'light'
    ? { action: 'Switch to dark mode', label: 'Dark mode' }                                     // Copy when current theme is light
    : { action: 'Switch to light mode', label: 'Light mode' }                                   // Copy when current theme is dark
);

// =========================================================================================
// THEME TOGGLE BUTTON COMPONENT
// Toggles between Liquid-Glass Light Mode and Deep Navy Dark Mode.
// =========================================================================================
export const EntryThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();                                                    // Read current theme and toggle handler
  const copy = getEntryThemeToggleCopy(theme);                                                  // Accessible copy
  const Icon = theme === 'light' ? Moon : Sun;                                                  // Icon representing target mode

  return (
    <button
      type="button"
      className="auth-theme-toggle"
      aria-label={copy.action}
      title={copy.action}
      onClick={toggleTheme}                                                                     // Toggle theme on click
    >
      <Icon size={16} aria-hidden="true" />
      <span>{copy.label}</span>
    </button>
  );
};
