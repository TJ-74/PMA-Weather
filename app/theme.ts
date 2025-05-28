export type Theme = 'light' | 'dark';

export const themes = {
  light: {
    background: 'bg-gradient-to-br from-gray-50 to-blue-50',
    text: 'text-gray-800',
    textMuted: 'text-gray-600',
    border: 'border-gray-200',
    navbar: {
      background: 'bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700',
      text: 'text-white',
      buttonHover: 'hover:bg-white/10',
      border: 'border-white/10',
    },
    chat: {
      container: 'bg-white',
      header: {
        background: 'bg-white',
        border: 'border-gray-200',
        title: 'text-gray-800',
        subtitle: 'text-gray-500',
      },
      messages: {
        user: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white',
        assistant: 'bg-gray-100 text-gray-800 border border-gray-200',
        loading: 'bg-gray-100 text-gray-800 border border-gray-200',
      },
      input: {
        background: 'bg-white',
        border: 'border-gray-300',
        text: 'text-gray-800',
        placeholder: 'placeholder-gray-400',
        button: 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700',
      },
    },
  },
  dark: {
    background: 'bg-gradient-to-br from-gray-900 to-blue-900',
    text: 'text-white',
    textMuted: 'text-gray-300',
    border: 'border-gray-700',
    navbar: {
      background: 'bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900',
      text: 'text-white',
      buttonHover: 'hover:bg-white/10',
      border: 'border-white/10',
    },
    chat: {
      container: 'bg-gray-800',
      header: {
        background: 'bg-gray-800',
        border: 'border-gray-700',
        title: 'text-white',
        subtitle: 'text-gray-300',
      },
      messages: {
        user: 'bg-gradient-to-r from-blue-600 to-purple-700 text-white',
        assistant: 'bg-gray-700 text-white border border-gray-600',
        loading: 'bg-gray-700 text-white border border-gray-600',
      },
      input: {
        background: 'bg-gray-800',
        border: 'border-gray-600',
        text: 'text-white',
        placeholder: 'placeholder-gray-400',
        button: 'bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800',
      },
    },
  },
} as const;

export type ThemeConfig = typeof themes[Theme]; 