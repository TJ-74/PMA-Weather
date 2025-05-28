'use client';

import { useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useTheme } from '../providers/ThemeProvider';
import { useRouter } from 'next/navigation';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { themeConfig } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${themeConfig.background}`}>
        <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${themeConfig.loading.spinner}`}></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
} 