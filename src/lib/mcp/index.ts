import { defineMcp } from "@lovable.dev/mcp-js";
import searchCity from "./tools/search-city";
import getCurrentWeather from "./tools/get-current-weather";
import getDailyForecast from "./tools/get-daily-forecast";
import getHourlyForecast from "./tools/get-hourly-forecast";
import getActiveHurricanes from "./tools/get-active-hurricanes";
import getWeatherNews from "./tools/get-weather-news";
import getEarthquakes from "./tools/get-earthquakes";

export default defineMcp({
  name: "lucas-weather-clone",
  title: "Lucas Weather Clone",
  version: "0.1.0",
  instructions:
    "Public weather tools for Lucast Weather. Use `search_city` to resolve a place name to coordinates, then `get_current_weather`, `get_hourly_forecast`, or `get_daily_forecast`. `get_active_hurricanes`, `get_earthquakes`, and `get_weather_news` need no arguments.",
  tools: [
    searchCity,
    getCurrentWeather,
    getHourlyForecast,
    getDailyForecast,
    getActiveHurricanes,
    getEarthquakes,
    getWeatherNews,
  ],
});
