import { Groq } from 'groq-sdk';
import { NextResponse } from 'next/server';
import { weatherMCPClient } from '../../lib/weatherMCPClient';
import { ChatCompletionTool } from 'groq-sdk/resources/chat/completions';

// Initialize GROQ client with error handling
let groq: Groq;
try {
  if (!process.env.GROQ_API_KEY) {
    console.error('GROQ_API_KEY environment variable is not set');
  } else {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }
} catch (error) {
  console.error('Error initializing GROQ client:', error);
}



// Define weather tools for the LLM
const weatherTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_current_weather',
      description: 'Get current weather conditions for a specific location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'City name or location (e.g., "New York", "London, UK", "Tokyo, Japan")',
          },
        },
        required: ['location'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_weather_forecast',
      description: 'Get weather forecast for a specific location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'City name or location (e.g., "New York", "London, UK", "Tokyo, Japan")',
          },
          days: {
            type: 'number',
            description: 'Number of days for forecast (default: 7, max: 7)',
            default: 7,
            minimum: 1,
            maximum: 7,
          },
        },
        required: ['location'],
      },
    },
  },
];

export async function POST(req: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'GROQ API key is not configured. Please contact the administrator.' },
        { status: 500 }
      );
    }

    const { messages } = await req.json();

    // Ensure MCP client is connected
    if (!weatherMCPClient.isConnected) {
      await weatherMCPClient.connect();
    }

    // Filter out timestamp fields that Groq API doesn't accept
    const groqMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content
    }));

    // Add system message with weather tools
    const systemMessage = {
                role: 'system',
      content: `You are WeatherBot 🌤️, a cheerful and knowledgeable weather assistant! I'm passionate about all things weather and love sharing weather insights with a smile ☀️.

CRITICAL RULES - NEVER BREAK THESE:
🚫 DO NOT use weather tools for ANY of these:
- Greetings: "Hello", "Hi", "How are you?", "Good morning"
- Thanks/acknowledgments: "Thanks", "Okay", "Got it", "Understood", "Yes", "No"
- Non-weather questions: "What's 2+2?", "Tell me a joke", "How does photosynthesis work?"
- Personal questions: "What's your favorite color?", "How old are you?"
- General conversation: "What's up?", "What's new?", "How's it going?"
- Commands: "Help", "Menu", "Options", "Settings"

✅ ONLY use weather tools when the user EXPLICITLY asks about:
- Current weather: "What's the weather?", "How's the weather in Paris?"
- Temperature: "How hot is it?", "What's the temperature?"
- Forecasts: "Will it rain tomorrow?", "What's the forecast?"
- Weather conditions: "Is it sunny?", "Is it raining?"
- Weather patterns: "What's the climate like?", "How's the weather today?"
- Weather advice: "Should I bring an umbrella?", "What should I wear?"

TOOL USAGE RULES:
- If the message doesn't contain weather-related keywords, DO NOT use tools
- Keywords that trigger tools: weather, temperature, forecast, rain, snow, sunny, cloudy, hot, cold, humid, wind, storm, climate
- If unsure, respond normally without tools

When using weather tools:
1. Extract ONLY the city/location name from the user's message
2. Do NOT include emojis, extra text, or formatting in location arguments
3. For example: if user says "What's the weather in New York? 🌤️", use "New York" as the location

For NON-WEATHER responses:
- Be cheerful and friendly with weather-themed personality 🌈
- Use weather emojis appropriately
- Suggest weather topics if the conversation naturally leads there
- Keep responses conversational and engaging
- Don't force weather information into every response

Available tools (USE SPARINGLY - only when EXPLICITLY needed):
- get_current_weather: Get current weather for a location
- get_weather_forecast: Get forecast for a location (up to 7 days)

Remember: I'm helpful for weather, but I can also chat about other topics while keeping my cheerful personality! ☀️`
    };

        const messagesWithSystem = [systemMessage, ...groqMessages];

    // Pre-analyze the message to determine if tools should be available
    const lastUserMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    const hasWeatherIntent = /\b(weather|temperature|forecast|rain|snow|sunny|cloudy|hot|cold|humid|wind|storm|climate|thunder|lightning|flood|drought|hurricane|tornado)\b/i.test(lastUserMessage) ||
                            /\b(what's the weather|how's the weather|weather like|temperature in|forecast for|will it rain|will it snow|is it sunny|is it cloudy|is it hot|is it cold)\b/i.test(lastUserMessage);

    // First, let the LLM decide if it needs to use tools
    const completion = await groq.chat.completions.create({
      messages: messagesWithSystem,
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
            max_tokens: 1024,
            top_p: 0.9,
      tools: hasWeatherIntent ? weatherTools : undefined, // Only provide tools if weather intent detected
      tool_choice: hasWeatherIntent ? 'auto' : undefined, // Only allow tool choice if weather intent detected
            stream: false,
          });

    const assistantMessage = completion.choices[0]?.message;

    if (!assistantMessage) {
      throw new Error('No response from LLM');
    }

    // Check if the LLM wants to use tools
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      // Execute tool calls
      const toolResults = [];
      const toolCallMessages = [];

      for (const toolCall of assistantMessage.tool_calls) {
        try {
          let result;

          if (toolCall.function.name === 'get_current_weather') {
            const args = JSON.parse(toolCall.function.arguments);
            result = await weatherMCPClient.getCurrentWeather(args.location);
          } else if (toolCall.function.name === 'get_weather_forecast') {
            const args = JSON.parse(toolCall.function.arguments);
            result = await weatherMCPClient.getWeatherForecast(args.location, args.days || 7);
          }

          toolResults.push(result);

          // Format the tool response for Groq API
          toolCallMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result), // This will be the parsed JSON from MCP response
          });
        } catch (error) {
          console.error('Tool execution error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch weather data';
          toolCallMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              error: errorMessage,
              suggestion: 'Please try with a different location or check the spelling'
            }),
          });
        }
      }

      // Get final response with tool results
      const finalCompletion = await groq.chat.completions.create({
      messages: [
          ...messagesWithSystem,
          assistantMessage,
          ...toolCallMessages
      ],
      model: "llama-3.3-70b-versatile",
        temperature: 0.3,
      max_tokens: 1024,
      top_p: 0.9,
      stream: false,
    });

      const finalMessage = finalCompletion.choices[0]?.message;

      // Check if this conversation is about weather by analyzing the original user message
      const lastUserMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';

      // Very strict weather query detection - only trigger for explicit weather questions
      const weatherKeywords = /\b(weather|temperature|forecast|rain|snow|sunny|cloudy|hot|cold|humid|wind|storm|climate|thunder|lightning|flood|drought|hurricane|tornado)\b/i;
      const weatherPhrases = /\b(what's the weather|how's the weather|weather like|temperature in|forecast for|will it rain|will it snow|is it sunny|is it cloudy|is it hot|is it cold)\b/i;

      // Additional check: must be asking about weather, not just mentioning weather words in non-weather context
      const isWeatherQuery = (weatherKeywords.test(lastUserMessage) || weatherPhrases.test(lastUserMessage)) &&
                            !/\b(what's your favorite|tell me about|explain|how does|what is|who is|when did)\b/i.test(lastUserMessage);

      // Format response
      const response: any = {
        role: 'assistant',
        content: finalMessage?.content || 'I apologize, but I encountered an error processing your request.',
      };

      // Only include weather data if this is actually a weather-related query
      if (toolResults.length > 0 && isWeatherQuery) {
        const weatherData = toolResults[0]; // Use first result for now
        if (weatherData.location && weatherData.current) {
          response.weatherData = {
            coordinates: weatherData.location.coordinates,
            city: weatherData.location.name,
            temperature: weatherData.current.temperature,
            feels_like: weatherData.current.feels_like,
            description: weatherData.current.description,
            humidity: weatherData.current.humidity,
            wind_speed: weatherData.current.wind_speed,
            sunrise: weatherData.current.sunrise,
            sunset: weatherData.current.sunset,
          };
        }
        if (weatherData.forecast) {
          response.weatherData = {
            ...response.weatherData,
            forecast: weatherData.forecast,
          };
        }
      }

      return NextResponse.json(response);
    } else {
      // No tools needed, return the direct response
      return NextResponse.json({
        role: 'assistant',
        content: assistantMessage.content || 'I understand you have a question about weather. Could you please specify which city or location you\'d like weather information for?',
      });
    }
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}