'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useTheme } from '../providers/ThemeProvider';
import ChatHistory from './ChatHistory';
import { chatService, Message } from '../services/chatService';
import ReactMarkdown from 'react-markdown';
import dynamic from 'next/dynamic';
import { onSnapshot, query, collection, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import WeatherForecast from './WeatherForecast';
import { generateWeatherReportPDF, generateQuickWeatherPDF } from '../utils/pdfExport';

const WeatherMap = dynamic(() => import('./WeatherMap'), { ssr: false });

interface WeatherData {
  coordinates: {
    lat: number;
    lon: number;
  };
  city: string;
  temperature: number;
  feels_like: number;
  description: string;
  humidity: number;
  wind_speed: number;
  sunrise: string;
  sunset: string;
  forecast?: {
    date: string;
    temp: number;
    description: string;
    icon: string;
  }[];
}

interface ExtendedMessage extends Message {
  weatherData?: WeatherData;
}

interface ChatProps {
  isSidebarOpen: boolean;
  onSidebarClose: () => void;
  onDeleteChat?: (chatId: string, chatTitle: string) => void;
}

export default function Chat({ isSidebarOpen, onSidebarClose, onDeleteChat }: ChatProps) {
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null); // For tracking which AI report is loading
  const [loadingFullChat, setLoadingFullChat] = useState(false); // For tracking full chat export loading
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState<{ [key: string]: boolean }>({});
  const [temperatureUnit, setTemperatureUnit] = useState<'C' | 'F'>('C'); // Temperature unit toggle
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { themeConfig } = useTheme();
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [selectedWeatherData, setSelectedWeatherData] = useState<WeatherData | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [showForecast, setShowForecast] = useState(false);

  // Temperature conversion functions
  const convertTemperature = (tempC: number, unit: 'C' | 'F'): number => {
    if (unit === 'F') {
      return Math.round((tempC * 9/5) + 32);
    }
    return Math.round(tempC);
  };

  const formatTemperature = (tempC: number, unit: 'C' | 'F'): string => {
    const converted = convertTemperature(tempC, unit);
    return `${converted}°${unit}`;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for real-time updates to the current chat
  useEffect(() => {
    if (!currentChatId || !user) return;

    const q = query(
      collection(db, 'chats'),
      where('__name__', '==', currentChatId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatData = snapshot.docs[0]?.data();
      if (chatData && chatData.messages) {
        setMessages(chatData.messages);
        
        // Check if the latest assistant message contains forecast data and the user query was forecast-focused
        const lastMessage = chatData.messages[chatData.messages.length - 1];
        const secondLastMessage = chatData.messages[chatData.messages.length - 2];
        
        if (lastMessage?.weatherData && 
            lastMessage.weatherData.coordinates && 
            lastMessage.weatherData.city &&
            typeof lastMessage.weatherData.temperature === 'number' &&
            typeof lastMessage.weatherData.feels_like === 'number' &&
            lastMessage.weatherData.description &&
            typeof lastMessage.weatherData.humidity === 'number' &&
            typeof lastMessage.weatherData.wind_speed === 'number' &&
            lastMessage.weatherData.sunrise &&
            lastMessage.weatherData.sunset) {
          setSelectedWeatherData(lastMessage.weatherData);
          
          // Auto-show forecast if user asked for forecast-related information
          if (secondLastMessage?.role === 'user' && secondLastMessage.content) {
            const userQuery = secondLastMessage.content.toLowerCase();
            const forecastKeywords = ['forecast', 'tomorrow', 'next week', 'will it rain', 'going to', 'next few days', 'week ahead', 'upcoming weather'];
            const isForecastQuery = forecastKeywords.some(keyword => userQuery.includes(keyword));
            setShowForecast(isForecastQuery);
          }
        } else {
          setSelectedWeatherData(null);
          setIsMapOpen(false);
          setShowForecast(false);
        }
      }
    });

    return () => unsubscribe();
  }, [currentChatId, user]);

  const handleSelectChat = async (chatId: string) => {
    if (chatId === 'new') {
      setCurrentChatId(null);
      setMessages([]);
      setSelectedWeatherData(null);
      setIsMapOpen(false);
      return;
    }
    
    setCurrentChatId(chatId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const userMessage: ExtendedMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    };

    let chatId = currentChatId;
    if (!chatId) {
      chatId = await chatService.createChat(user.uid, input);
      setCurrentChatId(chatId);
    } else {
      await chatService.addMessage(chatId, userMessage);
    }

    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      const assistantMessage: ExtendedMessage = {
        role: 'assistant',
        content: data.content || 'Sorry, I encountered an error.',
        timestamp: Date.now(),
        weatherData: data.weatherData
      };

      await chatService.addMessage(chatId, assistantMessage);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: ExtendedMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: Date.now()
      };
      await chatService.addMessage(chatId, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewMap = (weatherData: WeatherData) => {
    setSelectedWeatherData(weatherData);
    setIsMapOpen(true);
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] w-full overflow-hidden">
      {/* Chat History Sidebar */}
      <div
        className={`
          ${isSidebarOpen ? 'w-80' : 'w-0'} 
          flex-shrink-0 transition-all duration-300 ease-in-out 
          ${themeConfig.chat.container} ${themeConfig.border}
          border-r overflow-hidden
          md:relative fixed inset-y-0 left-0 z-50
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className={`flex flex-col h-full w-80 ${isSidebarOpen ? '' : 'opacity-0 md:opacity-100'} transition-opacity duration-300`}>
          <div className="flex-1 overflow-y-auto">
            <ChatHistory
              onSelectChat={(chatId) => {
                handleSelectChat(chatId);
                // Only close sidebar on mobile screens
                if (window.innerWidth < 768) {
                  onSidebarClose();
                }
              }}
              currentChatId={currentChatId}
              onDeleteChat={onDeleteChat}
            />
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8 sm:py-16 px-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 transform rotate-12 hover:rotate-0 transition-all duration-300">
                  <svg
                    className="w-8 h-8 sm:w-10 sm:h-10 text-white transform -rotate-12 group-hover:rotate-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h3 className={`text-xl sm:text-2xl font-bold ${themeConfig.text} mb-2 sm:mb-3`}>Ask About Weather</h3>
                <p className={`${themeConfig.textMuted} max-w-md mx-auto mb-6 sm:mb-8 text-sm sm:text-base px-2`}>
                  Get real-time weather updates for any location! Try asking about temperature, forecast, or current conditions.
                </p>

                {/* Sample Questions */}
                <div className="max-w-2xl mx-auto">
                  <p className={`text-xs sm:text-sm font-medium ${themeConfig.text} mb-3 sm:mb-4`}>Try these sample questions:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {[
                      "What's the weather in New York?",
                      "What's the forecast for London?",
                      "Will it rain in Tokyo tomorrow?",
                      "Show me the weather forecast for Paris",
                      "What's the humidity in Miami?",
                      "How's the weather this week in Los Angeles?"
                    ].map((question, index) => (
                      <button
                        key={index}
                        onClick={async () => {
                          if (!user || isLoading) return;
                          
                          const userMessage: ExtendedMessage = {
                            role: 'user',
                            content: question,
                            timestamp: Date.now()
                          };

                          let chatId = currentChatId;
                          if (!chatId) {
                            chatId = await chatService.createChat(user.uid, question);
                            setCurrentChatId(chatId);
                          } else {
                            await chatService.addMessage(chatId, userMessage);
                          }

                          setIsLoading(true);

                          try {
                            const response = await fetch('/api/chat', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                messages: [...messages, userMessage].map(msg => ({
                                  role: msg.role,
                                  content: msg.content
                                }))
                              }),
                            });

                            if (!response.ok) {
                              throw new Error('Failed to get response');
                            }

                            const data = await response.json();
                            const assistantMessage: ExtendedMessage = {
                              role: 'assistant',
                              content: data.content || 'Sorry, I encountered an error.',
                              timestamp: Date.now(),
                              weatherData: data.weatherData
                            };

                            await chatService.addMessage(chatId, assistantMessage);
                          } catch (error) {
                            console.error('Error:', error);
                            const errorMessage: ExtendedMessage = {
                              role: 'assistant',
                              content: 'Sorry, I encountered an error while processing your request. Please try again.',
                              timestamp: Date.now()
                            };
                            await chatService.addMessage(chatId, errorMessage);
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                        disabled={isLoading}
                        className={`p-2.5 sm:p-3 rounded-xl border ${themeConfig.border} text-left transition-all duration-200 cursor-pointer hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                          themeConfig.background.includes('gray-900')
                            ? 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-200'
                            : 'bg-white/50 hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs sm:text-sm leading-relaxed">{question}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className={`text-xs ${themeConfig.textMuted} mt-3 sm:mt-4 px-2`}>
                    Click any question to send it directly, or type your own weather question below.
                  </p>
                </div>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                } mb-4`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 sm:p-4 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                      : `${themeConfig.chat.container} border ${themeConfig.border}`
                  }`}
                >
                  {message.role === 'assistant' && message.weatherData ? (
                    <>
                      <div className="space-y-3 sm:space-y-4">
                        <div className={themeConfig.text}>
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                        
                        {/* Mobile-optimized weather data grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                          <div className="flex items-center space-x-2 p-2 rounded-lg bg-gradient-to-r from-blue-500/5 to-purple-600/5">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-600/10 flex items-center justify-center flex-shrink-0">
                              <svg className="w-3 h-3 sm:w-5 sm:h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                              </svg>
                            </div>
                            <div className="leading-tight min-w-0 flex-1">
                              <div className={`text-xs sm:text-sm ${themeConfig.textMuted}`}>Temperature</div>
                              <div className={`font-medium text-sm sm:text-base ${themeConfig.text} truncate`}>{formatTemperature(message.weatherData.temperature, temperatureUnit)}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 p-2 rounded-lg bg-gradient-to-r from-blue-500/5 to-purple-600/5">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-600/10 flex items-center justify-center flex-shrink-0">
                              <svg className="w-3 h-3 sm:w-5 sm:h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                              </svg>
                            </div>
                            <div className="leading-tight min-w-0 flex-1">
                              <div className={`text-xs sm:text-sm ${themeConfig.textMuted}`}>Feels Like</div>
                              <div className={`font-medium text-sm sm:text-base ${themeConfig.text} truncate`}>{formatTemperature(message.weatherData.feels_like, temperatureUnit)}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 p-2 rounded-lg bg-gradient-to-r from-blue-500/5 to-purple-600/5">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-600/10 flex items-center justify-center flex-shrink-0">
                              <svg className="w-3 h-3 sm:w-5 sm:h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                              </svg>
                            </div>
                            <div className="leading-tight min-w-0 flex-1">
                              <div className={`text-xs sm:text-sm ${themeConfig.textMuted}`}>Conditions</div>
                              <div className={`font-medium text-sm sm:text-base ${themeConfig.text} truncate`}>{message.weatherData.description}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 p-2 rounded-lg bg-gradient-to-r from-blue-500/5 to-purple-600/5">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-600/10 flex items-center justify-center flex-shrink-0">
                              <svg className="w-3 h-3 sm:w-5 sm:h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                              </svg>
                            </div>
                            <div className="leading-tight min-w-0 flex-1">
                              <div className={`text-xs sm:text-sm ${themeConfig.textMuted}`}>Humidity</div>
                              <div className={`font-medium text-sm sm:text-base ${themeConfig.text}`}>{message.weatherData.humidity}%</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 p-2 rounded-lg bg-gradient-to-r from-blue-500/5 to-purple-600/5">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-600/10 flex items-center justify-center flex-shrink-0">
                              <svg className="w-3 h-3 sm:w-5 sm:h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                              </svg>
                            </div>
                            <div className="leading-tight min-w-0 flex-1">
                              <div className={`text-xs sm:text-sm ${themeConfig.textMuted}`}>Wind Speed</div>
                              <div className={`font-medium text-sm sm:text-base ${themeConfig.text}`}>{message.weatherData.wind_speed} km/h</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 p-2 rounded-lg bg-gradient-to-r from-blue-500/5 to-purple-600/5">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-600/10 flex items-center justify-center flex-shrink-0">
                              <svg className="w-3 h-3 sm:w-5 sm:h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                            </div>
                            <div className="leading-tight min-w-0 flex-1">
                              <div className={`text-xs sm:text-sm ${themeConfig.textMuted}`}>Sunrise</div>
                              <div className={`font-medium text-sm sm:text-base ${themeConfig.text} truncate`}>{message.weatherData.sunrise}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 p-2 rounded-lg bg-gradient-to-r from-blue-500/5 to-purple-600/5">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-600/10 flex items-center justify-center flex-shrink-0">
                              <svg className="w-3 h-3 sm:w-5 sm:h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                              </svg>
                            </div>
                            <div className="leading-tight min-w-0 flex-1">
                              <div className={`text-xs sm:text-sm ${themeConfig.textMuted}`}>Sunset</div>
                              <div className={`font-medium text-sm sm:text-base ${themeConfig.text} truncate`}>{message.weatherData.sunset}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Mobile-optimized action section */}
                      <div className={`mt-3 sm:mt-4 pt-3 border-t ${themeConfig.border}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-600/20 flex items-center justify-center flex-shrink-0">
                              <svg className="w-3 h-3 sm:w-5 sm:h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            <span className={`font-medium text-sm sm:text-base ${themeConfig.text} truncate`}>{message.weatherData.city}</span>
                          </div>
                        </div>
                        
                        {/* Mobile-optimized button layout */}
                        <div className="space-y-2">
                          {/* Primary actions row */}
                          <div className="flex flex-wrap gap-2">
                            {/* Temperature Unit Toggle */}
                            <button
                              onClick={() => setTemperatureUnit(temperatureUnit === 'C' ? 'F' : 'C')}
                              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-gradient-to-r from-orange-500/10 to-red-600/10 text-orange-600 hover:text-orange-700 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                              title={`Switch to ${temperatureUnit === 'C' ? 'Fahrenheit' : 'Celsius'}`}
                            >
                              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              <span className="text-xs sm:text-sm">°{temperatureUnit === 'C' ? 'F' : 'C'}</span>
                            </button>
                            
                            {/* AI Report button */}
                            <button
                              onClick={async () => {
                                if (message.weatherData) {
                                  const buttonId = `pdf-${index}`;
                                  setLoadingPdfId(buttonId);
                                  try {
                                    await generateQuickWeatherPDF(message.weatherData, temperatureUnit);
                                  } catch (error) {
                                    console.error('Error generating PDF:', error);
                                  } finally {
                                    setLoadingPdfId(null);
                                  }
                                }
                              }}
                              disabled={loadingPdfId === `pdf-${index}`}
                              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-gradient-to-r from-green-500/10 to-emerald-600/10 text-green-600 hover:text-green-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                              title="Export this weather data as AI-generated PDF report"
                            >
                              {loadingPdfId === `pdf-${index}` ? (
                                <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              )}
                              <span className="hidden sm:inline">{loadingPdfId === `pdf-${index}` ? 'Generating...' : 'AI Report'}</span>
                              <span className="sm:hidden">PDF</span>
                            </button>
                          </div>
                          
                          {/* Secondary actions row */}
                          <div className="flex flex-wrap gap-2">
                            {message.weatherData.forecast && (
                              <button
                                onClick={() => setShowForecast(!showForecast)}
                                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-gradient-to-r from-blue-500/10 to-purple-600/10 text-blue-500 hover:text-blue-600 rounded-lg transition-colors cursor-pointer flex-1 min-w-0"
                              >
                                <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="truncate text-xs sm:text-sm">{showForecast ? 'Hide Forecast' : 'View Forecast'}</span>
                              </button>
                            )}
                            <button
                              onClick={() => message.weatherData && handleViewMap(message.weatherData)}
                              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-gradient-to-r from-blue-500/10 to-purple-600/10 text-blue-500 hover:text-blue-600 rounded-lg transition-colors cursor-pointer flex-1 min-w-0"
                            >
                              <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                              </svg>
                              <span className="truncate text-xs sm:text-sm">View Map</span>
                            </button>
                          </div>
                        </div>
                        
                        {/* Forecast section */}
                        {showForecast && message.weatherData.forecast && (
                          <div className="mt-3 sm:mt-4 border-t pt-3 sm:pt-4 bg-gradient-to-r from-blue-500/5 to-purple-600/5 rounded-lg">
                            <WeatherForecast 
                              forecast={message.weatherData.forecast} 
                              temperatureUnit={temperatureUnit}
                              formatTemperature={formatTemperature}
                            />
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className={message.role === 'user' ? 'text-white' : themeConfig.text}>
                      <ReactMarkdown
                        components={{
                          p: ({children}) => <p className="mb-2 last:mb-0 text-sm sm:text-base">{children}</p>,
                          ul: ({children}) => <ul className="list-disc ml-4 mb-2 text-sm sm:text-base">{children}</ul>,
                          li: ({children}) => <li className="mb-1 text-sm sm:text-base">{children}</li>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 sm:p-4 ${themeConfig.chat.messages.loading}`}>
                  <div className="flex space-x-2">
                    <div className={`w-2 h-2 rounded-full animate-bounce ${themeConfig.textMuted.includes('gray-400') ? 'bg-gray-400' : 'bg-gray-500'}`} />
                    <div className={`w-2 h-2 rounded-full animate-bounce delay-100 ${themeConfig.textMuted.includes('gray-400') ? 'bg-gray-400' : 'bg-gray-500'}`} />
                    <div className={`w-2 h-2 rounded-full animate-bounce delay-200 ${themeConfig.textMuted.includes('gray-400') ? 'bg-gray-400' : 'bg-gray-500'}`} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className={`p-3 sm:p-4 border-t ${themeConfig.border} flex-shrink-0`}>
            <div className="flex items-end space-x-2">
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about weather..."
                  className={`w-full p-3 rounded-xl border ${themeConfig.chat.input.background} ${themeConfig.chat.input.text} ${themeConfig.border} focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base transition-all`}
                />
              </div>
              
              {/* Mobile-optimized button row */}
              <div className="flex items-center space-x-2 flex-shrink-0">
                {/* Full chat export button */}
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      setLoadingFullChat(true);
                      try {
                        const chatMessages = messages.map(msg => ({
                          role: msg.role,
                          content: msg.content,
                          timestamp: msg.timestamp,
                          weatherData: msg.weatherData
                        }));
                        await generateWeatherReportPDF(chatMessages, 'Weather Chat Report', temperatureUnit);
                      } catch (error) {
                        console.error('Error generating PDF:', error);
                      } finally {
                        setLoadingFullChat(false);
                      }
                    }}
                    disabled={loadingFullChat}
                    className="p-2.5 sm:p-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:opacity-90 transition-opacity flex-shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Export full chat as AI-generated PDF report"
                  >
                    {loadingFullChat ? (
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                  </button>
                )}
                
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer text-sm sm:text-base font-medium flex-shrink-0"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="hidden sm:inline">Sending...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Send</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Weather Map Panel */}
        {isMapOpen && selectedWeatherData && (
          <>
            {/* Mobile backdrop overlay */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => {
                setIsMapOpen(false);
                setSelectedWeatherData(null);
              }}
            />
            
            <div className={`
              w-full lg:w-[500px] flex-shrink-0 
              fixed lg:relative inset-0 lg:inset-auto
              border-l ${themeConfig.border} ${themeConfig.chat.container} shadow-lg
              z-50 lg:z-auto
              flex flex-col
            `}>
              <div className="p-3 sm:p-4 flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-purple-600/10 border-b border-blue-500/20">
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <span className={`font-medium text-sm sm:text-base ${themeConfig.text} truncate`}>Weather Map - {selectedWeatherData.city}</span>
                </div>
                <button 
                  onClick={() => {
                    setIsMapOpen(false);
                    setSelectedWeatherData(null);
                  }}
                  className={`p-1.5 sm:p-2 rounded-lg transition-colors ${themeConfig.textMuted} ${
                    themeConfig.chat.container.includes('gray-800') ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  } cursor-pointer flex-shrink-0`}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <WeatherMap
                  lat={selectedWeatherData.coordinates.lat}
                  lon={selectedWeatherData.coordinates.lon}
                  cityName={selectedWeatherData.city}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 