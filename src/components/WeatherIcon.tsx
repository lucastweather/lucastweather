import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudMoon,
  Cloudy,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  Snowflake,
  CloudLightning,
  Zap,
} from "lucide-react";

type Props = {
  code: number;
  isDay?: boolean;
  cloudCover?: number;
  className?: string;
};

/**
 * Rich Lucide-based weather icon. Maps WMO weather codes to expressive
 * icons including partly sunny / mostly cloudy / thunderstorms / snow.
 * Color-coded by condition so the forecast strip reads at a glance.
 */
export default function WeatherIcon({
  code,
  isDay = true,
  cloudCover = 0,
  className = "size-6",
}: Props) {
  // Clear
  if (code === 0) {
    return isDay ? (
      <Sun className={`${className} text-amber-400`} />
    ) : (
      <Moon className={`${className} text-slate-300`} />
    );
  }
  // Mostly sunny / mostly clear
  if (code === 1) {
    return isDay ? (
      <CloudSun className={`${className} text-amber-300`} />
    ) : (
      <CloudMoon className={`${className} text-slate-300`} />
    );
  }
  // Partly cloudy — split by cloud cover into partly sunny vs mostly cloudy
  if (code === 2) {
    if (cloudCover > 60) {
      return <Cloudy className={`${className} text-slate-400`} />;
    }
    return isDay ? (
      <CloudSun className={`${className} text-amber-300`} />
    ) : (
      <CloudMoon className={`${className} text-slate-300`} />
    );
  }
  // Overcast
  if (code === 3) return <Cloudy className={`${className} text-slate-400`} />;
  // Fog
  if ([45, 48].includes(code))
    return <CloudFog className={`${className} text-slate-400`} />;
  // Drizzle
  if ([51, 53, 55, 56, 57].includes(code))
    return <CloudDrizzle className={`${className} text-sky-400`} />;
  // Light rain / showers
  if ([61, 80].includes(code))
    return <CloudRain className={`${className} text-sky-400`} />;
  // Rain
  if ([63, 81, 66].includes(code))
    return <CloudRain className={`${className} text-sky-500`} />;
  // Heavy rain / violent showers / freezing rain
  if ([65, 82, 67].includes(code))
    return <CloudRainWind className={`${className} text-blue-500`} />;
  // Snow grains / light snow
  if ([71, 77].includes(code))
    return <Snowflake className={`${className} text-sky-200`} />;
  // Snow / heavy snow / snow showers
  if ([73, 75, 85, 86].includes(code))
    return <CloudSnow className={`${className} text-sky-100`} />;
  // Thunderstorm with hail / severe
  if ([96, 99].includes(code))
    return <Zap className={`${className} text-yellow-400`} />;
  // Thunderstorm
  if (code === 95)
    return <CloudLightning className={`${className} text-yellow-400`} />;
  // Fallback by cloud cover
  if (cloudCover > 70) return <Cloudy className={`${className} text-slate-400`} />;
  return isDay ? (
    <CloudSun className={`${className} text-amber-300`} />
  ) : (
    <Cloud className={`${className} text-slate-400`} />
  );
}
