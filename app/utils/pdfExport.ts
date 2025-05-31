import jsPDF from 'jspdf';

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

// Temperature conversion utilities for PDF
function convertTemperature(tempC: number, unit: 'C' | 'F' = 'C'): number {
  if (unit === 'F') {
    return Math.round((tempC * 9/5) + 32);
  }
  return Math.round(tempC);
}

function formatTemperatureForPDF(tempC: number, unit: 'C' | 'F' = 'C'): string {
  const converted = convertTemperature(tempC, unit);
  return `${converted}°${unit}`;
}

// Weather emoji mapping - using text descriptions instead of emojis
function getWeatherIcon(description: string): string {
  const desc = description.toLowerCase();
  if (desc.includes('clear') || desc.includes('sunny')) return 'SUNNY';
  if (desc.includes('cloud') && !desc.includes('rain')) return 'CLOUDY';
  if (desc.includes('partly cloudy') || desc.includes('few clouds')) return 'PARTLY CLOUDY';
  if (desc.includes('overcast') || desc.includes('broken clouds')) return 'OVERCAST';
  if (desc.includes('rain') && !desc.includes('heavy')) return 'RAINY';
  if (desc.includes('heavy rain') || desc.includes('downpour')) return 'HEAVY RAIN';
  if (desc.includes('drizzle') || desc.includes('light rain')) return 'DRIZZLE';
  if (desc.includes('snow')) return 'SNOW';
  if (desc.includes('thunder') || desc.includes('storm')) return 'STORM';
  if (desc.includes('mist') || desc.includes('fog') || desc.includes('haze')) return 'FOG';
  if (desc.includes('wind')) return 'WINDY';
  return 'CLEAR';
}

// Temperature description
function getTemperatureDesc(temp: number): string {
  if (temp < 0) return 'FREEZING';
  if (temp < 10) return 'COLD';
  if (temp < 20) return 'COOL';
  if (temp < 30) return 'WARM';
  if (temp < 35) return 'HOT';
  return 'VERY HOT';
}

// Time description
function getTimeDesc(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'NIGHT';
  if (hour < 12) return 'MORNING';
  if (hour < 18) return 'DAY';
  return 'EVENING';
}

async function generateWeatherNarrative(weatherData: WeatherData): Promise<string> {
  try {
    const response = await fetch('/api/generate-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'weather-narrative',
        data: weatherData
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate weather narrative');
    }

    const result = await response.json();
    return result.narrative || 'Weather report could not be generated at this time.';
  } catch (error) {
    console.error('Error generating weather narrative:', error);
    return `Current weather conditions in ${weatherData.city} show ${weatherData.description} with temperatures reaching ${weatherData.temperature}°C. The humidity stands at ${weatherData.humidity}% with winds at ${weatherData.wind_speed} km/h. Residents can expect ${weatherData.feels_like > weatherData.temperature ? 'warmer' : 'cooler'} feeling conditions due to the current atmospheric conditions.`;
  }
}

async function generateChatSummary(messages: ChatMessage[]): Promise<string> {
  try {
    const response = await fetch('/api/generate-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'chat-summary',
        data: messages
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate chat summary');
    }

    const result = await response.json();
    return result.summary || 'This weather consultation covered various weather-related inquiries and provided detailed meteorological information and forecasts.';
  } catch (error) {
    console.error('Error generating chat summary:', error);
    return 'This weather consultation session included multiple weather inquiries with detailed forecasts and meteorological analysis provided for the requested locations.';
  }
}

