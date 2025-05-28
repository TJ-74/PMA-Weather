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
          content: `You are a location parsing assistant. Your task is to:
1. Extract location mentions from the input text
2. Format US locations as "City, State" (e.g., "Saint Louis, Missouri")
3. Format international locations as "City, Country" (e.g., "London, United Kingdom")
4. Handle common abbreviations (St. -> Saint, UK -> United Kingdom, USA -> United States)
5. Return only the formatted location string, nothing else
6. Return null if no valid location is found

Examples:
"weather in st louis mo" -> "Saint Louis, Missouri"
"temperature in NYC" -> "New York City, New York"
"forecast for london uk" -> "London, United Kingdom"
"what's it like in tokyo" -> "Tokyo, Japan"
"rain in portland or" -> "Portland, Oregon"`
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

    const formattedLocation = completion.choices[0].message.content.trim();
    return formattedLocation === 'null' ? null : formattedLocation;
  } catch (error) {
    console.error('Error parsing location:', error);
    return null;
  }
}

async function getWeatherData(city: string) {
  try {
    const response = await fetch(
      `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/weather?city=${encodeURIComponent(city)}`,
      { cache: 'no-store' }
    );
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch weather data');
    }
    
    return data;
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
    
    try {
      const location = await parseLocationFromMessage(lastMessage);
      
      if (location) {
        try {
          const weatherData = await getWeatherData(location);
          const emoji = getWeatherEmoji(weatherData.description);

          const response = `Let me check the current weather in ${weatherData.city} for you. ${emoji}

According to the latest data, it's currently ${weatherData.description} in ${weatherData.city}, with a temperature of ${weatherData.temperature}°C (feels like ${weatherData.feels_like}°C). The humidity is ${weatherData.humidity}% and the wind is blowing at ${weatherData.wind_speed} km/h. ${emoji}

The sun rose at ${weatherData.sunrise} and will set at ${weatherData.sunset} today. I've also included an interactive map below where you can explore the area! 🗺️

Would you like to know more about specific weather conditions or planning activities in ${weatherData.city}? Just let me know! 😊`;

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
              sunset: weatherData.sunset
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