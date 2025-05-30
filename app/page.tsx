'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from './providers/ThemeProvider';
import Navbar from './components/Navbar';
import Image from 'next/image';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export default function Home() {
  const { themeConfig } = useTheme();

  const features: FeatureCardProps[] = [
    {
      title: "Real-time Weather Updates",
      description: "Get instant, accurate weather information for any location worldwide with detailed metrics and forecasts.",
      icon: (
        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      )
    },
    {
      title: "Interactive Weather Maps",
      description: "Explore dynamic weather patterns and conditions through our interactive mapping interface.",
      icon: (
        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      )
    },
    {
      title: "AI-Powered Insights",
      description: "Experience natural conversations about weather with our advanced AI assistant.",
      icon: (
        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    }
  ];

  return (
    <div className={`min-h-screen ${themeConfig.background}`}>
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-8 bg-clip-text text-transparent 
              bg-gradient-to-r from-blue-500 to-purple-600 leading-tight">
              Your Personal Weather Assistant<br />
              Powered by AI
            </h1>
            <p className={`text-xl md:text-2xl mb-12 max-w-3xl mx-auto ${themeConfig.textMuted}`}>
              Get real-time weather updates, interactive maps, and intelligent forecasts through natural conversation.
              Experience weather information like never before.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link 
                href="/dashboard"
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white 
                  rounded-lg font-semibold text-lg hover:opacity-90 transition-all duration-300
                  shadow-lg hover:shadow-xl transform hover:-translate-y-1 cursor-pointer"
              >
                Try PM Weather Bot
              </Link>
              <a 
                href="#features"
                className={`px-8 py-4 border-2 border-blue-500 rounded-lg font-semibold 
                  text-lg hover:bg-blue-500 hover:text-white transition-all duration-300
                  ${themeConfig.text} transform hover:-translate-y-1 cursor-pointer`}
              >
                Learn More
              </a>
            </div>
          </div>
        </div>

        {/* Decorative blob shapes */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${themeConfig.text}`}>
              Powerful Features for Weather Insights
            </h2>
            <p className={`text-xl ${themeConfig.textMuted} max-w-2xl mx-auto`}>
              Everything you need to stay informed about weather conditions, all in one place.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className={`p-6 rounded-xl border ${themeConfig.border} 
                  backdrop-blur-sm bg-white/5 hover:bg-white/10
                  transform hover:-translate-y-1 transition-all duration-300`}
              >
                <div className="mb-4 inline-block p-3 rounded-lg bg-blue-500/10">
                  {feature.icon}
                </div>
                <h3 className={`text-xl font-semibold mb-3 ${themeConfig.text}`}>
                  {feature.title}
                </h3>
                <p className={`${themeConfig.textMuted}`}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`border-t ${themeConfig.border} py-12`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                </div>
                <span className={`text-xl font-bold ${themeConfig.text}`}>PM Weather Bot</span>
              </div>
              <p className={`${themeConfig.textMuted} mb-4 max-w-md`}>
                Your intelligent companion for weather insights. Get real-time updates, forecasts, and interactive maps through natural conversation.
              </p>
            </div>
            
            <div>
              <h4 className={`text-lg font-semibold mb-4 ${themeConfig.text}`}>Quick Links</h4>
              <ul className={`space-y-2 ${themeConfig.textMuted}`}>
                <li><Link href="/dashboard" className="hover:text-blue-500 transition-colors cursor-pointer">Dashboard</Link></li>
                <li><a href="#features" className="hover:text-blue-500 transition-colors cursor-pointer">Features</a></li>
                <li><Link href="/login" className="hover:text-blue-500 transition-colors cursor-pointer">Login</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className={`text-lg font-semibold mb-4 ${themeConfig.text}`}>Connect</h4>
              <ul className={`space-y-2 ${themeConfig.textMuted}`}>
                <li><a href="https://github.com/your-repo" className="hover:text-blue-500 transition-colors cursor-pointer">GitHub</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors cursor-pointer">Documentation</a></li>
                <li><a href="#" className="hover:text-blue-500 transition-colors cursor-pointer">Support</a></li>
              </ul>
            </div>
          </div>
          
          <div className={`mt-12 pt-8 border-t ${themeConfig.border} text-center ${themeConfig.textMuted}`}>
            <p>© {new Date().getFullYear()} PM Weather Bot. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
