import React, { createContext, useContext, useEffect, useState } from 'react';         // React core state, context, and effect hooks
import type { ReactNode } from 'react';                                                    // Type for nested JSX child nodes

type Theme = 'light' | 'dark';                                                             // Supported color schemes

interface ThemeContextType {
  theme: Theme;                                                                            // Active theme name ('light' or 'dark')
  toggleTheme: () => void;                                                                 // Function to switch between light and dark modes
}

// React context storing current theme state across all components
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme Provider wrapping the application to manage persistent dark/light mode
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('lifelink_theme');                                  // Read previously stored theme from browser storage
    if (saved === 'light' || saved === 'dark') return saved;                               // Use saved user preference
    return 'light';                                                                        // Default to light mode for crisp hospital aesthetic
  });

  // Syncs theme attribute onto the root <html> document tag and updates localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);                            // Set data-theme="light" or "dark" on <html> element
    localStorage.setItem('lifelink_theme', theme);                                         // Save preference in localStorage
  }, [theme]);

  // Toggles active theme between light and dark
  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));                               // Switch theme state
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to consume active theme and toggle action within UI components
export const useTheme = () => {
  const context = useContext(ThemeContext);                                                // Access context
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');                       // Guard against usage outside provider
  }
  return context;                                                                          // Return { theme, toggleTheme }
};
