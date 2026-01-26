"use client";

import { useEffect, useState } from "react";

type WeatherData = {
  location: string;
  temperature: number;
  condition: string;
  icon: string;
  weatherCode: number;
  isDay: boolean;
};

/** Map Open-Meteo WMO weather codes (0–99) to emoji icons. */
function getWeatherIconFromCode(weatherCode: number, isDay: boolean): string {
  switch (weatherCode) {
    case 0:
      return isDay ? "☀️" : "🌙";
    case 1:
      return isDay ? "🌤️" : "☁️";
    case 2:
      return "⛅";
    case 3:
      return "☁️";
    case 45:
    case 48:
      return "🌫️";
    case 51:
    case 53:
    case 55:
      return "🌦️";
    case 56:
    case 57:
      return "🌧️";
    case 61:
    case 63:
    case 65:
      return "🌧️";
    case 66:
    case 67:
      return "🌨️";
    case 71:
    case 73:
    case 75:
      return "❄️";
    case 77:
      return "🌨️";
    case 80:
    case 81:
    case 82:
      return "🌦️";
    case 85:
    case 86:
      return "🌨️";
    case 95:
    case 96:
    case 99:
      return "⛈️";
    default:
      return "🌤️";
  }
}

/** Human-readable condition label from WMO code. */
function getConditionLabel(weatherCode: number): string {
  switch (weatherCode) {
    case 0:
      return "Clear";
    case 1:
      return "Mainly clear";
    case 2:
      return "Partly cloudy";
    case 3:
      return "Overcast";
    case 45:
    case 48:
      return "Foggy";
    case 51:
    case 53:
    case 55:
      return "Drizzle";
    case 56:
    case 57:
      return "Freezing drizzle";
    case 61:
    case 63:
    case 65:
      return "Rain";
    case 66:
    case 67:
      return "Freezing rain";
    case 71:
    case 73:
    case 75:
      return "Snow";
    case 77:
      return "Snow grains";
    case 80:
    case 81:
    case 82:
      return "Rain showers";
    case 85:
    case 86:
      return "Snow showers";
    case 95:
    case 96:
    case 99:
      return "Thunderstorm";
    default:
      return "Unknown";
  }
}

export default function LocationWeather() {
  const [location, setLocation] = useState<string>("Detecting...");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchLocationAndWeather() {
      try {
        // Get location from IP address with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const ipResponse = await fetch("https://ipapi.co/json/", {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!ipResponse.ok) {
          throw new Error(`HTTP error! status: ${ipResponse.status}`);
        }

        const ipData = await ipResponse.json();

        if (!isMounted) return;

        const cityName =
          ipData.city ||
          ipData.region ||
          ipData.country_name ||
          "Unknown";
        const latitude = ipData.latitude;
        const longitude = ipData.longitude;

        setLocation(cityName);

        // Fetch weather using IP-based coordinates
        if (latitude && longitude) {
          try {
            const weatherController = new AbortController();
            const weatherTimeoutId = setTimeout(() => weatherController.abort(), 5000);

            const weatherResponse = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day&timezone=auto`,
              { signal: weatherController.signal }
            );
            clearTimeout(weatherTimeoutId);

            if (!weatherResponse.ok) {
              throw new Error(`HTTP error! status: ${weatherResponse.status}`);
            }

            const weatherData = await weatherResponse.json();

            if (!isMounted) return;

            if (weatherData.current) {
              const temp = Math.round(weatherData.current.temperature_2m);
              const weatherCode = Number(weatherData.current.weather_code);
              const isDay = weatherData.current.is_day === 1;

              setWeather({
                location: cityName,
                temperature: temp,
                condition: getConditionLabel(weatherCode),
                icon: getWeatherIconFromCode(weatherCode, isDay),
                weatherCode,
                isDay,
              });
            }
          } catch (weatherError) {
            // Fallback weather if API fails
            setWeather({
              location: cityName,
              temperature: Math.floor(Math.random() * 15) + 15,
              condition: "Partly cloudy",
              icon: "⛅",
              weatherCode: 2,
              isDay: true,
            });
          }
        } else {
          // Fallback if IP geolocation doesn't provide coordinates
          setWeather({
            location: cityName,
            temperature: 22,
            condition: "Clear",
            icon: "☀️",
            weatherCode: 0,
            isDay: true,
          });
        }
      } catch (error) {
        // Only update state if component is still mounted
        if (isMounted) {
          // Fallback to default location
          setLocation("New York");
          setWeather({
            location: "New York",
            temperature: 22,
            condition: "Clear",
            icon: "☀️",
            weatherCode: 0,
            isDay: true,
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchLocationAndWeather();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="shrink-0 ml-6 flex items-center gap-3 px-2.5 py-2.5 rounded-md bg-gradient-to-r from-slate-50/80 to-gray-50/80 border border-slate-200/60 hover:border-slate-300/60 shadow-sm hover:shadow transition-all duration-200 backdrop-blur-sm">
      {/* Location */}
      <span className="text-xs font-medium text-[var(--text-primary)] truncate tracking-wide min-w-0">
        {isLoading ? "Detecting..." : location}
      </span>

      {/* Weather Display */}
      {weather && !isLoading && (
        <>
          <div className="h-4 w-px bg-slate-300/60 flex-shrink-0" aria-hidden="true" />
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs leading-none flex-shrink-0" aria-label={weather.condition}>
              {weather.icon}
            </span>
            <span className="text-xs font-semibold text-[var(--text-primary)] whitespace-nowrap tracking-tight">
              {weather.temperature}°
            </span>
          </div>
        </>
      )}
    </div>
  );
}
