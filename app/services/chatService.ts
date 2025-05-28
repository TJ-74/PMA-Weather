import { 
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  where,
  getDocs,
  DocumentData,
  arrayUnion,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  weatherData?: {
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
  };
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  userId: string;
  timestamp: any;
  lastMessage: string;
}

export const chatService = {
  async createChat(userId: string, initialMessage: string): Promise<string> {
    const timestamp = Date.now();
    const chatRef = await addDoc(collection(db, 'chats'), {
      userId,
      title: initialMessage.slice(0, 30) + '...',
      timestamp: serverTimestamp(),
      lastMessage: initialMessage,
      messages: [{
        role: 'user',
        content: initialMessage,
        timestamp
      }]
    });
    return chatRef.id;
  },

  async addMessage(chatId: string, message: Message): Promise<void> {
    // Validate required fields
    if (!message.role || !message.content || !message.timestamp) {
      throw new Error('Message must have role, content, and timestamp');
    }

    // Create a clean message object with only the required fields
    const cleanMessage: Message = {
      role: message.role,
      content: message.content,
      timestamp: message.timestamp
    };

    // Add weatherData only if it exists and has all required fields
    if (message.weatherData && 
        message.weatherData.coordinates && 
        typeof message.weatherData.coordinates.lat === 'number' && 
        typeof message.weatherData.coordinates.lon === 'number' && 
        message.weatherData.city &&
        typeof message.weatherData.temperature === 'number' &&
        typeof message.weatherData.feels_like === 'number' &&
        message.weatherData.description &&
        typeof message.weatherData.humidity === 'number' &&
        typeof message.weatherData.wind_speed === 'number' &&
        message.weatherData.sunrise &&
        message.weatherData.sunset) {
      cleanMessage.weatherData = {
        coordinates: message.weatherData.coordinates,
        city: message.weatherData.city,
        temperature: message.weatherData.temperature,
        feels_like: message.weatherData.feels_like,
        description: message.weatherData.description,
        humidity: message.weatherData.humidity,
        wind_speed: message.weatherData.wind_speed,
        sunrise: message.weatherData.sunrise,
        sunset: message.weatherData.sunset
      };
    }

    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      messages: arrayUnion(cleanMessage),
      lastMessage: message.content,
      timestamp: serverTimestamp()
    });
  },

  async getChatMessages(chatId: string): Promise<Message[]> {
    const chatSnap = await getDocs(query(collection(db, 'chats'), where('__name__', '==', chatId)));
    const chatData = chatSnap.docs[0]?.data();
    return chatData?.messages || [];
  },

  async deleteChat(chatId: string): Promise<void> {
    const chatRef = doc(db, 'chats', chatId);
    await deleteDoc(chatRef);
  },

  async processAIResponse(chatId: string, userMessage: string): Promise<Message> {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.content,
        timestamp: Date.now(),
      };

      if (data.weatherData) {
        assistantMessage.weatherData = data.weatherData;
      }

      await this.addMessage(chatId, assistantMessage);
      return assistantMessage;
    } catch (error) {
      console.error('Error processing AI response:', error);
      throw error;
    }
  }
}; 