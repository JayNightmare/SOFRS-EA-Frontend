/**
 * Lightweight weather service using the free Open-Meteo API.
 * No API key required — geocodes via ip-api.com, then fetches current weather.
 */

export interface WeatherData {
	temperatureC: number;
	description: string;
	iconKey: "sunny" | "cloudy" | "rainy";
}

const WMO_DESCRIPTIONS: Record<number, { text: string; icon: WeatherData["iconKey"] }> = {
	0: { text: "CLEAR SKY", icon: "sunny" },
	1: { text: "MAINLY CLEAR", icon: "sunny" },
	2: { text: "PARTLY CLOUDY", icon: "cloudy" },
	3: { text: "OVERCAST", icon: "cloudy" },
	45: { text: "FOG", icon: "cloudy" },
	48: { text: "RIME FOG", icon: "cloudy" },
	51: { text: "LIGHT DRIZZLE", icon: "rainy" },
	53: { text: "MODERATE DRIZZLE", icon: "rainy" },
	55: { text: "DENSE DRIZZLE", icon: "rainy" },
	61: { text: "SLIGHT RAIN", icon: "rainy" },
	63: { text: "MODERATE RAIN", icon: "rainy" },
	65: { text: "HEAVY RAIN", icon: "rainy" },
	71: { text: "SLIGHT SNOW", icon: "cloudy" },
	73: { text: "MODERATE SNOW", icon: "cloudy" },
	75: { text: "HEAVY SNOW", icon: "cloudy" },
	80: { text: "RAIN SHOWERS", icon: "rainy" },
	81: { text: "MODERATE SHOWERS", icon: "rainy" },
	82: { text: "VIOLENT SHOWERS", icon: "rainy" },
	95: { text: "THUNDERSTORM", icon: "rainy" },
	96: { text: "THUNDERSTORM W/ HAIL", icon: "rainy" },
	99: { text: "THUNDERSTORM W/ HEAVY HAIL", icon: "rainy" },
};

const FALLBACK: WeatherData = {
	temperatureC: 0,
	description: "UNAVAILABLE",
	iconKey: "cloudy",
};

interface GeoResponse {
	lat: number;
	lon: number;
}

interface OpenMeteoResponse {
	current_weather?: {
		temperature: number;
		weathercode: number;
	};
}

/**
 * Fetches the user's approximate coordinates via ip-api (free, no key).
 * Falls back to London if the request fails.
 */
const getCoordinates = async (): Promise<{ lat: number; lon: number }> => {
	try {
		const res = await fetch("http://ip-api.com/json/?fields=lat,lon", {
			signal: AbortSignal.timeout(3000),
		});
		if (!res.ok) throw new Error(`Status ${res.status}`);
		const data = (await res.json()) as GeoResponse;
		return { lat: data.lat, lon: data.lon };
	} catch {
		return { lat: 51.5074, lon: -0.1278 }; // London fallback
	}
};

/**
 * Fetches current weather from the free Open-Meteo API.
 * Silently returns a fallback on any failure.
 */
export const fetchWeather = async (): Promise<WeatherData> => {
	try {
		const { lat, lon } = await getCoordinates();
		const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
		const res = await fetch(url, { signal: AbortSignal.timeout(5000) });

		if (!res.ok) throw new Error(`Status ${res.status}`);

		const data = (await res.json()) as OpenMeteoResponse;
		const cw = data.current_weather;

		if (!cw) return FALLBACK;

		const wmo = WMO_DESCRIPTIONS[cw.weathercode] ?? { text: "UNKNOWN", icon: "cloudy" as const };

		return {
			temperatureC: Math.round(cw.temperature),
			description: wmo.text,
			iconKey: wmo.icon,
		};
	} catch {
		return FALLBACK;
	}
};
