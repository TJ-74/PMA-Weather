'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useTheme } from '../providers/ThemeProvider';
import Navbar from '../components/Navbar';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { themeConfig } = useTheme();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error('Email auth error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className={`min-h-screen ${themeConfig.background} flex items-center justify-center pt-16`}>
        <div className={`max-w-md w-full ${themeConfig.chat.container} p-8 rounded-2xl shadow-xl border ${themeConfig.border}`}>
          <div className="text-center">
            <h2 className={`text-3xl font-bold ${themeConfig.text} mb-2`}>
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className={themeConfig.textMuted}>
              {isSignUp 
                ? 'Sign up to start exploring weather insights'
                : 'Sign in to continue to Weather Chat Assistant'
              }
            </p>
            <div className={`mt-4 p-4 rounded-lg border ${
              themeConfig.background.includes('gray-900') 
                ? 'bg-blue-900/30 border-blue-800' 
                : 'bg-blue-50 border-blue-100'
            }`}>
              <p className={`font-medium mb-1 ${
                themeConfig.background.includes('gray-900') 
                  ? 'text-blue-300' 
                  : 'text-blue-800'
              }`}>Note:</p>
              <p className={`text-sm ${
                themeConfig.background.includes('gray-900') 
                  ? 'text-blue-200' 
                  : 'text-blue-700'
              }`}>
                You can use any email address and password to create an account. This is a demo application, so no email verification is required.
              </p>
            </div>
          </div>

          <form onSubmit={handleEmailAuth} className="mt-8 space-y-6">
            <div>
              <label htmlFor="email" className={`block text-sm font-medium ${themeConfig.text}`}>
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`mt-1 block w-full px-3 py-2 ${themeConfig.chat.input.background} border ${themeConfig.border} rounded-lg 
                  text-sm ${themeConfig.chat.input.text} ${themeConfig.chat.input.placeholder}
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  transition duration-150 ease-in-out`}
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className={`block text-sm font-medium ${themeConfig.text}`}>
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`mt-1 block w-full px-3 py-2 ${themeConfig.chat.input.background} border ${themeConfig.border} rounded-lg 
                  text-sm ${themeConfig.chat.input.text} ${themeConfig.chat.input.placeholder}
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  transition duration-150 ease-in-out`}
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div className={`rounded-lg p-3 border ${
                themeConfig.background.includes('gray-900') 
                  ? 'bg-red-900/30 border-red-800' 
                  : 'bg-red-50 border-red-100'
              }`}>
                <p className={`text-sm ${
                  themeConfig.background.includes('gray-900') 
                    ? 'text-red-300' 
                    : 'text-red-600'
                }`}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg
                text-sm font-medium text-white cursor-pointer
                ${isLoading 
                  ? 'bg-blue-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'}
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                transition duration-150 ease-in-out`}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {isSignUp ? 'Creating Account...' : 'Signing In...'}
                </div>
              ) : (
                isSignUp ? 'Sign Up' : 'Sign In'
              )}
            </button>
          </form>

          <p className={`mt-6 text-center text-sm ${themeConfig.textMuted}`}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className={`font-medium text-blue-600 hover:text-blue-500 cursor-pointer
                focus:outline-none focus:underline transition duration-150 ease-in-out ${
                  themeConfig.background.includes('gray-900') 
                    ? 'text-blue-400 hover:text-blue-300' 
                    : 'text-blue-600 hover:text-blue-500'
                }`}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </>
  );
} 