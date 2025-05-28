# PM Weather Bot 🌤️

Your Personal Weather Assistant powered by AI - Get real-time weather updates, interactive maps, and intelligent forecasts through natural conversation.

![PM Weather Bot](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=Firebase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

## 🌟 About the Project

PM Weather Bot is an intelligent weather assistant that combines the power of AI with real-time weather data to provide users with comprehensive weather insights through natural conversation. Built with modern web technologies, it offers an intuitive chat interface, interactive weather maps, and personalized weather experiences.

### ✨ Key Features

- **🤖 AI-Powered Chat Interface**: Natural language conversations about weather
- **🗺️ Interactive Weather Maps**: Visual weather data with Leaflet.js integration
- **🌡️ Real-time Weather Data**: Accurate weather information from OpenWeatherMap API
- **💬 Chat History**: Persistent conversation history with Firebase
- **🌙 Dark/Light Theme**: Beautiful theme switching with smooth transitions
- **📱 Responsive Design**: Works seamlessly on desktop and mobile devices
- **🔐 User Authentication**: Secure login with Firebase Auth (Email/Google)
- **⚡ Real-time Updates**: Live chat synchronization across devices

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **React Markdown** - Markdown rendering for chat messages

### Backend & Services
- **Firebase Firestore** - NoSQL database for chat storage
- **Firebase Authentication** - User authentication
- **OpenWeatherMap API** - Weather data provider
- **Groq API** - AI chat functionality

### Maps & Visualization
- **Leaflet.js** - Interactive maps
- **OpenStreetMap** - Map tiles
- **OpenWeatherMap Tiles** - Weather overlay data

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (version 18 or higher)
- **pnpm** (version 8 or higher)
- **Git**

### Required API Keys

You'll need to obtain the following API keys:

1. **OpenWeatherMap API Key**
   - Visit [OpenWeatherMap](https://openweathermap.org/api)
   - Sign up for a free account
   - Generate an API key

2. **Groq API Key**
   - Visit [Groq Console](https://console.groq.com/)
   - Create an account and generate an API key

3. **Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Firestore Database and Authentication
   - Get your Firebase configuration

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/pm-weather-bot.git
   cd pm-weather-bot
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Setup**
   
   Create a `.env.local` file in the root directory:
   ```env
   # OpenWeatherMap API
   NEXT_PUBLIC_OPENWEATHER_API_KEY=your_openweather_api_key_here
   
   # Groq API
   GROQ_API_KEY=your_groq_api_key_here
   
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. **Firebase Setup**
   
   - Enable **Firestore Database** in your Firebase project
   - Enable **Authentication** and configure Email/Password and Google providers
   - Set up Firestore security rules:
   
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /chats/{chatId} {
         allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
         allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
       }
     }
   }
   ```

5. **Run the development server**
   ```bash
   pnpm dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

## 📖 Usage

### Getting Started with PM Weather Bot

1. **Sign Up/Login**
   - Create an account using email/password or Google authentication
   - Your chat history will be saved and synced across devices

2. **Ask About Weather**
   - Type natural language questions like:
     - "What's the weather in New York?"
     - "Will it rain tomorrow in London?"
     - "Show me the temperature in Tokyo"

3. **Explore Weather Maps**
   - Click "View Map" on weather responses to see interactive maps
   - Explore temperature overlays and location details

4. **Manage Chat History**
   - Access previous conversations from the sidebar
   - Delete unwanted chats
   - Start new conversations anytime

5. **Theme Switching**
   - Toggle between light and dark themes using the theme button
   - Your preference is saved automatically

## 🏗️ Project Structure

```
pm-weather-bot/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # Chat API endpoint
│   │   ├── components/
│   │   │   ├── AuthLayout.tsx        # Authentication layout
│   │   │   ├── Chat.tsx              # Main chat interface
│   │   │   ├── ChatHistory.tsx       # Chat history sidebar
│   │   │   ├── Navbar.tsx            # Navigation bar
│   │   │   ├── ProtectedRoute.tsx    # Route protection
│   │   │   └── WeatherMap.tsx        # Interactive weather map
│   │   ├── dashboard/
│   │   │   └── page.tsx              # Dashboard page
│   │   ├── lib/
│   │   │   └── firebase.ts           # Firebase configuration
│   │   ├── login/
│   │   │   └── page.tsx              # Login page
│   │   ├── providers/
│   │   │   ├── AuthProvider.tsx      # Authentication context
│   │   │   └── ThemeProvider.tsx     # Theme context
│   │   ├── services/
│   │   │   └── chatService.ts        # Chat service functions
│   │   ├── globals.css               # Global styles
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Home page
│   ├── public/
│   │   └── google.svg                # Google icon
│   ├── .env.local                    # Environment variables
│   ├── next.config.js                # Next.js configuration
│   ├── package.json                  # Dependencies
│   └── tailwind.config.js            # Tailwind configuration
└── README.md                     # This file
```

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Visit [Vercel](https://vercel.com)
   - Import your GitHub repository
   - Add environment variables in Vercel dashboard
   - Deploy automatically

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenWeatherMap** for providing weather data API
- **Groq** for AI chat capabilities
- **Firebase** for backend services
- **Leaflet.js** for interactive maps
- **Tailwind CSS** for styling framework
- **Next.js** team for the amazing framework

---

**Built with ❤️ by [Your Name]**

*PM Weather Bot - Making weather information accessible through intelligent conversation.*