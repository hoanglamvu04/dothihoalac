const FORECAST_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

// Điểm trung tâm gần khu vực Hòa Lạc, chỉ dùng để lấy dự báo khu vực chung.
const HOA_LAC_COORDINATES = {
  latitude: 21.01,
  longitude: 105.52,
};

export async function getHoaLacForecast({ signal } = {}) {
  const params = new URLSearchParams({
    latitude: String(HOA_LAC_COORDINATES.latitude),
    longitude: String(HOA_LAC_COORDINATES.longitude),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'weather_code',
      'wind_speed_10m',
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
    ].join(','),
    forecast_days: '4',
    timezone: 'auto',
  });

  const response = await fetch(`${FORECAST_ENDPOINT}?${params}`, {
    method: 'GET',
    signal,
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Không tải được dự báo thời tiết Hòa Lạc.');
  }

  return response.json();
}
