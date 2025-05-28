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
}

interface ExtendedMessage extends Message {
  weatherData?: WeatherData;
}

export default function Chat() {
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { themeConfig } = useTheme();
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [selectedWeatherData, setSelectedWeatherData] = useState<WeatherData | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);

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
        
        // Update weather data if present in the last message
        const lastMessage = chatData.messages[chatData.messages.length - 1];
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
        } else {
          setSelectedWeatherData(null);
          setIsMapOpen(false);
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
    <div className="flex h-[calc(100vh-5rem)] relative overflow-hidden">
      <ChatHistory onSelectChat={handleSelectChat} currentChatId={currentChatId} />
      
      <div className={`flex-1 flex relative transition-all duration-300 ${isMapOpen ? 'mr-[500px]' : ''}`}>
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-12 hover:rotate-0 transition-all duration-300">
                  <svg
                    className="w-10 h-10 text-white transform -rotate-12 group-hover:rotate-0"
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
                <h3 className={`text-2xl font-bold ${themeConfig.text} mb-3`}>Ask About Weather</h3>
                <p className={`${themeConfig.textMuted} max-w-md mx-auto`}>
                  Get real-time weather updates for any location! Try asking about temperature, forecast, or current conditions.
                </p>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                      : `${themeConfig.chat.messages.assistant}`
                  }`}
                >
                  {message.role === 'assistant' && message.weatherData ? (
                    <>
                      <div className="space-y-4">
                        <div className={`mt-3 mb-4 ${themeConfig.textMuted}`}>
                          {message.content}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-600/10 flex items-center justify-center">
                              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                              </svg>
                            </div>
                            <div className="leading-tight">
                              <div className={`text-sm ${themeConfig.textMuted}`}>Temperature</div>
                              <div className={`font-medium ${themeConfig.text}`}>{message.weatherData.temperature}°C (Feels like {message.weatherData.feels_like}°C)</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-600/10 flex items-center justify-center">
                              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                              </svg>
                            </div>
                            <div className="leading-tight">
                              <div className={`text-sm ${themeConfig.textMuted}`}>Conditions</div>
                              <div className={`font-medium ${themeConfig.text}`}>{message.weatherData.description}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-600/10 flex items-center justify-center">
                              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                              </svg>
                            </div>
                            <div className="leading-tight">
                              <div className={`text-sm ${themeConfig.textMuted}`}>Humidity</div>
                              <div className={`font-medium ${themeConfig.text}`}>{message.weatherData.humidity}%</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-600/10 flex items-center justify-center">
                              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                              </svg>
                            </div>
                            <div className="leading-tight">
                              <div className={`text-sm ${themeConfig.textMuted}`}>Wind Speed</div>
                              <div className={`font-medium ${themeConfig.text}`}>{message.weatherData.wind_speed} km/h</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-600/10 flex items-center justify-center">
                              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                            </div>
                            <div className="leading-tight">
                              <div className={`text-sm ${themeConfig.textMuted}`}>Sunrise</div>
                              <div className={`font-medium ${themeConfig.text}`}>{message.weatherData.sunrise}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-600/10 flex items-center justify-center">
                              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                              </svg>
                            </div>
                            <div className="leading-tight">
                              <div className={`text-sm ${themeConfig.textMuted}`}>Sunset</div>
                              <div className={`font-medium ${themeConfig.text}`}>{message.weatherData.sunset}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className={`mt-4 pt-3 border-t ${themeConfig.border}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-600/20 flex items-center justify-center">
                              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            <span className={`font-medium ${themeConfig.text}`}>{message.weatherData.city}</span>
                          </div>
                          <button
                            onClick={() => message.weatherData && handleViewMap(message.weatherData)}
                            className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-gradient-to-r from-blue-500/10 to-purple-600/10 text-blue-500 hover:text-blue-600 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            <span>View Map</span>
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <ReactMarkdown
                      components={{
                        p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({children}) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                        li: ({children}) => <li className="mb-1">{children}</li>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className={`max-w-[70%] rounded-lg p-4 ${themeConfig.chat.messages.loading}`}>
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

          <form onSubmit={handleSubmit} className={`p-4 border-t ${themeConfig.border}`}>
            <div className="flex space-x-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about weather..."
                className={`flex-1 p-2 rounded-lg border ${themeConfig.chat.input.background} ${themeConfig.chat.input.text} ${themeConfig.border} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              <button
                type="submit"
                disabled={isLoading}
                className={`px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg
                  disabled:opacity-50 hover:opacity-90 transition-opacity`}
              >
                Send
              </button>
            </div>
          </form>
        </div>

        {/* Weather Map Panel */}
        <div 
          className={`w-[500px] fixed right-0 top-[5rem] bottom-0 border-l ${themeConfig.border}
            transition-transform duration-300 ${themeConfig.chat.container} shadow-lg
            ${isMapOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          {selectedWeatherData && (
            <>
              <div className="p-4 flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-purple-600/10">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <span className={`font-medium ${themeConfig.text}`}>Weather Map - {selectedWeatherData.city}</span>
                </div>
                <button 
                  onClick={() => {
                    setIsMapOpen(false);
                    setSelectedWeatherData(null);
                  }}
                  className={`p-2 rounded-lg transition-colors ${themeConfig.textMuted} ${
                    themeConfig.chat.container.includes('gray-800') ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="h-[calc(100vh-9rem)]">
                <WeatherMap
                  lat={selectedWeatherData.coordinates.lat}
                  lon={selectedWeatherData.coordinates.lon}
                  cityName={selectedWeatherData.city}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 