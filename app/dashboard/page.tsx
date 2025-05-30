'use client';

import { useState } from 'react';
import Chat from '../components/Chat';
import AuthLayout from '../components/AuthLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import { useTheme } from '../providers/ThemeProvider';

export default function Dashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default open on desktop
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    chatId: string | null;
    chatTitle: string;
  }>({
    isOpen: false,
    chatId: null,
    chatTitle: ''
  });
  const { themeConfig } = useTheme();

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const openDeleteModal = (chatId: string, chatTitle: string) => {
    setDeleteModal({
      isOpen: true,
      chatId,
      chatTitle
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      chatId: null,
      chatTitle: ''
    });
  };

  return (
    <ProtectedRoute>
      <AuthLayout onSidebarToggle={handleSidebarToggle} isSidebarOpen={isSidebarOpen}>
        <div className="relative h-[calc(100vh-5rem)] w-full">
          {/* Overlay for mobile */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          <div className="flex w-full h-full">
            <Chat 
              isSidebarOpen={isSidebarOpen} 
              onSidebarClose={() => setIsSidebarOpen(false)}
              onDeleteChat={openDeleteModal}
            />
          </div>

          {/* Delete Confirmation Modal */}
          {deleteModal.isOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className={`${themeConfig.chat.container} rounded-xl shadow-2xl max-w-md w-full border ${themeConfig.border} transform transition-all duration-300 scale-100`}>
                {/* Modal Header */}
                <div className="p-6 border-b border-red-200 dark:border-red-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H9a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                    <div>
                      <h3 className={`text-lg font-semibold ${themeConfig.text}`}>
                        Delete Chat
                      </h3>
                      <p className={`text-sm ${themeConfig.textMuted}`}>
                        This action cannot be undone
                      </p>
                    </div>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-6">
                  <p className={`${themeConfig.text} mb-2`}>
                    Are you sure you want to delete this chat?
                  </p>
                  <div className={`p-3 rounded-lg border-l-4 border-red-400 ${
                    themeConfig.background.includes('gray-900') 
                      ? 'bg-red-900/20' 
                      : 'bg-red-50'
                  }`}>
                    <p className={`text-sm font-medium ${
                      themeConfig.background.includes('gray-900') 
                        ? 'text-red-300' 
                        : 'text-red-800'
                    }`}>
                      "{deleteModal.chatTitle}"
                    </p>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className={`p-6 border-t ${themeConfig.border} flex space-x-3 justify-end`}>
                  <button
                    onClick={closeDeleteModal}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 cursor-pointer ${
                      themeConfig.background.includes('gray-900')
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // This will be handled by the Chat component
                      const event = new CustomEvent('confirmDelete', { 
                        detail: { chatId: deleteModal.chatId } 
                      });
                      window.dispatchEvent(event);
                      closeDeleteModal();
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium transition-all duration-200 cursor-pointer transform hover:scale-105"
                  >
                    Delete Chat
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AuthLayout>
    </ProtectedRoute>
  );
} 