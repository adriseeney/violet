import React, { createContext, useContext, useState, ReactNode } from 'react';

const darkTheme = {
  primary: '#7C3AED',
  primaryDark: '#5B21B6',
  accent: '#A78BFA',
  background: '#0B0B0F',
  /** Slightly lifted surface for gradients / layered UI */
  backgroundMuted: '#14141C',
  card: '#16161D',
  cardBackground: '#16161D',
  text: '#FFFFFF',
  textSecondary: '#B3B3C2',
  border: '#2A2A35',
  tabBarBackground: '#16161D',
  success: '#4CAF50',
  /** Android `Switch` track when on */
  primaryTransparent: '#7C3AED80',
};

const lightTheme = {
  primary: '#7C3AED',
  primaryDark: '#5B21B6',
  accent: '#A78BFA',
  background: '#F5F5F9',
  backgroundMuted: '#FFFFFF',
  card: '#FFFFFF',
  cardBackground: '#FFFFFF',
  text: '#0B0B0F',
  textSecondary: '#5C5C6E',
  border: '#D8D8E4',
  tabBarBackground: '#FFFFFF',
  success: '#4CAF50',
  primaryTransparent: '#7C3AED80',
};

type ThemeContextType = {
  isDark: boolean;
  toggleTheme: () => void;
  colors: typeof darkTheme;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

type ThemeProviderProps = {
  children: ReactNode;
};

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const colors = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};
