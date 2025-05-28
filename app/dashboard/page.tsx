'use client';

import Chat from '../components/Chat';
import AuthLayout from '../components/AuthLayout';
import ProtectedRoute from '../components/ProtectedRoute';

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <AuthLayout>
        <Chat />
      </AuthLayout>
    </ProtectedRoute>
  );
} 