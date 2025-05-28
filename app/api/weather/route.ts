import OpenWeatherAPI from 'openweathermap-ts';
import { NextResponse } from 'next/server';

if (!process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY) {
  throw new Error('Missing NEXT_PUBLIC_OPENWEATHER_API_KEY environment variable');
}

const weatherClient = new OpenWeatherAPI({
  apiKey: process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY,
  units: "metric"
});

function normalizeLocationQuery(query: string): string {
  return query
    .trim()
    .replace(/\s+/g, ' ') // normalize multiple spaces to single space
    .replace(/^(st\.|saint)\s+/i, 'Saint ') // normalize Saint abbreviations
    .replace(/,?\s*(?:united states|usa|us|america)$/i, '') // remove country if it's USA
    .replace(/,\s*([a-z]{2})$/i, ', $1') // format state codes properly (e.g., MO, NY)
    .replace(/([a-z])([A-Z])/g, '$1 $2'); // add space between camelCase
}

async function getWeatherData(locationQuery: string) {
  try {
    // Normalize the location query
    const normalizedQuery = normalizeLocationQuery(locationQuery);
    
    // Try geocoding with the normalized query
    const geoResponse = await fetch(
      `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(normalizedQuery)}&limit=5&appid=${process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY}`
    );
    
    if (!geoResponse.ok) {
      throw new Error('Failed to geocode location');
    }

    const geoData = await geoResponse.json();
    
    if (!geoData || geoData.length === 0) {
      throw new Error(`Location "${locationQuery}" not found`);
    }

    // Find the best match from the results
    const location = geoData[0];
    
    // Get weather using coordinates for more accurate results
    const weather = await weatherClient.getCurrentWeatherByGeoCoordinates(
      location.lat,
      location.lon
    );

    if (!weather || !weather.main) {
      throw new Error('No weather data available');
    }

    // Include additional location context in the response
    const locationContext = location.state ? 
      `${location.name}, ${location.state}, ${location.country}` : 
      `${location.name}, ${location.country}`;

    return {
      ...weather,
      locationContext
    };
  } catch (error) {
    console.error('Weather lookup error:', error);
    throw error;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city');

  if (!city) {
    return NextResponse.json({ error: 'City parameter is required' }, { status: 400 });
  }

  const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
  if (!API_KEY) {
    return NextResponse.json({ error: 'OpenWeather API key not configured' }, { status: 500 });
  }

  try {
    // First, get coordinates for the city
    const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;
    const geoResponse = await fetch(geoUrl);
    const geoData = await geoResponse.json();

    if (!geoData || geoData.length === 0) {
      return NextResponse.json({ error: 'City not found' }, { status: 404 });
    }

    const { lat, lon } = geoData[0];

    // Then get weather data using coordinates
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
    const weatherResponse = await fetch(weatherUrl);
    const weatherData = await weatherResponse.json();

    if (weatherResponse.status !== 200) {
      return NextResponse.json({ error: weatherData.message || 'Failed to fetch weather data' }, { status: weatherResponse.status });
    }

    // Format sunrise and sunset times
    const sunrise = new Date(weatherData.sys.sunrise * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    const sunset = new Date(weatherData.sys.sunset * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    return NextResponse.json({
      city: weatherData.name,
      coordinates: {
        lat,
        lon
      },
      temperature: Math.round(weatherData.main.temp),
      feels_like: Math.round(weatherData.main.feels_like),
      description: weatherData.weather[0].description,
      humidity: weatherData.main.humidity,
      wind_speed: Math.round(weatherData.wind.speed),
      sunrise,
      sunset
    });
  } catch (error) {
    console.error('Weather API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch weather data' }, { status: 500 });
  }
} 