'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../providers/AuthProvider';
import { useTheme } from '../providers/ThemeProvider';
import { chatService } from '../services/chatService';

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: any;
  userId: string;
}

interface ChatHistoryProps {
  onSelectChat: (chatId: string) => void;
  currentChatId: string | null;
}

export default function ChatHistory({ onSelectChat, currentChatId }: ChatHistoryProps) {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const { user } = useAuth();
  const { themeConfig } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chats'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatData: ChatSession[] = [];
      snapshot.forEach((doc) => {
        chatData.push({ id: doc.id, ...doc.data() } as ChatSession);
      });
      setChats(chatData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this chat?')) {
      try {
        await chatService.deleteChat(chatId);
        if (currentChatId === chatId) {
          onSelectChat('new');
        }
      } catch (error) {
        console.error('Error deleting chat:', error);
        alert('Failed to delete chat. Please try again.');
      }
    }
  };

  return (
    <div 
      className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } transition-all duration-300 ease-in-out flex flex-col h-full border-r ${themeConfig.border}`}
    >
      {/* Header */}
      <div className={`p-4 border-b ${themeConfig.border} flex items-center justify-between`}>
        {!isCollapsed && (
          <h2 className={`font-semibold ${themeConfig.text}`}>Chat History</h2>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`p-1.5 rounded-lg transition-colors ${themeConfig.text} ${
            themeConfig.chat.container.includes('gray-800') ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
          }`}
        >
          <svg
            className={`w-5 h-5 ${themeConfig.text} transform transition-transform ${
              isCollapsed ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={isCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
            />
          </svg>
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={`group relative ${
              currentChatId === chat.id 
                ? (themeConfig.chat.container.includes('gray-800') ? 'bg-gray-700' : 'bg-gray-100')
                : ''
            }`}
          >
            <button
              onClick={() => onSelectChat(chat.id)}
              className={`w-full p-3 flex items-center space-x-3 transition-colors
                ${themeConfig.chat.container.includes('gray-800') ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}
                ${isCollapsed ? 'justify-center' : ''}`}
            >
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${themeConfig.text}`}>
                    {chat.title || 'New Chat'}
                  </p>
                  <p className={`text-xs truncate ${themeConfig.textMuted}`}>
                    {chat.lastMessage || 'No messages yet'}
                  </p>
                </div>
              )}
            </button>
            {!isCollapsed && (
              <button
                onClick={(e) => handleDeleteChat(e, chat.id)}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-opacity
                  text-red-500 opacity-0 group-hover:opacity-100
                  ${themeConfig.chat.container.includes('gray-800') ? 'hover:bg-red-900' : 'hover:bg-red-100'}`}
                title="Delete chat"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        ))}

        {chats.length === 0 && !isCollapsed && (
          <div className="p-4 text-center">
            <p className={`text-sm ${themeConfig.textMuted}`}>No chat history yet</p>
          </div>
        )}
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <button
          onClick={() => onSelectChat('new')}
          className={`w-full py-2 px-3 flex items-center justify-center space-x-2 
            bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg
            hover:opacity-90 transition-opacity`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          {!isCollapsed && <span>New Chat</span>}
        </button>
      </div>
    </div>
  );
} 