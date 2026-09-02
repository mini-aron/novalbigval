import type { Message } from "discord.js";
import { princessEmbed } from "../commands/_embed.js";
import type { TextTrigger } from "../types.js";

const TRIGGER_PHRASE = "세이지 날씨";

// WMO 날씨 코드 (Open-Meteo가 그대로 씀) → 표시용 한글 라벨/이모지.
const WEATHER_CODES: Record<number, { label: string; emoji: string }> = {
  0: { label: "맑음", emoji: "☀️" },
  1: { label: "대체로 맑음", emoji: "🌤️" },
  2: { label: "구름 조금", emoji: "⛅" },
  3: { label: "흐림", emoji: "☁️" },
  45: { label: "안개", emoji: "🌫️" },
  48: { label: "짙은 안개", emoji: "🌫️" },
  51: { label: "이슬비", emoji: "🌦️" },
  53: { label: "이슬비", emoji: "🌦️" },
  55: { label: "이슬비", emoji: "🌧️" },
  61: { label: "비", emoji: "🌧️" },
  63: { label: "비", emoji: "🌧️" },
  65: { label: "강한 비", emoji: "🌧️" },
  71: { label: "눈", emoji: "🌨️" },
  73: { label: "눈", emoji: "🌨️" },
  75: { label: "강한 눈", emoji: "❄️" },
  80: { label: "소나기", emoji: "🌦️" },
  81: { label: "소나기", emoji: "🌧️" },
  82: { label: "강한 소나기", emoji: "⛈️" },
  95: { label: "뇌우", emoji: "⛈️" },
  96: { label: "뇌우(우박)", emoji: "⛈️" },
  99: { label: "강한 뇌우(우박)", emoji: "⛈️" },
};

function describeWeatherCode(code: number) {
  return WEATHER_CODES[code] ?? { label: "알 수 없는 날씨", emoji: "🌈" };
}

interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
}

// Open-Meteo 지오코딩은 검색어를 로마자 지명으로만 매칭한다(language는 결과 라벨만 번역).
// "서울"로는 안 잡히고 "Seoul"로만 잡히므로, 자주 쓰는 국내 지명을 미리 로마자로 매핑해둔다.
const KOREAN_CITY_ALIASES: Record<string, string> = {
  서울: "Seoul",
  부산: "Busan",
  대구: "Daegu",
  인천: "Incheon",
  광주: "Gwangju",
  대전: "Daejeon",
  울산: "Ulsan",
  세종: "Sejong",
  수원: "Suwon",
  성남: "Seongnam",
  고양: "Goyang",
  용인: "Yongin",
  창원: "Changwon",
  청주: "Cheongju",
  전주: "Jeonju",
  천안: "Cheonan",
  포항: "Pohang",
  제주: "Jeju",
  춘천: "Chuncheon",
  강릉: "Gangneung",
  여수: "Yeosu",
  목포: "Mokpo",
  안양: "Anyang",
  안산: "Ansan",
  평택: "Pyeongtaek",
  김해: "Gimhae",
  진주: "Jinju",
  순천: "Suncheon",
  구미: "Gumi",
  원주: "Wonju",
  경주: "Gyeongju",
  통영: "Tongyeong",
};

async function geocode(location: string): Promise<GeoResult | null> {
  const query = KOREAN_CITY_ALIASES[location.trim()] ?? location;
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=ko&format=json`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const body = (await response.json()) as { results?: GeoResult[] };
  return body.results?.[0] ?? null;
}

interface CurrentWeather {
  temperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
}

async function fetchCurrentWeather(lat: number, lon: number): Promise<CurrentWeather> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`WEATHER_FETCH_FAILED:${response.status}`);
  const body = (await response.json()) as {
    current: {
      temperature_2m: number;
      relative_humidity_2m: number;
      weather_code: number;
      wind_speed_10m: number;
    };
  };
  return {
    temperature: body.current.temperature_2m,
    humidity: body.current.relative_humidity_2m,
    windSpeed: body.current.wind_speed_10m,
    weatherCode: body.current.weather_code,
  };
}

async function handle(message: Message): Promise<void> {
  const idx = message.content.indexOf(TRIGGER_PHRASE);
  const location = message.content
    .slice(idx + TRIGGER_PHRASE.length)
    .trim()
    .replace(/^[:\-,]\s*/, "");

  if (!location) {
    await message.reply("어느 지역이 궁금하세요? 예: `세이지 날씨 서울`");
    return;
  }

  const geo = await geocode(location);
  if (!geo) {
    await message.reply(`${location}, 그런 지역은 공주도 처음 들어보는걸요.`);
    return;
  }

  try {
    const weather = await fetchCurrentWeather(geo.latitude, geo.longitude);
    const { label, emoji } = describeWeatherCode(weather.weatherCode);

    const embed = princessEmbed()
      .setTitle(`${emoji} ${geo.name} 날씨`)
      .setDescription(
        `**${label}** · ${Math.round(weather.temperature)}°C\n` +
          `습도 ${weather.humidity}% · 풍속 ${weather.windSpeed}km/h`
      );

    await message.reply({ embeds: [embed] });
  } catch {
    await message.reply("날씨를 살피다가 조금 삐끗했어요. 잠시 후 다시 물어봐주실래요?");
  }
}

export const weatherTrigger: TextTrigger = {
  test: (content) => content.includes(TRIGGER_PHRASE),
  handle,
};
