import { Groq } from 'groq-sdk';
import { NextResponse } from 'next/server';

if (!process.env.GROQ_API_KEY) {
  throw new Error('Missing GROQ_API_KEY environment variable');
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface WeatherData {
  city: string;
  coordinates: { lat: number; lon: number };
  temperature: number;
  feels_like: number;
  description: string;
  humidity: number;
  wind_speed: number;
  sunrise: string;
  sunset: string;
  forecast?: Array<{
    date: string;
    temp: number;
    description: string;
    icon: string;
  }>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  weatherData?: WeatherData;
}

async function generateWeatherNarrative(weatherData: WeatherData): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a professional meteorologist writing a comprehensive weather report. Create a detailed, engaging narrative about the weather conditions using the provided data. 

Write in a professional yet accessible style, similar to a TV weather report or newspaper weather section. Include:
- Current conditions analysis
- Temperature insights and comfort levels
- Weather pattern explanation
- Forecast analysis and trends
- Practical advice for residents
- Any notable weather features

Make it informative, professional, and engaging. Write in paragraphs, not bullet points. Use proper meteorological terminology but keep it understandable for the general public.`
        },
        {
          role: 'user',
          content: `Write a professional weather report for ${weatherData.city} based on this data:

Current Conditions:
- Temperature: ${weatherData.temperature}°C (feels like ${weatherData.feels_like}°C)
- Weather: ${weatherData.description}
- Humidity: ${weatherData.humidity}%
- Wind Speed: ${weatherData.wind_speed} km/h
- Sunrise: ${weatherData.sunrise}
- Sunset: ${weatherData.sunset}

${weatherData.forecast ? `7-Day Forecast:
${weatherData.forecast.map((day, i) => {
  const date = new Date(day.date);
  const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'long' });
  return `${dayName}: ${day.temp}°C, ${day.description}`;
}).join('\n')}` : ''}`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1500,
      top_p: 0.9,
      stream: false,
    });

    return completion.choices[0]?.message?.content || 'Weather report could not be generated at this time.';
  } catch (error) {
    console.error('Error generating weather narrative:', error);
    return `Current weather conditions in ${weatherData.city} show ${weatherData.description} with temperatures reaching ${weatherData.temperature}°C. The humidity stands at ${weatherData.humidity}% with winds at ${weatherData.wind_speed} km/h. Residents can expect ${weatherData.feels_like > weatherData.temperature ? 'warmer' : 'cooler'} feeling conditions due to the current atmospheric conditions.`;
  }
}

async function generateChatSummary(messages: ChatMessage[]): Promise<string> {
  try {
    const conversation = messages.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n');
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are writing an executive summary for a weather consultation session. Analyze the conversation and create a professional summary that includes:

- Overview of weather queries and topics discussed
- Key weather insights and findings
- Locations and timeframes covered
- Notable weather patterns or concerns mentioned
- Summary of advice or recommendations provided

Write in a professional, report-style format suitable for a weather consultation document. Keep it concise but comprehensive.`
        },
        {
          role: 'user',
          content: `Summarize this weather consultation conversation:\n\n${conversation}`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      max_tokens: 800,
      top_p: 0.9,
      stream: false,
    });

    return completion.choices[0]?.message?.content || 'This weather consultation covered various weather-related inquiries and provided detailed meteorological information and forecasts.';
  } catch (error) {
    console.error('Error generating chat summary:', error);
    return 'This weather consultation session included multiple weather inquiries with detailed forecasts and meteorological analysis provided for the requested locations.';
  }
}

export async function POST(req: Request) {
  try {
    const { type, data } = await req.json();

    if (type === 'weather-narrative') {
      const narrative = await generateWeatherNarrative(data);
      return NextResponse.json({ narrative });
    } else if (type === 'chat-summary') {
      const summary = await generateChatSummary(data);
      return NextResponse.json({ summary });
    } else {
      return NextResponse.json(
        { error: 'Invalid request type' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 