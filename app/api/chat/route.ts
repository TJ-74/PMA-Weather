import { Groq } from 'groq-sdk';
import { NextResponse } from 'next/server';

if (!process.env.GROQ_API_KEY) {
  throw new Error('Missing GROQ_API_KEY environment variable');
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function parseLocationFromMessage(message: string): Promise<string | null> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a weather query detection assistant. Your task is to:

1. ONLY extract locations if the message is clearly asking about weather, temperature, forecast, or climate
2. Ignore casual responses like "okay", "cool", "thanks", "yes", "no", etc.
3. Look for weather-related keywords: weather, temperature, forecast, rain, snow, sunny, cloudy, hot, cold, humid, wind, storm, etc.
4. Format locations as "City, State" for US or "City, Country" for international
5. Return "null" if the message is NOT a weather query or contains no location

Weather query examples that should extract locations:
"What's the weather in New York?" -> "New York, New York"
"Temperature in London?" -> "London, United Kingdom"
"Will it rain in Seattle tomorrow?" -> "Seattle, Washington"
"How hot is it in Phoenix?" -> "Phoenix, Arizona"

Non-weather queries that should return null:
"okay" -> null
"cool" -> null
"thanks" -> null
"yes" -> null
"tell me a joke" -> null
"how are you?" -> null
"that's interesting" -> null

Only return a location if the message is clearly asking about weather AND mentions a place.`
        },
        {
          role: 'user',
          content: message
        }
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

async function analyzeWeatherQueryType(message: string): Promise<{type: 'current' | 'forecast' | 'mixed', timeframe?: string}> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a weather query analyzer. Analyze the user's message and determine what type of weather information they're asking for.

Categories:
- "current": Current weather conditions (today, now, currently)
- "forecast": Future weather predictions (tomorrow, next week, weekend, forecast, will it rain, etc.)
- "mixed": Both current and forecast information

Look for time indicators:
- Current: "now", "today", "current", "currently", "at the moment", "right now"
- Forecast: "tomorrow", "next week", "this weekend", "forecast", "will it", "going to", "next few days", "week ahead"

Return ONLY one word: "current", "forecast", or "mixed"

Examples:
"What's the weather in Paris?" -> current
"What's the weather like in Tokyo today?" -> current
"Will it rain in London tomorrow?" -> forecast
"What's the forecast for New York?" -> forecast
"Show me weather forecast for Miami" -> forecast
"How's the weather in Berlin this week?" -> forecast
"What's the current weather and forecast for Boston?" -> mixed`
        },
        {
          role: 'user',
          content: message
        }
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

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1].content;
    
    // Pre-filter: only check for weather queries if the message contains weather-related keywords
    const weatherKeywords = [
      'weather', 'temperature', 'temp', 'forecast', 'rain', 'snow', 'sunny', 'cloudy', 
      'hot', 'cold', 'warm', 'cool', 'humid', 'wind', 'storm', 'thunder', 'lightning',
      'degrees', 'celsius', 'fahrenheit', 'precipitation', 'humidity', 'pressure',
      'sunrise', 'sunset', 'UV', 'visibility', 'feels like', 'wind speed'
    ];
    
    const messageText = lastMessage.toLowerCase();
    const containsWeatherKeyword = weatherKeywords.some(keyword => 
      messageText.includes(keyword.toLowerCase())
    );
    
    if (containsWeatherKeyword) {
      try {
        const location = await parseLocationFromMessage(lastMessage);
        
        if (location) {
          try {
            const weatherData = await getWeatherData(location);
            const emoji = getWeatherEmoji(weatherData.description);
            const queryAnalysis = await analyzeWeatherQueryType(lastMessage);

            // Generate a contextual response that answers the specific question
            const contextualResponse = await groq.chat.completions.create({
              messages: [
                {
                  role: 'system',
                  content: `You are a weather assistant with REAL, CURRENT weather data for ${weatherData.city}. This is NOT general information - this is the ACTUAL, LIVE weather data I just fetched from OpenWeather API.

IMPORTANT: The weather data below is 100% REAL and CURRENT for ${weatherData.city}. Use it confidently to answer the user's question.

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
2. Be confident - this data is accurate and current
3. If they ask about rain, check TODAY and TOMORROW's forecast descriptions
4. If they ask about temperature, use the current temperature
5. If they ask "will it rain tomorrow", look specifically at Tomorrow's forecast
6. Be conversational and helpful
7. Add relevant emojis and weather advice

Answer their question directly using this real data!`
                },
                {
                  role: 'user',
                  content: lastMessage
                }
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