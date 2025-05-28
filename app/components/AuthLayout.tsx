'use client';

import { useTheme } from '../providers/ThemeProvider';
import Navbar from './Navbar';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { themeConfig } = useTheme();

  return (
    <div className={`min-h-screen ${themeConfig.background}`}>
      <Navbar />
      <main className="pt-4">
        {children}
      </main>
    </div>
  );
} 