'use client';

import { useState } from 'react';
import { useTheme } from '../providers/ThemeProvider';
import { useAuth } from '../providers/AuthProvider';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface NavbarProps {
  onSidebarToggle?: () => void;
  isSidebarOpen?: boolean;
}

export default function Navbar({ onSidebarToggle, isSidebarOpen }: NavbarProps = {}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isDark, toggleTheme, themeConfig } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className={`${themeConfig.navbar.background} shadow-lg border-b ${themeConfig.navbar.border} backdrop-blur-sm sticky top-0 z-50`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left Side - Sidebar Toggle + Logo */}
          <div className="flex items-center space-x-4">
            {/* Sidebar Toggle Button for Desktop and Mobile */}
            {onSidebarToggle && (
              <button
                onClick={onSidebarToggle}
                className={`p-2 rounded-lg transition-all duration-300 hover:scale-105 ${themeConfig.navbar.buttonText} ${themeConfig.navbar.hover} hover:bg-white/10 backdrop-blur-sm cursor-pointer`}
                title={isSidebarOpen ? 'Close Chat History' : 'Open Chat History'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}

            <div className="flex-shrink-0 group">
              <Link href="/" className="block cursor-pointer">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center transform transition-all duration-300 group-hover:rotate-12 group-hover:scale-110">
                  <svg
                    className="w-6 h-6 text-white transform transition-all duration-300 group-hover:-rotate-12"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                    />
                  </svg>
                </div>
              </Link>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                PM Weather Bot
              </h1>
              <p className={`text-xs ${themeConfig.textMuted}`}>Your Personal Weather Assistant</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-4">
              {/* User Profile and Theme Toggle */}
              <div className="flex items-center space-x-4">
                {user && (
                  <>
                    <div className="text-sm">
                      <p className={`${themeConfig.navbar.text} font-medium`}>
                        {user.email}
                      </p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="bg-gradient-to-r from-red-500 to-pink-600 px-4 py-2 rounded-lg text-white transition-all duration-300 hover:opacity-90 hover:scale-105 flex items-center space-x-2 cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Logout</span>
                    </button>
                  </>
                )}
                
                {/* Theme Toggle Button */}
                <button
                  onClick={toggleTheme}
                  className={`${themeConfig.navbar.buttonText} ${themeConfig.navbar.hover} p-2 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105 hover:bg-white/10 backdrop-blur-sm ml-4 cursor-pointer`}
                  title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {isDark ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Mobile Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`${themeConfig.navbar.buttonText} ${themeConfig.navbar.hover} p-2 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105 hover:bg-white/10 backdrop-blur-sm cursor-pointer`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>

            {/* Mobile menu button */}
            {user && (
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 inline-flex items-center justify-center p-2 rounded-lg text-white transition-all duration-300 hover:scale-110 hover:shadow-lg cursor-pointer"
              >
                {isMenuOpen ? (
                  <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`${
          isMenuOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
        } md:hidden absolute top-16 inset-x-0 transition-all duration-300 ease-in-out z-50`}
      >
        <div className={`px-2 pt-2 pb-3 space-y-1 ${themeConfig.navbar.background} backdrop-blur-xl border-t ${themeConfig.navbar.border} shadow-xl`}>
          {/* Mobile User Profile and Logout */}
          {user && (
            <div className="pt-2 pb-3">
              <div className="px-3">
                <p className={`text-sm font-medium ${themeConfig.navbar.text}`}>
                  {user.email}
                </p>
              </div>
              <div className="mt-3">
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 w-full px-3 py-2 text-red-100 hover:text-white bg-gradient-to-r from-red-500 to-pink-600 rounded-lg transition-all duration-300 hover:opacity-90 cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
} 