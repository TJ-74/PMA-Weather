interface MCPClientOptions {
  env?: Record<string, string>;
}

export class WeatherMCPClient {
  private _isConnected = false;

  constructor(private options: MCPClientOptions = {}) {}

  get isConnected(): boolean {
    return this._isConnected;
  }

  async connect(): Promise<void> {
    if (this._isConnected) return;
    this._isConnected = true;
    console.log('MCP Weather Client connected successfully');
  }

  async disconnect(): Promise<void> {
    this._isConnected = false;
  }

  async callTool(toolName: string, args: any): Promise<any> {
    if (!this._isConnected) {
      throw new Error('MCP client not connected');
    }

    try {
      // For now, we'll simulate MCP communication by calling the weather API directly
      // In a full MCP implementation, this would communicate with the MCP server
      return await this.simulateMCPToolCall(toolName, args);
    } catch (error) {
      console.error(`Error calling MCP tool ${toolName}:`, error);
      throw error;
    }
  }

  private async simulateMCPToolCall(toolName: string, args: any): Promise<any> {
    const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;

    if (!API_KEY) {
      throw new Error('OpenWeather API key not configured');
    }

    switch (toolName) {
      case 'get_current_weather':
        return await this.getCurrentWeatherDirect(args.location);
      case 'get_weather_forecast':
        return await this.getWeatherForecastDirect(args.location, args.days || 7);
      case 'search_locations':
        return await this.searchLocationsDirect(args.query, args.limit || 5);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private async getCurrentWeatherDirect(location: string) {
    const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY!;

    // Clean the location string to remove any extra characters
    const cleanLocation = location.trim().replace(/[🌤️⭐️❄️🌧️☀️⛈️🌫️🌪️🌈]/g, '').trim();

    // Get coordinates for the location
    const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cleanLocation)}&limit=5&appid=${API_KEY}`;
    const geoResponse = await fetch(geoUrl);

    if (!geoResponse.ok) {
      console.error(`Geocoding failed for "${cleanLocation}": ${geoResponse.status}`);
      throw new Error(`Failed to geocode location "${cleanLocation}"`);
    }

    const geoData = await geoResponse.json();

    if (!geoData || geoData.length === 0) {
      console.error(`No geocoding results for "${cleanLocation}"`);
      throw new Error(`Location "${cleanLocation}" not found`);
    }

    const locationData = geoData[0];
    const { lat, lon, name, country, state } = locationData;

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
      content: [{
        type: 'text',
        text: JSON.stringify({
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
        })
      }]
    };
  }

  private async getWeatherForecastDirect(location: string, days: number) {
    const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY!;

    // Clean the location string to remove any extra characters
    const cleanLocation = location.trim().replace(/[🌤️⭐️❄️🌧️☀️⛈️🌫️🌪️🌈]/g, '').trim();

    // Get coordinates for the location
    const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cleanLocation)}&limit=5&appid=${API_KEY}`;
    const geoResponse = await fetch(geoUrl);

    if (!geoResponse.ok) {
      console.error(`Geocoding failed for "${cleanLocation}": ${geoResponse.status}`);
      throw new Error(`Failed to geocode location "${cleanLocation}"`);
    }

    const geoData = await geoResponse.json();

    if (!geoData || geoData.length === 0) {
      console.error(`No geocoding results for "${cleanLocation}"`);
      throw new Error(`Location "${cleanLocation}" not found`);
    }

    const locationData = geoData[0];
    const { lat, lon, name, country, state } = locationData;

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
    }, []).slice(0, days);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          location: {
            name,
            country,
            state: state || null,
            coordinates: { lat, lon }
          },
          forecast: dailyForecasts,
          timestamp: new Date().toISOString()
        })
      }]
    };
  }

  private async searchLocationsDirect(query: string, limit: number) {
    const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY!;

    const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=${limit}&appid=${API_KEY}`;
    const geoResponse = await fetch(geoUrl);

    if (!geoResponse.ok) {
      throw new Error('Failed to search locations');
    }

    const geoData = await geoResponse.json();

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(geoData.map((location: any) => ({
          name: location.name,
          country: location.country,
          state: location.state || null,
          coordinates: {
            lat: location.lat,
            lon: location.lon
          }
        })))
      }]
    };
  }

  async getCurrentWeather(location: string) {
    const response = await this.callTool('get_current_weather', { location });
    return JSON.parse(response.content[0].text);
  }

  async getWeatherForecast(location: string, days: number = 7) {
    const response = await this.callTool('get_weather_forecast', { location, days });
    return JSON.parse(response.content[0].text);
  }

  async searchLocations(query: string, limit: number = 5) {
    const response = await this.callTool('search_locations', { query, limit });
    return JSON.parse(response.content[0].text);
  }


}

// Singleton instance
export const weatherMCPClient = new WeatherMCPClient();
