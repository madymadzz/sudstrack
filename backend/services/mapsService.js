const axios = require("axios");
const { SHOP_COORDINATES } = require("../config/constants");
const { logAPIEvent } = require("./apiLogger");
const { API_LOG_SEVERITY } = require("../config/constants");

const MAPS_BASE_URL = "https://maps.googleapis.com/maps/api";

/**
 * Get a route from the shop to the delivery address
 * Uses Google Maps Directions API
 * Returns: { distance, duration, encodedPolyline, shopCoords, deliveryCoords }
 */
const getDeliveryRoute = async (deliveryAddress, mapLat, mapLng) => {
    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        try {
            attempt++;

            const origin      = `${SHOP_COORDINATES.lat},${SHOP_COORDINATES.lng}`;
            // If we have precise pinned coords, use them as destination. Otherwise fall back to text search.
            const destination = (mapLat && mapLng) ? `${mapLat},${mapLng}` : encodeURIComponent(deliveryAddress + ", Quezon City, Philippines");

            const response = await axios.get(`${MAPS_BASE_URL}/directions/json`, {
                params: {
                    origin,
                    destination,
                    key: process.env.GOOGLE_MAPS_API_KEY,
                    mode: "driving"
                },
                timeout: 8000
            });

            const data = response.data;

            if (data.status !== "OK" || !data.routes.length) {
                throw new Error(`Google Maps returned status: ${data.status}`);
            }

            const leg = data.routes[0].legs[0];

            await logAPIEvent({
                api_name: "GoogleMaps",
                endpoint: "/directions",
                error_type: null,
                error_message: null,
                retry_count: attempt - 1,
                recovered: true,
                severity: API_LOG_SEVERITY.LOW
            });

            return {
                distance:          leg.distance.text,
                duration:          leg.duration.text,
                durationSeconds:   leg.duration.value,
                shopCoords:        SHOP_COORDINATES,
                deliveryAddress:   leg.end_address,
                deliveryCoords: {
                    lat: leg.end_location.lat,
                    lng: leg.end_location.lng
                },
                encodedPolyline:   data.routes[0].overview_polyline.points,
                mapsApiKey:        process.env.GOOGLE_MAPS_API_KEY
            };

        } catch (err) {
            console.error(`[MapsService] Attempt ${attempt} failed:`, err.message);

            if (attempt >= MAX_RETRIES) {
                await logAPIEvent({
                    api_name: "GoogleMaps",
                    endpoint: "/directions",
                    error_type: err.code || "REQUEST_FAILED",
                    error_message: err.message,
                    retry_count: attempt,
                    recovered: false,
                    severity: API_LOG_SEVERITY.HIGH
                });

                // Fallback to a mock route for demo purposes if the address is unroutable
                return {
                    distance:          "3.2 km",
                    duration:          "12 mins",
                    durationSeconds:   720,
                    shopCoords:        SHOP_COORDINATES,
                    deliveryAddress:   deliveryAddress + " (Approximated)",
                    deliveryCoords: {
                        lat: SHOP_COORDINATES.lat + 0.01,
                        lng: SHOP_COORDINATES.lng + 0.01
                    },
                    encodedPolyline:   "", // No polyline, but map will still render markers
                    mapsApiKey:        process.env.GOOGLE_MAPS_API_KEY
                };
            }

            await new Promise(r => setTimeout(r, 1000 * attempt));
        }
    }
};

/**
 * Geocode an address to lat/lng coordinates
 */
const geocodeAddress = async (address) => {
    try {
        const response = await axios.get(`${MAPS_BASE_URL}/geocode/json`, {
            params: {
                address: `${address}, Quezon City, Philippines`,
                key: process.env.GOOGLE_MAPS_API_KEY
            },
            timeout: 5000
        });

        if (response.data.status === "OK" && response.data.results.length > 0) {
            const location = response.data.results[0].geometry.location;
            return { lat: location.lat, lng: location.lng };
        }

        return null;
    } catch (err) {
        console.error("[MapsService] Geocoding failed:", err.message);
        return null;
    }
};

module.exports = { getDeliveryRoute, geocodeAddress };
