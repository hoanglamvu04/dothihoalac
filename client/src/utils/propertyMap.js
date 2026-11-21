/**
 * Only use GeoJSON coordinates saved and published with a property listing.
 * Displaying fake geocoded pins from an address label would mislead visitors.
 */
export function propertyMapLocations(items = [], maxItems = 12) {
  if (!Array.isArray(items)) return [];

  const unique = new Set();
  const points = [];

  for (const item of items) {
    const raw = item?.property?.location?.coordinates;
    if (!Array.isArray(raw) || raw.length !== 2) continue;

    const longitude = Number(raw[0]);
    const latitude = Number(raw[1]);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180 ||
      (latitude === 0 && longitude === 0)
    ) {
      continue;
    }

    const id = String(item?._id || item?.id || '');
    if (!id || unique.has(id)) continue;
    unique.add(id);

    points.push({
      id,
      title: String(item?.title || 'Tin bất động sản'),
      address: String(item?.property?.addressText || ''),
      latitude,
      longitude,
      href: item?.slug ? '/bat-dong-san/' + encodeURIComponent(String(item.slug)) : '#',
    });

    if (points.length >= Math.min(30, Math.max(1, Number(maxItems) || 12))) break;
  }

  return points;
}

function normalizedCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180 ||
    (lat === 0 && lng === 0)
  ) return null;

  return { lat, lng };
}

export function openStreetMapEmbedUrl(latitude, longitude) {
  const coords = normalizedCoordinates(latitude, longitude);
  if (!coords) return '';

  const radiusLat = 0.008;
  const radiusLng = 0.013;
  const west = Math.max(-180, coords.lng - radiusLng);
  const south = Math.max(-90, coords.lat - radiusLat);
  const east = Math.min(180, coords.lng + radiusLng);
  const north = Math.min(90, coords.lat + radiusLat);

  const params = new URLSearchParams({
    bbox: [west, south, east, north].join(','),
    layer: 'mapnik',
    marker: [coords.lat, coords.lng].join(','),
  });

  return 'https://www.openstreetmap.org/export/embed.html?' + params.toString();
}

export function googleMapsPropertyUrl(latitude, longitude) {
  const coords = normalizedCoordinates(latitude, longitude);
  if (!coords) return '';
  const query = encodeURIComponent(coords.lat + ',' + coords.lng);
  return 'https://www.google.com/maps/search/?api=1&query=' + query;
}
