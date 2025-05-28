'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const lightTheme = {
  background: 'bg-gradient-to-br from-gray-50 to-blue-50',
  text: 'text-gray-800',
  textMuted: 'text-gray-600',
  border: 'border-gray-200',
  navbar: {
    background: 'bg-white',
    text: 'text-gray-800',
    hover: 'hover:bg-gray-100',
    border: 'border-gray-200',
    buttonHover: 'hover:bg-gray-100',
    buttonText: 'text-gray-800'
  },
  chat: {
    header: {
      background: 'bg-white',
      title: 'text-gray-800',
      subtitle: 'text-gray-600',
      border: 'border-gray-200'
    },
    container: 'bg-white',
    messages: {
      user: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white',
      assistant: 'bg-gray-50 text-gray-800',
      loading: 'bg-gray-50'
    },
    input: {
      background: 'bg-white',
      text: 'text-gray-800',
      border: 'border-gray-200',
      placeholder: 'placeholder-gray-400'
    }
  },
  button: {
    primary: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    google: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
  },
  loading: {
    spinner: 'border-blue-500',
    background: 'bg-white'
  }
};

const darkTheme = {
  background: 'bg-gradient-to-br from-gray-900 to-gray-800',
  text: 'text-gray-200',
  textMuted: 'text-gray-400',
  border: 'border-gray-700',
  navbar: {
    background: 'bg-gray-800',
    text: 'text-gray-200',
    hover: 'hover:bg-gray-700',
    border: 'border-gray-700',
    buttonHover: 'hover:bg-gray-700',
    buttonText: 'text-gray-200'
  },
  chat: {
    header: {
      background: 'bg-gray-800',
      title: 'text-gray-200',
      subtitle: 'text-gray-400',
      border: 'border-gray-700'
    },
    container: 'bg-gray-800',
    messages: {
      user: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white',
      assistant: 'bg-gray-700 text-gray-200',
      loading: 'bg-gray-700'
    },
    input: {
      background: 'bg-gray-700',
      text: 'text-gray-200',
      border: 'border-gray-600',
      placeholder: 'placeholder-gray-400'
    }
  },
  button: {
    primary: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90',
    secondary: 'bg-gray-700 text-gray-200 hover:bg-gray-600',
    google: 'bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600'
  },
  loading: {
    spinner: 'border-blue-500',
    background: 'bg-gray-800'
  }
};

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  themeConfig: typeof lightTheme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDark(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    localStorage.setItem('darkMode', (!isDark).toString());
    document.documentElement.classList.toggle('dark');
  };

  const themeConfig = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, themeConfig }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 