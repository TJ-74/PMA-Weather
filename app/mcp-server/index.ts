#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

class WeatherMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'weather-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_current_weather',
            description: 'Get current weather conditions for a location',
            inputSchema: {
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
          {
            name: 'get_weather_forecast',
            description: 'Get weather forecast for a location',
            inputSchema: {
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
          {
            name: 'search_locations',
            description: 'Search for locations by name',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Location search query',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results (default: 5, max: 10)',
                  default: 5,
                  minimum: 1,
                  maximum: 10,
                },
              },
              required: ['query'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_current_weather':
            return await this.handleGetCurrentWeather(args);
          case 'get_weather_forecast':
            return await this.handleGetWeatherForecast(args);
          case 'search_locations':
            return await this.handleSearchLocations(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }

  private async handleGetCurrentWeather(args: any) {
    const { location } = args;

    if (!location || typeof location !== 'string') {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Location parameter is required and must be a string'
      );
    }

    try {
      const weatherData = await this.fetchWeatherData(location, 'current');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(weatherData, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to fetch weather data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async handleGetWeatherForecast(args: any) {
    const { location, days = 7 } = args;

    if (!location || typeof location !== 'string') {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Location parameter is required and must be a string'
      );
    }

    if (typeof days !== 'number' || days < 1 || days > 7) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Days parameter must be a number between 1 and 7'
      );
    }

    try {
      const weatherData = await this.fetchWeatherData(location, 'forecast', days);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(weatherData, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to fetch forecast data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async handleSearchLocations(args: any) {
    const { query, limit = 5 } = args;

    if (!query || typeof query !== 'string') {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Query parameter is required and must be a string'
      );
    }

    if (typeof limit !== 'number' || limit < 1 || limit > 10) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Limit parameter must be a number between 1 and 10'
      );
    }

    try {
      const locations = await this.searchLocations(query, limit);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(locations, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to search locations: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async fetchWeatherData(location: string, type: 'current' | 'forecast', days?: number) {
    const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;

    if (!API_KEY) {
      throw new Error('OpenWeather API key not configured');
    }

    // First, get coordinates for the location
    const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=5&appid=${API_KEY}`;
    const geoResponse = await fetch(geoUrl);

    if (!geoResponse.ok) {
      throw new Error('Failed to geocode location');
    }

    const geoData = await geoResponse.json();

    if (!geoData || geoData.length === 0) {
      throw new Error(`Location "${location}" not found`);
    }

    // Find the best match
    const locationData = geoData[0];
    const { lat, lon, name, country, state } = locationData;

    if (type === 'current') {
      // Get current weather
      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
      const weatherResponse = await fetch(weatherUrl);

      if (!weatherResponse.ok) {
        throw new Error('Failed to fetch current weather data');
      }

      const weatherData = await weatherResponse.json();

      // Format times
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
        location: {
          name,
          country,
          state: state || null,
          coordinates: { lat, lon }
        },
        current: {
          temperature: Math.round(weatherData.main.temp),
          feels_like: Math.round(weatherData.main.feels_like),
          description: weatherData.weather[0].description,
          humidity: weatherData.main.humidity,
          wind_speed: Math.round(weatherData.wind.speed),
          sunrise,
          sunset,
          timestamp: new Date().toISOString()
        }
      };
    } else {
      // Get forecast
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
      const forecastResponse = await fetch(forecastUrl);

      if (!forecastResponse.ok) {
        throw new Error('Failed to fetch forecast data');
      }

      const forecastData = await forecastResponse.json();

      // Process forecast data into daily summaries
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
      }, []).slice(0, days || 7);

      return {
        location: {
          name,
          country,
          state: state || null,
          coordinates: { lat, lon }
        },
        forecast: dailyForecasts,
        timestamp: new Date().toISOString()
      };
    }
  }

  private async searchLocations(query: string, limit: number) {
    const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;

    if (!API_KEY) {
      throw new Error('OpenWeather API key not configured');
    }

    const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=${limit}&appid=${API_KEY}`;
    const geoResponse = await fetch(geoUrl);

    if (!geoResponse.ok) {
      throw new Error('Failed to search locations');
    }

    const geoData = await geoResponse.json();

    return geoData.map((location: any) => ({
      name: location.name,
      country: location.country,
      state: location.state || null,
      coordinates: {
        lat: location.lat,
        lon: location.lon
      }
    }));
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Weather MCP Server started');
  }
}

// Start the server
const server = new WeatherMCPServer();
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
