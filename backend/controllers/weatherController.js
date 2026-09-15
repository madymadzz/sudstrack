const pool = require("../config/db");
const { sendSuccess, sendError } = require("../utils/responseUtils");
const { checkForecast } = require("../services/weatherService");

// POST /api/weather/check
const checkWeather = async (req, res) => {
    const { pickup_date, order_id } = req.body;

    if (!pickup_date) {
        return sendError(res, 400, "pickup_date is required.");
    }

    try {
        const forecast = await checkForecast(pickup_date);

        // Log to weather_checks table if order_id provided
        if (order_id) {
            await pool.query(
                `INSERT INTO weather_checks (order_id, forecast_result, description, warning, checked_at)
                 VALUES ($1, $2, $3, $4, NOW())`,
                [order_id, forecast.condition, forecast.description, forecast.warning]
            );
        }

        return sendSuccess(res, 200, "Weather forecast retrieved.", {
            warning:     forecast.warning,
            condition:   forecast.condition,
            temp:        forecast.temp ? Math.round(forecast.temp) : null,
            description: forecast.description,
            icon:        forecast.icon ? `https://openweathermap.org/img/wn/${forecast.icon}@4x.png` : null,
            message:     forecast.warning
                ? "Rain is expected on your pickup date. Your laundry may still be picked up, but delivery times could be affected."
                : "Weather looks clear for your pickup date."
        });
    } catch (err) {
        console.error("[Weather] checkWeather error:", err.message);
        return sendError(res, 500, "Could not retrieve weather forecast.");
    }
};

module.exports = { checkWeather };
