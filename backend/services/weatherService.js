const axios = require("axios");
const { API_LOG_SEVERITY } = require("../config/constants");
const { logAPIEvent } = require("./apiLogger");

const WEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5";

// TIP QC default coordinates
const DEFAULT_LAT = 14.6256536;
const DEFAULT_LON = 121.0619890;

// Weather condition codes that warrant a warning
const RAIN_CONDITION_CODES = [
    200, 201, 202, 210, 211, 212, 221, 230, 231, 232, // Thunderstorm
    300, 301, 302, 310, 311, 312, 313, 314, 321,       // Drizzle
    500, 501, 502, 503, 504, 511, 520, 521, 522, 531   // Rain
];

/**
 * Check weather forecast for a given date
 * Returns: { warning: bool, condition: string, description: string, icon: string }
 */
const checkForecast = async (pickupDate, lat = DEFAULT_LAT, lon = DEFAULT_LON) => {
    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        try {
            attempt++;

            const response = await axios.get(`${WEATHER_BASE_URL}/forecast`, {
                params: {
                    lat,
                    lon,
                    appid: process.env.OPENWEATHER_API_KEY,
                    units: "metric",
                    cnt: 40
                },
                timeout: 8000
            });

            const forecastList = response.data.list;
            const targetDate = new Date(pickupDate).toISOString().split("T")[0];

            // Find forecasts that match the pickup date
            const dayForecasts = forecastList.filter(f => {
                const fDate = new Date(f.dt * 1000).toISOString().split("T")[0];
                return fDate === targetDate;
            });

            if (dayForecasts.length === 0) {
                return {
                    warning: false,
                    condition: "Unknown",
                    description: "No forecast available for that date.",
                    icon: null
                };
            }

            // Check if any slot in that day has rain/storm
            const hasRain = dayForecasts.some(f =>
                RAIN_CONDITION_CODES.includes(f.weather[0].id)
            );

            const mainForecast = dayForecasts[0];
            const condition    = mainForecast.weather[0].main;
            const description  = mainForecast.weather[0].description;
            const icon         = mainForecast.weather[0].icon;
            const temp         = mainForecast.main.temp;

            await logAPIEvent({
                api_name: "OpenWeatherMap",
                endpoint: "/forecast",
                error_type: null,
                error_message: null,
                retry_count: attempt - 1,
                recovered: true,
                severity: API_LOG_SEVERITY.LOW
            });

            return { warning: hasRain, condition, description, icon, temp };

        } catch (err) {
            console.error(`[WeatherService] Attempt ${attempt} failed:`, err.message);

            if (attempt >= MAX_RETRIES) {
                await logAPIEvent({
                    api_name: "OpenWeatherMap",
                    endpoint: "/forecast",
                    error_type: err.code || "REQUEST_FAILED",
                    error_message: err.message,
                    retry_count: attempt,
                    recovered: false,
                    severity: API_LOG_SEVERITY.MEDIUM
                });

                return {
                    warning: false,
                    condition: "Unavailable",
                    description: "Weather check failed. Proceeding without forecast.",
                    icon: null,
                    error: true
                };
            }

            // Wait before retrying
            await new Promise(r => setTimeout(r, 1000 * attempt));
        }
    }
};

module.exports = { checkForecast };