export async function generateWeatherReportPDF(
  messages: ChatMessage[],
  chatTitle: string = 'Weather Report',
  temperatureUnit: 'C' | 'F' = 'C'
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;
  
  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
    }
  };

  // Helper function to wrap text with better formatting
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12, lineHeight: number = 7) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string, index: number) => {
      checkPageBreak(lineHeight + 2);
      doc.text(line, x, y + (index * lineHeight));
    });
    return y + (lines.length * lineHeight);
  };

  // Create beautiful header with gradient effect simulation
  const createHeader = () => {
    // Header background (simulated gradient)
    doc.setFillColor(59, 130, 246); // Blue
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    // Decorative elements
    doc.setFillColor(99, 156, 251); // Lighter blue
    doc.rect(0, 35, pageWidth, 10, 'F');
    
    // Title
    doc.setTextColor(255, 255, 255); // White text
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    const titleText = `${getTimeDesc()} Professional Weather Report`;
    const titleWidth = doc.getTextWidth(titleText);
    doc.text(titleText, (pageWidth - titleWidth) / 2, 25);
    
    // Subtitle
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const reportDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const dateText = `[CALENDAR] Generated on: ${reportDate}`;
    const dateWidth = doc.getTextWidth(dateText);
    doc.text(dateText, (pageWidth - dateWidth) / 2, 38);
    
    // Reset text color for content
    doc.setTextColor(0, 0, 0);
    yPosition = 55;
  };

  // Create section header
  const createSectionHeader = (title: string, emoji: string, color: [number, number, number] = [59, 130, 246]) => {
    checkPageBreak(25);
    
    // Section background
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(15, yPosition - 5, pageWidth - 30, 18, 'F');
    
    // Section title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`${emoji} ${title}`, 20, yPosition + 7);
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    yPosition += 25;
  };

  // Create data box with icon
  const createDataBox = (icon: string, label: string, value: string, x: number, y: number, width: number = 85, height: number = 25) => {
    // Box background
    doc.setFillColor(248, 250, 252); // Very light gray
    doc.setDrawColor(226, 232, 240); // Light gray border
    doc.rect(x, y, width, height, 'FD');
    
    // Icon and label
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105); // Slate gray
    doc.text(`${icon} ${label}`, x + 5, y + 8);
    
    // Value
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42); // Dark slate
    doc.text(value, x + 5, y + 18);
    
    // Reset
    doc.setTextColor(0, 0, 0);
  };

  createHeader();

  // Generate and add executive summary
  createSectionHeader('Executive Summary', '[CLIPBOARD]', [16, 185, 129]); // Green
  
  const summary = await generateChatSummary(messages);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  yPosition = addWrappedText(summary, 20, yPosition, pageWidth - 40, 11, 6);
  yPosition += 20;

  // Extract weather data from messages and generate AI reports for each location
  const weatherMessages = messages.filter(msg => msg.weatherData);
  const processedLocations = new Set<string>();
  
  for (const message of weatherMessages) {
    const weatherData = message.weatherData!;
    
    // Skip if we've already processed this location
    if (processedLocations.has(weatherData.city)) continue;
    processedLocations.add(weatherData.city);

    checkPageBreak(80);
    
    // Location header with weather description
    const weatherIcon = getWeatherIcon(weatherData.description);
    const tempDesc = getTemperatureDesc(weatherData.temperature);
    createSectionHeader(`Weather Analysis: ${weatherData.city}`, `[GLOBE] ${weatherIcon}`, [168, 85, 247]); // Purple

    // Current conditions data boxes
    checkPageBreak(40);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(55, 65, 81);
    doc.text('[CHART] Current Conditions', 20, yPosition);
    yPosition += 15;

    // Create beautiful data grid
    const boxY = yPosition;
    createDataBox(`[TEMP] ${tempDesc}`, 'Temperature', formatTemperatureForPDF(weatherData.temperature, temperatureUnit), 20, boxY, 85, 25);
    createDataBox('[THERMOMETER]', 'Feels Like', formatTemperatureForPDF(weatherData.feels_like, temperatureUnit), 110, boxY, 85, 25);
    
    createDataBox(`[WEATHER] ${weatherIcon}`, 'Conditions', weatherData.description, 20, boxY + 30, 85, 25);
    createDataBox('[WATER]', 'Humidity', `${weatherData.humidity}%`, 110, boxY + 30, 85, 25);
    
    createDataBox('[WIND]', 'Wind Speed', `${weatherData.wind_speed} km/h`, 20, boxY + 60, 85, 25);
    createDataBox('[LOCATION]', 'Coordinates', `${weatherData.coordinates.lat.toFixed(2)}, ${weatherData.coordinates.lon.toFixed(2)}`, 110, boxY + 60, 85, 25);
    
    yPosition += 100;

    // Sun times with beautiful formatting
    checkPageBreak(30);
    doc.setFillColor(255, 251, 235); // Warm yellow background
    doc.setDrawColor(251, 191, 36); // Yellow border
    doc.rect(20, yPosition, pageWidth - 40, 20, 'FD');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(146, 64, 14); // Amber text
    doc.text(`[SUNRISE] Sunrise: ${weatherData.sunrise}`, 25, yPosition + 8);
    doc.text(`[SUNSET] Sunset: ${weatherData.sunset}`, 25, yPosition + 16);
    
    doc.setTextColor(0, 0, 0);
    yPosition += 30;

    // AI narrative with beautiful formatting
    checkPageBreak(40);
    createSectionHeader('Professional Analysis', '[TARGET]', [239, 68, 68]); // Red
    
    const narrative = await generateWeatherNarrative(weatherData);
    
    // Create content box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(229, 231, 235);
    doc.rect(20, yPosition - 5, pageWidth - 40, 5, 'D'); // Top border
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(31, 41, 55);
    yPosition = addWrappedText(narrative, 25, yPosition + 5, pageWidth - 50, 11, 6);
    yPosition += 25;

    // Forecast section if available
    if (weatherData.forecast && weatherData.forecast.length > 0) {
      checkPageBreak(60);
      createSectionHeader('7-Day Forecast', '[CALENDAR]', [6, 182, 212]); // Blue
      
      // Create forecast grid
      const forecastStartY = yPosition;
      weatherData.forecast.slice(0, 7).forEach((day, index) => {
        if (index > 0 && index % 7 === 0) {
          yPosition += 35;
        }
        
        const date = new Date(day.date);
        const dayName = index === 0 ? 'Today' : 
          index === 1 ? 'Tomorrow' : 
          date.toLocaleDateString('en-US', { weekday: 'short' });
        
        const boxX = 20 + (index * 25);
        const boxY = forecastStartY;
        
        if (boxX + 25 <= pageWidth - 20) {
          // Day box
          if (index % 2 === 0) {
            doc.setFillColor(239, 246, 255);
          } else {
            doc.setFillColor(245, 245, 245);
          }
          doc.setDrawColor(209, 213, 219);
          doc.rect(boxX, boxY, 24, 45, 'FD');
          
          // Day name
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(75, 85, 99);
          const dayWidth = doc.getTextWidth(dayName);
          doc.text(dayName, boxX + (24 - dayWidth) / 2, boxY + 8);
          
          // Weather description
          doc.setFontSize(6);
          const icon = getWeatherIcon(day.description);
          const iconWidth = doc.getTextWidth(icon);
          doc.text(icon, boxX + (24 - iconWidth) / 2, boxY + 18);
          
          // Temperature
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(239, 68, 68);
          const tempText = formatTemperatureForPDF(day.temp, temperatureUnit);
          const tempWidth = doc.getTextWidth(tempText);
          doc.text(tempText, boxX + (24 - tempWidth) / 2, boxY + 32);
          
          // Condition (abbreviated)
          doc.setFontSize(6);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(107, 114, 128);
          const conditionText = day.description.slice(0, 8);
          const condWidth = doc.getTextWidth(conditionText);
          doc.text(conditionText, boxX + (24 - condWidth) / 2, boxY + 42);
        }
      });
      
      yPosition += 60;
    }
  }

  // Beautiful footer
  const createFooter = (pageNum: number, totalPages: number) => {
    // Footer background
    doc.setFillColor(55, 65, 81); // Dark gray
    doc.rect(0, pageHeight - 25, pageWidth, 25, 'F');
    
    // Footer content
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    // Left side - branding
    doc.text('[ROBOT] Generated by WeatherBot AI', 10, pageHeight - 10);
    
    // Right side - page numbers
    const pageText = `Page ${pageNum} of ${totalPages}`;
    const pageTextWidth = doc.getTextWidth(pageText);
    doc.text(pageText, pageWidth - pageTextWidth - 10, pageHeight - 10);
    
    // Center - decorative element
    doc.text('• • •', (pageWidth / 2) - 8, pageHeight - 10);
  };

  // Apply footer to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    createFooter(i, totalPages);
  }

  // Save the PDF
  const fileName = `weather-report-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

export async function generateQuickWeatherPDF(weatherData: WeatherData, temperatureUnit: 'C' | 'F' = 'C'): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
    }
  };

  // Create beautiful header
  const createHeader = () => {
    // Header background (gradient effect)
    doc.setFillColor(59, 130, 246); // Blue
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    // Decorative accent
    doc.setFillColor(99, 156, 251); // Lighter blue
    doc.rect(0, 30, pageWidth, 10, 'F');
    
    // Title with weather descriptions
    const weatherIcon = getWeatherIcon(weatherData.description);
    const tempDesc = getTemperatureDesc(weatherData.temperature);
    
    doc.setTextColor(255, 255, 255); // White text
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    const titleText = `${weatherIcon} - ${tempDesc} Weather Report`;
    const titleWidth = doc.getTextWidth(titleText);
    doc.text(titleText, (pageWidth - titleWidth) / 2, 18);
    
    // City name
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    const cityText = `${weatherData.city}`;
    const cityWidth = doc.getTextWidth(cityText);
    doc.text(cityText, (pageWidth - cityWidth) / 2, 28);
    
    // Subtitle with date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dateText = `[CALENDAR] Generated on ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`;
    const dateWidth = doc.getTextWidth(dateText);
    doc.text(dateText, (pageWidth - dateWidth) / 2, 35);
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    yPosition = 50;
  };

  // Create data box
  const createDataBox = (icon: string, label: string, value: string, x: number, y: number, width: number = 85, height: number = 25) => {
    // Box background
    doc.setFillColor(248, 250, 252); // Very light gray
    doc.setDrawColor(226, 232, 240); // Light gray border
    doc.rect(x, y, width, height, 'FD');
    
    // Icon and label
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105); // Slate gray
    doc.text(`${icon} ${label}`, x + 5, y + 8);
    
    // Value
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42); // Dark slate
    doc.text(value, x + 5, y + 18);
    
    // Reset
    doc.setTextColor(0, 0, 0);
  };

  // Create section header
  const createSectionHeader = (title: string, icon: string, color: [number, number, number] = [59, 130, 246]) => {
    checkPageBreak(25);
    
    // Section background
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(15, yPosition - 5, pageWidth - 30, 18, 'F');
    
    // Section title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`${icon} ${title}`, 20, yPosition + 7);
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    yPosition += 25;
  };

  createHeader();

  // Current conditions section
  createSectionHeader('Current Conditions', '[CHART]', [16, 185, 129]); // Green

  // Beautiful data grid
  const tempDesc = getTemperatureDesc(weatherData.temperature);
  const weatherIcon = getWeatherIcon(weatherData.description);
  
  checkPageBreak(100);
  const boxY = yPosition;
  createDataBox(`[TEMP] ${tempDesc}`, 'Temperature', formatTemperatureForPDF(weatherData.temperature, temperatureUnit), 20, boxY, 85, 25);
  createDataBox('[THERMOMETER]', 'Feels Like', formatTemperatureForPDF(weatherData.feels_like, temperatureUnit), 110, boxY, 85, 25);
  
  createDataBox(`[WEATHER] ${weatherIcon}`, 'Conditions', weatherData.description, 20, boxY + 30, 85, 25);
  createDataBox('[WATER]', 'Humidity', `${weatherData.humidity}%`, 110, boxY + 30, 85, 25);
  
  createDataBox('[WIND]', 'Wind Speed', `${weatherData.wind_speed} km/h`, 20, boxY + 60, 85, 25);
  createDataBox('[LOCATION]', 'Coordinates', `${weatherData.coordinates.lat.toFixed(2)}, ${weatherData.coordinates.lon.toFixed(2)}`, 110, boxY + 60, 85, 25);
  
  yPosition += 100;

  // Sun times with beautiful formatting
  checkPageBreak(30);
  doc.setFillColor(255, 251, 235); // Warm yellow background
  doc.setDrawColor(251, 191, 36); // Yellow border
  doc.rect(20, yPosition, pageWidth - 40, 20, 'FD');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(146, 64, 14); // Amber text
  doc.text(`[SUNRISE] Sunrise: ${weatherData.sunrise}`, 25, yPosition + 8);
  doc.text(`[SUNSET] Sunset: ${weatherData.sunset}`, 25, yPosition + 16);
  
  doc.setTextColor(0, 0, 0);
  yPosition += 35;

  // Professional analysis section
  createSectionHeader('Professional Analysis', '[TARGET]', [239, 68, 68]); // Red

  // Generate AI narrative
  const narrative = await generateWeatherNarrative(weatherData);
  
  // Create content box with better formatting
  checkPageBreak(40);
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235);
  doc.rect(20, yPosition - 5, pageWidth - 40, 5, 'D'); // Top border
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(31, 41, 55);
  const lines = doc.splitTextToSize(narrative, pageWidth - 50);
  lines.forEach((line: string, index: number) => {
    checkPageBreak(7);
    doc.text(line, 25, yPosition);
    yPosition += 6;
  });

  yPosition += 20;

  // Add forecast if available
  if (weatherData.forecast && weatherData.forecast.length > 0) {
    createSectionHeader('Forecast Preview', '[CALENDAR]', [6, 182, 212]); // Blue
    
    checkPageBreak(60);
    // Show first 5 days in a compact format
    weatherData.forecast.slice(0, 5).forEach((day, index) => {
      checkPageBreak(12);
      
      const date = new Date(day.date);
      const dayName = index === 0 ? 'Today' : 
        index === 1 ? 'Tomorrow' : 
        date.toLocaleDateString('en-US', { weekday: 'long' });
      
      // Day row background
      if (index % 2 === 0) {
        doc.setFillColor(249, 250, 251);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(20, yPosition - 2, pageWidth - 40, 10, 'F');
      
      const icon = getWeatherIcon(day.description);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text(`[${icon}] ${dayName}`, 25, yPosition + 5);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text(`${formatTemperatureForPDF(day.temp, temperatureUnit)} - ${day.description}`, 90, yPosition + 5);
      
      yPosition += 10;
    });
    
    yPosition += 10;
  }

  // Beautiful footer
  doc.setFillColor(55, 65, 81); // Dark gray
  doc.rect(0, pageHeight - 25, pageWidth, 25, 'F');
  
  // Footer content
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  // Left side - branding
  doc.text('[ROBOT] Generated by WeatherBot AI', 10, pageHeight - 10);
  
  // Right side - location info
  const locationText = `[LOCATION] ${weatherData.city}`;
  const locationWidth = doc.getTextWidth(locationText);
  doc.text(locationText, pageWidth - locationWidth - 10, pageHeight - 10);
  
  // Center - decorative element
  doc.text('• • •', (pageWidth / 2) - 8, pageHeight - 10);

  // Reset text color and save
  doc.setTextColor(0, 0, 0);
  const fileName = `${weatherData.city.toLowerCase().replace(/\s+/g, '-')}-weather-report.pdf`;
  doc.save(fileName);
} 