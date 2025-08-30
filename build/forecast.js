import { z } from "zod";
import { makeNWSRequest } from "./nwsApi.js";
import { NWS_API_BASE } from "./server.js";
function formatForecast(period) {
    return [
        `${period.name || "Unknown"}:`,
        `Temperature: ${period.temperature || "Unknown"}°${period.temperatureUnit || "F"}`,
        `Wind: ${period.windSpeed || "Unknown"} ${period.windDirection || ""}`,
        `${period.shortForecast || "No forecast available"}`,
        "---",
    ].join("\n");
}
export function registerForecastTool(server) {
    server.tool("get_forecast", "Get weather forecast for a location", {
        latitude: z.number().min(-90).max(90).describe("Latitude of the location"),
        longitude: z
            .number()
            .min(-180)
            .max(180)
            .describe("Longitude of the location"),
    }, async ({ latitude, longitude }) => {
        const pointsUrl = `${NWS_API_BASE}/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
        const pointsData = await makeNWSRequest(pointsUrl);
        if (!pointsData) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to retrieve grid point data for coordinates: ${latitude}, ${longitude}. This location may not be supported by the NWS API (only US locations are supported).`,
                    },
                ],
            };
        }
        const forecastUrl = pointsData.properties?.forecast;
        if (!forecastUrl) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to get forecast URL from grid point data",
                    },
                ],
            };
        }
        const forecastData = await makeNWSRequest(forecastUrl);
        if (!forecastData) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Failed to retrieve forecast data",
                    },
                ],
            };
        }
        const periods = forecastData.properties?.periods || [];
        if (periods.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No forecast periods available",
                    },
                ],
            };
        }
        const formattedForecast = periods.map(formatForecast);
        const forecastText = `Forecast for ${latitude}, ${longitude}:\n\n${formattedForecast.join("\n")}`;
        return {
            content: [
                {
                    type: "text",
                    text: forecastText,
                },
            ],
        };
    });
}
