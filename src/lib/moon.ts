// Lightweight moon phase + illumination calculation (Conway's algorithm
// approximation). Accurate to within ~1 day, fine for UI display.

export type MoonInfo = {
  phase: number; // 0..1 (0 = new moon)
  illumination: number; // 0..1
  name: string;
  emoji: string;
};

export function moonInfo(date: Date = new Date()): MoonInfo {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  let r = year % 100;
  r %= 19;
  if (r > 9) r -= 19;
  r = ((r * 11) % 30) + month + day;
  if (month < 3) r += 2;
  r -= year < 2000 ? 4 : 8.3;
  r = Math.floor(r + 0.5) % 30;
  const phase = (r < 0 ? r + 30 : r) / 29.53;

  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;

  const phases: { name: string; emoji: string }[] = [
    { name: "New Moon", emoji: "🌑" },
    { name: "Waxing Crescent", emoji: "🌒" },
    { name: "First Quarter", emoji: "🌓" },
    { name: "Waxing Gibbous", emoji: "🌔" },
    { name: "Full Moon", emoji: "🌕" },
    { name: "Waning Gibbous", emoji: "🌖" },
    { name: "Last Quarter", emoji: "🌗" },
    { name: "Waning Crescent", emoji: "🌘" },
  ];
  const idx = Math.round(phase * 8) % 8;
  return { phase, illumination, name: phases[idx].name, emoji: phases[idx].emoji };
}
