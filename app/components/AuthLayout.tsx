'use client';

import { useTheme } from '../providers/ThemeProvider';
import Navbar from './Navbar';

interface AuthLayoutProps {
  children: React.ReactNode;
  onSidebarToggle?: () => void;
  isSidebarOpen?: boolean;
}

export default function AuthLayout({ children, onSidebarToggle, isSidebarOpen }: AuthLayoutProps) {
  const { themeConfig } = useTheme();

  return (
    <div className={`min-h-screen ${themeConfig.background}`}>
      <Navbar onSidebarToggle={onSidebarToggle} isSidebarOpen={isSidebarOpen} />
      <main >
        {children}
      </main>
    </div>
  );
} 