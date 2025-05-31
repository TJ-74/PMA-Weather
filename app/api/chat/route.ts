import { Groq } from 'groq-sdk';
import { NextResponse } from 'next/server';

if (!process.env.GROQ_API_KEY) {
  throw new Error('Missing GROQ_API_KEY environment variable');
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function parseLocationFromMessage(messages: any[]): Promise<string | null> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a weather query detection assistant. Your task is to:

1. ONLY extract locations if the message is clearly asking about weather, temperature, forecast, or climate
2. Look at the ENTIRE conversation context to understand location references
3. If the latest message doesn't mention a location but refers to weather, check previous messages for location context
4. Ignore casual responses like "okay", "cool", "thanks", "yes", "no", etc.
5. Look for weather-related keywords: weather, temperature, forecast, rain, snow, sunny, cloudy, hot, cold, humid, wind, storm, etc.
6. Format locations as "City, State" for US or "City, Country" for international
7. Return "null" if the message is NOT a weather query or contains no location context

Examples with conversation context:
User: "What's the weather in New York?"
Assistant: "Current weather info..."
User: "What about tomorrow?" 
→ "New York, New York" (inherit from previous context)

User: "Tell me about Paris weather"
Assistant: "Weather info for Paris..."
User: "Will it rain there?"
→ "Paris, France" (inherit from previous context)

User: "How are you?"
→ null (not weather related)

Only return a location if there's a clear weather query (current or inherited from context).`
        },
        ...messages
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 50,
      top_p: 0.9,
      stream: false,
    });

    if (!completion.choices[0]?.message?.content) {
      return null;
    }

    const result = completion.choices[0].message.content.trim();
    return result === 'null' || result.toLowerCase() === 'null' ? null : result;
  } catch (error) {
    console.error('Error parsing location:', error);
    return null;
  }
}

async function analyzeWeatherQueryType(messages: any[]): Promise<{type: 'current' | 'forecast' | 'mixed', timeframe?: string}> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a weather query analyzer. Analyze the user's conversation and determine what type of weather information they're asking for.

Categories:
- "current": Current weather conditions (today, now, currently)
- "forecast": Future weather predictions (tomorrow, next week, weekend, forecast, will it rain, etc.)
- "mixed": Both current and forecast information

Look at the ENTIRE conversation context to understand what they're asking for:
- Consider previous questions and follow-ups
- If they just asked for current weather and now ask "what about tomorrow?", that's "forecast"
- If they ask "how's the weather?" after discussing forecasts, determine from context

Look for time indicators:
- Current: "now", "today", "current", "currently", "at the moment", "right now"
- Forecast: "tomorrow", "next week", "this weekend", "forecast", "will it", "going to", "next few days", "week ahead"
- Mixed: asking for comprehensive weather info or both current and future

Return ONLY one word: "current", "forecast", or "mixed"

Examples with context:
User: "What's the weather in Tokyo?"
→ current

User: "What's the weather in Tokyo?"
Assistant: "Current weather..."
User: "What about tomorrow?"
→ forecast

User: "Give me the full weather picture for London"
→ mixed

