'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from '../providers/ThemeProvider';

interface WeatherForecastProps {
  forecast: {
    date: string;
    temp: number;
    description: string;
    icon: string;
  }[];
  temperatureUnit?: 'C' | 'F';
  formatTemperature?: (tempC: number, unit: 'C' | 'F') => string;
}

export default function WeatherForecast({ 
  forecast, 
  temperatureUnit = 'C', 
  formatTemperature 
}: WeatherForecastProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isDark } = useTheme();

  // Helper function to convert temperature
  const convertTemp = (tempC: number): number => {
    if (temperatureUnit === 'F') {
      return Math.round((tempC * 9/5) + 32);
    }
    return Math.round(tempC);
  };

  // Helper function to format temperature display
  const formatTempDisplay = (tempC: number): string => {
    if (formatTemperature) {
      return formatTemperature(tempC, temperatureUnit);
    }
    return `${convertTemp(tempC)}°${temperatureUnit}`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !forecast) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set styles based on theme
    const textColor = isDark ? '#fff' : '#1a1a1a';
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    
    // Find temperature range (using converted temperatures)
    const temps = forecast.map(day => convertTemp(day.temp));
    const maxTemp = Math.ceil(Math.max(...temps));
    const minTemp = Math.floor(Math.min(...temps));
    const tempRange = maxTemp - minTemp;

    // Calculate dimensions
    const padding = 40;
    const graphWidth = canvas.width - (padding * 2);
    const graphHeight = canvas.height - (padding * 2);
    const dayWidth = graphWidth / (forecast.length - 1);

    // Draw grid
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding + (graphHeight * (i / 4));
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();
      
      // Temperature labels
      const temp = maxTemp - ((maxTemp - minTemp) * (i / 4));
      ctx.fillStyle = textColor;
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(temp)}°${temperatureUnit}`, padding - 10, y + 4);
    }

    // Draw temperature line
    ctx.beginPath();
    ctx.strokeStyle = 'rgb(59, 130, 246)';
    ctx.lineWidth = 3;
    
    forecast.forEach((day, i) => {
      const x = padding + (i * dayWidth);
      const convertedTemp = convertTemp(day.temp);
      const normalizedTemp = (convertedTemp - minTemp) / tempRange;
      const y = padding + (graphHeight * (1 - normalizedTemp));
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      // Draw point
      ctx.fillStyle = 'rgb(59, 130, 246)';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Draw date
      ctx.fillStyle = textColor;
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      const date = new Date(day.date);
      const formattedDate = date.toLocaleDateString('en-US', { weekday: 'short' });
      ctx.fillText(formattedDate, x, canvas.height - 10);

      // Draw temperature
      ctx.fillStyle = textColor;
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(formatTempDisplay(day.temp), x, y - 15);
    });
    
    ctx.stroke();

  }, [forecast, isDark, temperatureUnit, formatTemperature]);

  return (
    <div className="w-full h-full min-h-[300px] p-4">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
} 