'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useTheme } from '../providers/ThemeProvider';
import { chatService } from '../services/chatService';

interface ChatHistoryProps {
  onSelectChat: (chatId: string) => void;
  currentChatId: string | null;
  onDeleteChat?: (chatId: string, chatTitle: string) => void;
}

interface Chat {
  id: string;
  createdAt: number;
  messages: {
    content: string;
    role: string;
    timestamp: number;
  }[];
}

export default function ChatHistory({ onSelectChat, currentChatId, onDeleteChat }: ChatHistoryProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { themeConfig } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chats'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Chat[];
      
      chatData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setChats(chatData);
      setError(null);
    }, (error) => {
      console.error('Error fetching chats:', error);
      setError(error.message);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    // Listen for the confirm delete event from the modal
    const handleConfirmDelete = async (event: any) => {
      const { chatId } = event.detail;
      try {
        await chatService.deleteChat(chatId);
        if (currentChatId === chatId) {
          onSelectChat('new');
        }
      } catch (error) {
        console.error('Error deleting chat:', error);
        alert('Failed to delete chat. Please try again.');
      }
    };

    window.addEventListener('confirmDelete', handleConfirmDelete);
    return () => window.removeEventListener('confirmDelete', handleConfirmDelete);
  }, [currentChatId, onSelectChat]);

  const getFirstUserMessage = (messages: Chat['messages']) => {
    const userMessage = messages.find(m => m.role === 'user');
    return userMessage ? userMessage.content : 'New Chat';
  };

  const formatDate = (timestamp: number) => {
    // Check if timestamp is valid
    if (!timestamp || isNaN(timestamp) || timestamp <= 0) {
      return 'Recent';
    }

    const date = new Date(timestamp);
    
    // Check if the created date is valid
    if (isNaN(date.getTime())) {
      return 'Recent';
    }

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    // Create a new date object for yesterday to avoid mutating 'now'
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return 'Today';
    } else if (isYesterday) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const groupChatsByDate = (chats: Chat[]) => {
    const groups: { [key: string]: Chat[] } = {};
    
    chats.forEach(chat => {
      const date = formatDate(chat.createdAt);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(chat);
    });

    return groups;
  };

  const chatGroups = groupChatsByDate(chats);

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    const chat = chats.find(c => c.id === chatId);
    const chatTitle = chat ? getFirstUserMessage(chat.messages) : 'Unknown Chat';
    
    if (onDeleteChat) {
      // Use the beautiful modal
      onDeleteChat(chatId, chatTitle);
    } else {
      // Fallback to simple confirm dialog
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
    }
  };

  return (
    <div className="flex flex-col h-full">
      {error && error.includes('index') && (
        <div className={`p-4 border-l-4 border-yellow-400 ${
          themeConfig.background.includes('gray-900') 
            ? 'bg-yellow-900/20' 
            : 'bg-yellow-50'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className={`text-sm ${themeConfig.text}`}>
                Setting up database indexes. This may take a few minutes...
              </p>
              <p className="mt-1 text-sm text-yellow-500">
                Your chats will appear here shortly.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pt-4">
        {Object.entries(chatGroups).map(([date, dateChats]) => (
          <div key={date} className="mb-4">
            <div className="px-4 py-2">
              <h3 className={`text-xs font-medium ${themeConfig.textMuted}`}>{date}</h3>
            </div>
            <div className="space-y-1">
              {dateChats.map((chat) => (
                <div
                  key={chat.id}
                  className={`relative group w-full transition-colors duration-200 ${
                    currentChatId === chat.id
                      ? 'bg-gradient-to-r from-blue-500/10 to-purple-600/10'
                      : `${themeConfig.background.includes('gray-900') ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`
                  }`}
                >
                  <button
                    onClick={() => onSelectChat(chat.id)}
                    className="w-full px-4 py-3 text-left cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <svg className={`w-4 h-4 ${themeConfig.textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className={`text-sm truncate ${themeConfig.text} pr-8`}>
                        {getFirstUserMessage(chat.messages)}
                      </span>
                    </div>
                  </button>
                  
                  {/* Delete Button - appears on hover */}
                  <button
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100 cursor-pointer ${
                      themeConfig.background.includes('gray-900') 
                        ? 'hover:bg-red-600/20 text-red-400 hover:text-red-300' 
                        : 'hover:bg-red-100 text-red-500 hover:text-red-600'
                    }`}
                    title="Delete chat"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H9a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <button
          onClick={() => onSelectChat('new')}
          className={`w-full py-2 px-3 flex items-center justify-center space-x-2 
            bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg
            hover:opacity-90 transition-opacity cursor-pointer`}
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