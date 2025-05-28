'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../providers/ThemeProvider';

interface WeatherMapProps {
  lat: number;
  lon: number;
  cityName: string;
}

export default function WeatherMap({ lat, lon, cityName }: WeatherMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { themeConfig } = useTheme();
  const isDark = themeConfig.chat.messages.assistant.includes('dark');

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up existing map instance
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Initialize map
    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
      dragging: true
    }).setView([lat, lon], 10);

    // Add OpenStreetMap base layer with theme-aware styling
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      className: isDark ? 'dark-tiles' : ''
    }).addTo(mapRef.current);

    // Add city marker with custom icon
    const icon = L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div style="
          background: linear-gradient(to right, #3b82f6, #8b5cf6);
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        ">
          <div style="
            width: 8px;
            height: 8px;
            background: white;
            border-radius: 50%;
          "></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const marker = L.marker([lat, lon], { icon })
      .addTo(mapRef.current)
      .bindPopup(`
        <div style="
          text-align: center;
          padding: 8px;
          background: ${isDark ? 'rgba(31, 41, 55, 0.95)' : 'white'};
          color: ${isDark ? 'white' : 'black'};
          border-radius: 8px;
          min-width: 150px;
        ">
          <div style="font-weight: 600; margin-bottom: 4px;">${cityName}</div>
          <div style="font-size: 12px; opacity: 0.75;">
            ${lat.toFixed(4)}, ${lon.toFixed(4)}
          </div>
        </div>
      `, {
        className: isDark ? 'dark-popup' : ''
      })
      .openPopup();

    // Add OpenWeatherMap temperature layer
    const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
    if (apiKey) {
      L.tileLayer(
        `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${apiKey}`,
        {
          attribution: '© OpenWeatherMap',
          maxZoom: 18,
          opacity: 0.7
        }
      ).addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lat, lon, cityName, isDark]);

  return (
    <div className="w-full h-full relative">
      <div 
        ref={mapContainerRef} 
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ 
          backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` 
        }}
      />
      <style jsx global>{`
        .dark-tiles {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }
        .dark-popup .leaflet-popup-content-wrapper {
          background: rgba(31, 41, 55, 0.95);
          color: white;
        }
        .dark-popup .leaflet-popup-tip {
          background: rgba(31, 41, 55, 0.95);
        }
        .custom-div-icon {
          background: transparent;
          border: none;
        }
      `}</style>
    </div>
  );
} 