Be smart about understanding the conversation flow and what the user really wants.`
        },
        ...messages
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 10,
      top_p: 0.9,
      stream: false,
    });

    const result = completion.choices[0]?.message?.content?.trim().toLowerCase();
    
    if (result === 'forecast') {
      return { type: 'forecast' };
    } else if (result === 'mixed') {
      return { type: 'mixed' };
    } else {
      return { type: 'current' };
    }
  } catch (error) {
    console.error('Error analyzing query type:', error);
    return { type: 'current' };
  }
}

async function getWeatherData(city: string) {
  try {
    const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
    if (!API_KEY) {
      throw new Error('OpenWeather API key not configured');
    }

    // First, get coordinates for the city
    const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;
    const geoResponse = await fetch(geoUrl);
    const geoData = await geoResponse.json();

    if (!geoData || geoData.length === 0) {
      throw new Error('City not found');
    }

    const { lat, lon } = geoData[0];

    // Get current weather data
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
    const weatherResponse = await fetch(weatherUrl);
    const weatherData = await weatherResponse.json();

    if (weatherResponse.status !== 200) {
      throw new Error(weatherData.message || 'Failed to fetch weather data');
    }

    // Get forecast data
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
    const forecastResponse = await fetch(forecastUrl);
    const forecastData = await forecastResponse.json();

    if (forecastResponse.status !== 200) {
      throw new Error(forecastData.message || 'Failed to fetch forecast data');
    }

    // Process forecast data to get daily forecasts
    const dailyForecasts = forecastData.list.reduce((acc: any[], item: any) => {
      const date = new Date(item.dt * 1000).toISOString().split('T')[0];
      const existingForecast = acc.find((f: any) => {
        const forecastDate = new Date(f.date).toISOString().split('T')[0];
        return forecastDate === date;
      });
      
      if (!existingForecast) {
        acc.push({
          date: item.dt * 1000,
          temp: Math.round(item.main.temp),
          description: item.weather[0].description,
          icon: item.weather[0].icon
        });
      }
      return acc;
    }, []).slice(0, 7); // Get first 7 days

    // Format sunrise and sunset times with timezone information
    const timezoneDisplayName = await getTimezoneFromCoordinates(lat, lon, city);
    
    // Calculate local times by adding the timezone offset from OpenWeather
    const timezoneOffsetSeconds = weatherData.timezone; // seconds from UTC
    const sunriseLocal = new Date((weatherData.sys.sunrise + timezoneOffsetSeconds) * 1000);
    const sunsetLocal = new Date((weatherData.sys.sunset + timezoneOffsetSeconds) * 1000);

    const sunrise = sunriseLocal.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC'
    }) + ` (${timezoneDisplayName})`;
    
    const sunset = sunsetLocal.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC'
    }) + ` (${timezoneDisplayName})`;

    return {
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
      sunset,
      forecast: dailyForecasts
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    throw error;
  }
}

function getWeatherEmoji(description: string): string {
  const desc = description.toLowerCase();
  if (desc.includes('clear')) return '☀️';
  if (desc.includes('cloud')) return '☁️';
  if (desc.includes('rain')) return '🌧️';
  if (desc.includes('snow')) return '❄️';
  if (desc.includes('thunder')) return '⛈️';
  if (desc.includes('mist') || desc.includes('fog')) return '🌫️';
  return '🌡️';
}

async function getTimezoneFromCoordinates(lat: number, lon: number, cityName: string): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a timezone expert. Given a city name and its coordinates, determine the appropriate timezone display name.

Rules:
- Return a user-friendly timezone name that people would recognize
- Use common timezone names like "Eastern Time", "Pacific Time", "Japan Time", "Central European Time", etc.
- For US locations, use standard time zone names (Eastern, Central, Mountain, Pacific, Alaska, Hawaii)
- For international locations, use recognizable regional names or country-specific names
- Consider daylight saving time variations but use the standard name
- Keep it simple and user-friendly
- Return only the timezone name, nothing else

Examples:
- New York, USA (40.7128, -74.0060) → "Eastern Time"
- Tokyo, Japan (35.6762, 139.6503) → "Japan Time" 
- London, UK (51.5074, -0.1278) → "Greenwich Mean Time"
- Paris, France (48.8566, 2.3522) → "Central European Time"
- Los Angeles, USA (34.0522, -118.2437) → "Pacific Time"
- Sydney, Australia (-33.8688, 151.2093) → "Australian Eastern Time"
- Moscow, Russia (55.7558, 37.6176) → "Moscow Time"`
        },
        {
          role: 'user',
          content: `City: ${cityName}, Coordinates: (${lat}, ${lon})`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 50,
      top_p: 0.9,
      stream: false,
    });

    const timezoneName = completion.choices[0]?.message?.content?.trim();
    return timezoneName || "Local Time";
  } catch (error) {
    console.error('Error getting timezone:', error);
    return "Local Time";
  }
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1].content;
    
    // Try to parse location from any message - let AI determine if it's weather-related
    try {
      const location = await parseLocationFromMessage(messages);
      
      if (location) {
        try {
          const weatherData = await getWeatherData(location);
          const emoji = getWeatherEmoji(weatherData.description);
          const queryAnalysis = await analyzeWeatherQueryType(messages);

          // Generate a contextual response that answers the specific question
          const contextualResponse = await groq.chat.completions.create({
            messages: [
              {
                role: 'system',
                content: `You are a weather assistant with REAL, CURRENT weather data for ${weatherData.city}. This is NOT general information - this is the ACTUAL, LIVE weather data I just fetched from OpenWeather API.

IMPORTANT: The weather data below is 100% REAL and CURRENT for ${weatherData.city}. Use it confidently to answer the user's question.

QUERY TYPE: ${queryAnalysis.type.toUpperCase()} - The user is asking for ${queryAnalysis.type} weather information.

${queryAnalysis.type === 'current' ? 
`FOCUS: Provide current weather conditions primarily. You may briefly mention forecast availability.` :
queryAnalysis.type === 'forecast' ? 
`FOCUS: Provide forecast information primarily. Include current conditions only for context if relevant.` :
`FOCUS: This is a MIXED query - provide BOTH current weather AND forecast information comprehensively.`}

CURRENT WEATHER IN ${weatherData.city.toUpperCase()}:
• Temperature: ${weatherData.temperature}°C (feels like ${weatherData.feels_like}°C)
• Conditions: ${weatherData.description}
• Humidity: ${weatherData.humidity}%
• Wind Speed: ${weatherData.wind_speed} km/h
• Sunrise: ${weatherData.sunrise}
• Sunset: ${weatherData.sunset}

7-DAY FORECAST FOR ${weatherData.city.toUpperCase()}:
${weatherData.forecast?.map((day: any, i: number) => {
  const date = new Date(day.date);
  const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${dayName} (${dateStr}): ${day.temp}°C, ${day.description}`;
}).join('\n') || 'No forecast data available'}

Your job:
1. Use this REAL data to directly answer their specific question about ${weatherData.city}
2. Look at the ENTIRE conversation context to understand what they're really asking for
3. ${queryAnalysis.type === 'current' ? 
   'Focus on CURRENT conditions - temperature, conditions, humidity, wind, sunrise/sunset' :
   queryAnalysis.type === 'forecast' ? 
   'Focus on FORECAST information - what\'s coming up, tomorrow, next few days' :
   'Provide BOTH current conditions AND forecast since they want comprehensive weather info'}
4. Be confident - this data is accurate and current
5. If they ask about rain, check the relevant forecast descriptions
6. If they ask about temperature, use the current temperature
7. Be conversational and helpful, considering the conversation flow
8. Add relevant emojis and weather advice

Answer their question directly using this real data and conversation context!`
              },
              ...messages
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
            max_tokens: 1024,
            top_p: 0.9,
            stream: false,
          });

          const response = contextualResponse.choices[0]?.message?.content || `Here's the weather information for ${weatherData.city}! ${emoji}`;

          return NextResponse.json({
            role: 'assistant',
            content: response,
            weatherData: {
              coordinates: weatherData.coordinates,
              city: weatherData.city,
              temperature: weatherData.temperature,
              feels_like: weatherData.feels_like,
              description: weatherData.description,
              humidity: weatherData.humidity,
              wind_speed: weatherData.wind_speed,
              sunrise: weatherData.sunrise,
              sunset: weatherData.sunset,
              forecast: weatherData.forecast
            }
          });
        } catch (error) {
          console.error('Weather data error:', error);
          return NextResponse.json({
            role: 'assistant',
            content: `I apologize, but I couldn't fetch the weather data for ${location} at the moment. Would you like to try another location or ask me something else?`
          });
        }
      }
    } catch (error) {
      console.error('Location parsing error:', error);
    }

    // If not a weather query or weather processing failed, proceed with normal chat
    const completion = await groq.chat.completions.create({
      messages: [
        ...messages.slice(0, -1),
        {
          role: 'system',
          content: `You are WeatherBot, a specialized weather assistant powered by Llama 3.3 and integrated with OpenWeather API. Your primary purpose is to help users understand weather conditions worldwide.

Key capabilities:
- Provide real-time weather data using OpenWeather API
- Explain weather patterns and forecasts in a clear, friendly manner
- Help users interpret weather data and its implications
- Suggest appropriate activities based on weather conditions
- Provide weather safety tips when relevant

When users ask about weather:
1. If they provide a clear location, you'll fetch real-time data from OpenWeather API
2. If the location is ambiguous, kindly ask for clarification (e.g., "Could you please specify which Portland you're asking about - Oregon or Maine?")
3. If they don't mention a location, ask them to specify one

For non-weather queries:
- Politely remind users that you're specialized in weather-related information
- Guide them back to weather-related topics
- Suggest weather-related questions they might be interested in

Remember to:
- Be friendly and conversational
- Use weather-appropriate emojis when relevant
- Explain weather terms in simple language
- Provide context for weather data
- Suggest weather-appropriate activities`
        },
        messages[messages.length - 1]
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 0.9,
      stream: false,
    });

    return NextResponse.json(completion.choices[0].message);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}