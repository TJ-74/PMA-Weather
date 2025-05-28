'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useTheme } from '../providers/ThemeProvider';
import Image from 'next/image';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const { themeConfig } = useTheme();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleGoogleAuth = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      setError(error.message);
    }
  };

  return (
    <div className={`min-h-screen ${themeConfig.background} flex items-center justify-center p-4`}>
      <div className={`max-w-md w-full space-y-8 ${themeConfig.chat.container} p-8 rounded-2xl shadow-xl`}>
        <div className="text-center">
          <h2 className={`text-3xl font-bold ${themeConfig.text} mb-2`}>
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className={`${themeConfig.textMuted}`}>
            {isSignUp 
              ? 'Sign up to start exploring weather insights'
              : 'Sign in to continue to Weather Chat Assistant'
            }
          </p>
        </div>

        <button
          onClick={handleGoogleAuth}
          className={`w-full flex items-center justify-center gap-3 px-4 py-3 border rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${themeConfig.button.google}`}
        >
          <Image src="/google.svg" alt="Google" width={20} height={20} />
          Continue with Google
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className={`w-full border-t ${themeConfig.border}`}></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className={`px-2 ${themeConfig.chat.container} ${themeConfig.textMuted}`}>
              Or continue with email
            </span>
          </div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-6">
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
              className={`mt-1 block w-full px-3 py-2 border ${themeConfig.border} rounded-lg 
                text-sm ${themeConfig.text} ${themeConfig.chat.container}
                focus:outline-none focus:ring-2 focus:ring-blue-500`}
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
              className={`mt-1 block w-full px-3 py-2 border ${themeConfig.border} rounded-lg 
                text-sm ${themeConfig.text} ${themeConfig.chat.container}
                focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg
              shadow-sm text-sm font-medium ${themeConfig.button.primary}
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          >
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <p className={`text-center text-sm ${themeConfig.textMuted}`}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="font-medium text-blue-500 hover:text-blue-600"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
} 