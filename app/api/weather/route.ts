import { NextResponse } from 'next/server';
import { weatherMCPClient } from '../../lib/weatherMCPClient';

// Weather MCP Client is imported and handles API key validation internally

function normalizeLocationQuery(query: string): string {
  return query
    .trim()
    .replace(/\s+/g, ' ') // normalize multiple spaces to single space
    .replace(/^(st\.|saint)\s+/i, 'Saint ') // normalize Saint abbreviations
    .replace(/,?\s*(?:united states|usa|us|america)$/i, '') // remove country if it's USA
    .replace(/,\s*([a-z]{2})$/i, ', $1') // format state codes properly (e.g., MO, NY)
    .replace(/([a-z])([A-Z])/g, '$1 $2'); // add space between camelCase
}



export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city');

  if (!city) {
    return NextResponse.json({ error: 'City parameter is required' }, { status: 400 });
  }

  try {
    // Normalize the location query first
    const normalizedCity = normalizeLocationQuery(city);

    // Use MCP client to get weather data
    const weatherData = await weatherMCPClient.getCurrentWeather(normalizedCity);

    return NextResponse.json({
      city: weatherData.location.name,
      coordinates: weatherData.location.coordinates,
      temperature: weatherData.current.temperature,
      feels_like: weatherData.current.feels_like,
      description: weatherData.current.description,
      humidity: weatherData.current.humidity,
      wind_speed: weatherData.current.wind_speed,
      sunrise: weatherData.current.sunrise,
      sunset: weatherData.current.sunset
    });
  } catch (error) {
    console.error('Weather API Error via MCP:', error);

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: 'City not found' }, { status: 404 });
      }
      if (error.message.includes('API key')) {
        return NextResponse.json({ error: 'Weather service configuration error' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Failed to fetch weather data' }, { status: 500 });
  }
} 