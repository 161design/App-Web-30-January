/**
 * Convert GPS coordinates (latitude, longitude) to UTM format
 * Based on the Universal Transverse Mercator coordinate system
 */

export interface UTMCoordinates {
  easting: number;
  northing: number;
  zone: number;
  hemisphere: 'N' | 'S';
  formatted: string;
}

export function gpsToUTM(latitude: number, longitude: number): UTMCoordinates {
  // WGS84 parameters
  const a = 6378137.0; // Semi-major axis
  const f = 1 / 298.257223563; // Flattening
  const k0 = 0.9996; // Scale factor

  // Calculate UTM zone
  const zone = Math.floor((longitude + 180) / 6) + 1;
  const hemisphere = latitude >= 0 ? 'N' : 'S';

  // Convert to radians
  const latRad = (latitude * Math.PI) / 180;
  const lonRad = (longitude * Math.PI) / 180;

  // Central meridian for the zone
  const lonOrigin = ((zone - 1) * 6 - 180 + 3) * (Math.PI / 180);

  // Calculate intermediate values
  const e = Math.sqrt(2 * f - f * f); // Eccentricity
  const e2 = e * e;
  const e4 = e2 * e2;
  const e6 = e4 * e2;

  const n = a / Math.sqrt(1 - e2 * Math.sin(latRad) * Math.sin(latRad));
  const t = Math.tan(latRad) * Math.tan(latRad);
  const c = (e2 * Math.cos(latRad) * Math.cos(latRad)) / (1 - e2);
  const A = (longitude - ((zone - 1) * 6 - 180 + 3)) * (Math.PI / 180) * Math.cos(latRad);

  const M =
    a *
    ((1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * latRad -
      ((3 * e2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * latRad) +
      ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * latRad) -
      ((35 * e6) / 3072) * Math.sin(6 * latRad));

  // Calculate easting and northing
  let easting =
    k0 *
      n *
      (A +
        ((1 - t + c) * A * A * A) / 6 +
        ((5 - 18 * t + t * t + 72 * c - 58 * (e2 / (1 - e2))) * A * A * A * A * A) / 120) +
    500000;

  let northing =
    k0 *
    (M +
      n *
        Math.tan(latRad) *
        ((A * A) / 2 +
          ((5 - t + 9 * c + 4 * c * c) * A * A * A * A) / 24 +
          ((61 - 58 * t + t * t + 600 * c - 330 * (e2 / (1 - e2))) * A * A * A * A * A * A) /
            720));

  // Adjust for southern hemisphere
  if (latitude < 0) {
    northing += 10000000;
  }

  // Round to 2 decimal places
  easting = Math.round(easting * 100) / 100;
  northing = Math.round(northing * 100) / 100;

  const formatted = `${zone}${hemisphere} ${easting.toFixed(2)}E ${northing.toFixed(2)}N`;

  return {
    easting,
    northing,
    zone,
    hemisphere,
    formatted,
  };
}

/**
 * Get current GPS location and convert to UTM
 */
export async function getCurrentUTMLocation(): Promise<string | null> {
  try {
    const Location = await import('expo-location');

    // Request permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    // Get current position
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const { latitude, longitude } = location.coords;
    const utm = gpsToUTM(latitude, longitude);

    return utm.formatted;
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
}
