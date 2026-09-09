import { Platform } from 'react-native';
import * as Location from 'expo-location';

/**
 * Cache for reverse-geocoded coordinates to prevent redundant network calls
 */
const geocodeCache = new Map();

const PUNE_LOCALITIES = [
  { name: 'Pashan, Pune, Maharashtra', lat: 18.54414, lng: 73.79346, r: 0.035 },
  { name: 'Baner, Pune, Maharashtra', lat: 18.5590, lng: 73.7868, r: 0.03 },
  { name: 'Aundh, Pune, Maharashtra', lat: 18.5580, lng: 73.8070, r: 0.028 },
  { name: 'Kothrud, Pune, Maharashtra', lat: 18.5080, lng: 73.8050, r: 0.035 },
  { name: 'Shivajinagar, Pune, Maharashtra', lat: 18.5204, lng: 73.8567, r: 0.035 },
  { name: 'Hinjewadi IT Park, Pune, Maharashtra', lat: 18.5987, lng: 73.7378, r: 0.045 },
  { name: 'Wakad, Pune, Maharashtra', lat: 18.5922, lng: 73.7845, r: 0.032 },
  { name: 'Viman Nagar, Pune, Maharashtra', lat: 18.5679, lng: 73.9143, r: 0.035 },
];

function findPuneLocality(lat, lng) {
  for (const loc of PUNE_LOCALITIES) {
    const d = Math.sqrt((lat - loc.lat) ** 2 + (lng - loc.lng) ** 2);
    if (d <= loc.r) return loc.name;
  }
  if (lat >= 18.40 && lat <= 18.68 && lng >= 73.70 && lng <= 74.05) {
    return 'Pashan, Pune, Maharashtra';
  }
  return null;
}

/**
 * Reverse geocode latitude and longitude to a human-readable address
 * using OpenStreetMap Nominatim with caching and fallback.
 */
export async function reverseGeocodeCoords(lat, lng) {
  if (lat == null || lng == null) return 'Pashan, Pune, Maharashtra';

  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  const localLocality = findPuneLocality(lat, lng);

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DeliveryTrackingSystem/1.0',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const parts = [
          addr.road || addr.street || addr.suburb || addr.neighbourhood,
          addr.city || addr.town || addr.village || addr.county || 'Pune',
          addr.state || 'Maharashtra',
        ].filter(Boolean);

        const formatted = parts.length > 0
          ? parts.join(', ')
          : (localLocality || 'Pashan, Pune, Maharashtra');

        geocodeCache.set(cacheKey, formatted);
        return formatted;
      }
    }
  } catch (err) {
    console.warn('[GPS] Reverse geocoding fetch failed, using locality fallback:', err.message);
  }

  const fallback = localLocality || 'Pashan, Pune, Maharashtra';
  geocodeCache.set(cacheKey, fallback);
  return fallback;
}

/**
 * Request GPS permissions on Web or Mobile
 */
export async function requestLocationPermissions() {
  if (Platform.OS === 'web') {
    if (!navigator.geolocation) {
      return { granted: false, error: 'Geolocation is not supported by your browser.' };
    }
    // Web browsers prompt upon the first getCurrentPosition call
    return { granted: true };
  } else {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return { granted: status === 'granted' };
    } catch (err) {
      return { granted: false, error: err.message };
    }
  }
}

/**
 * Helper to fetch web position with graceful fallback from High Accuracy to Standard
 * Prevents timeouts on laptops/desktops lacking dedicated GPS hardware.
 */
function acquireWebPosition(timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error('Geolocation is not supported by this browser.'));
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      (err) => {
        // If high accuracy times out (code 3) or position unavailable (code 2), fallback to standard Wi-Fi/IP geolocation
        if (err.code === 3 || err.code === 2) {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
          );
        } else {
          reject(err);
        }
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 10000 }
    );
  });
}

/**
 * Acquire exact, high-accuracy current GPS location from hardware / browser
 */
export async function getExactCurrentLocation() {
  if (Platform.OS === 'web') {
    try {
      const position = await acquireWebPosition(6000);
      const { latitude, longitude, speed, heading, accuracy } = position.coords;
      const address = await reverseGeocodeCoords(latitude, longitude);

      return {
        lat: latitude,
        lng: longitude,
        speed: Math.max(0, (speed || 0) * 3.6), // m/s to km/h
        heading: heading || 0,
        accuracy: Math.round(accuracy || 0),
        address,
        timestamp: position.timestamp,
      };
    } catch (error) {
      let msg = 'Unable to retrieve location.';
      if (error.code === 1) msg = 'Location access denied. Please allow GPS permission in your browser address bar.';
      else if (error.code === 2) msg = 'Location unavailable. Please check network or GPS.';
      else if (error.code === 3) msg = 'Location request timed out. Please try again or use simulator.';
      throw new Error(msg);
    }
  } else {
    // Native (iOS / Android)
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Foreground location permission was denied.');
    }

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const { latitude, longitude, speed, heading, accuracy } = pos.coords;
    const address = await reverseGeocodeCoords(latitude, longitude);

    return {
      lat: latitude,
      lng: longitude,
      speed: Math.max(0, (speed || 0) * 3.6),
      heading: heading || 0,
      accuracy: Math.round(accuracy || 0),
      address,
      timestamp: pos.timestamp,
    };
  }
}

/**
 * Dynamic movement tracker: computes realistic speed (km/h) and direction (bearing)
 * between consecutive GPS positions, especially useful when mobile OS reports null/0 speed.
 */
let prevTrackedPosition = null;
let lastGeocodedPoint = null;
let cachedAddress = null;

export function calculateMovementDynamics(prev, curr) {
  if (!prev) {
    return {
      speed: curr.speed || 0,
      heading: curr.heading || 0,
    };
  }

  const R = 6371000; // Earth radius in meters
  const dLat = (curr.lat - prev.lat) * (Math.PI / 180);
  const dLng = (curr.lng - prev.lng) * (Math.PI / 180);
  const lat1 = prev.lat * (Math.PI / 180);
  const lat2 = curr.lat * (Math.PI / 180);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceMeters = R * c;

  const timeDeltaSec = Math.max(0.5, ((curr.timestamp || Date.now()) - (prev.timestamp || Date.now() - 3000)) / 1000);

  // Use OS hardware sensor speed if positive, otherwise calculate from displacement
  let speed = curr.speed;
  if (!speed || speed <= 0) {
    if (distanceMeters > 1.2 && timeDeltaSec < 20) {
      speed = (distanceMeters / timeDeltaSec) * 3.6; // m/s to km/h
    } else {
      speed = 0;
    }
  }

  // Heading bearing calculation if vehicle moved > 1.5 meters
  let heading = curr.heading;
  if ((!heading || heading === 0) && distanceMeters > 1.5) {
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    heading = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  } else if (!heading) {
    heading = prev.heading || 0;
  }

  return {
    speed: parseFloat(Math.min(180, Math.max(0, speed)).toFixed(1)),
    heading: Math.round(heading),
  };
}

async function getOptimizedAddress(lat, lng) {
  if (!lastGeocodedPoint || !cachedAddress) {
    cachedAddress = await reverseGeocodeCoords(lat, lng);
    lastGeocodedPoint = { lat, lng, time: Date.now() };
    return cachedAddress;
  }

  // If vehicle has moved less than 120m and within 15s, reuse current road/locality
  const dLat = Math.abs(lat - lastGeocodedPoint.lat);
  const dLng = Math.abs(lng - lastGeocodedPoint.lng);
  const approxDistance = Math.sqrt(dLat * dLat + dLng * dLng) * 111000;

  if (approxDistance < 120 && (Date.now() - lastGeocodedPoint.time) < 15000) {
    return cachedAddress;
  }

  cachedAddress = await reverseGeocodeCoords(lat, lng);
  lastGeocodedPoint = { lat, lng, time: Date.now() };
  return cachedAddress;
}

/**
 * Continuous real-time GPS location watcher
 * Supports continuous streaming on both Web and Mobile as vehicles travel along roads.
 */
export function startLocationWatcher(onLocation, onError) {
  let isStopped = false;
  let webWatchId = null;
  let webPollInterval = null;
  let nativeSubscription = null;

  const processPoint = async (rawPoint) => {
    if (isStopped) return;

    const dynamics = calculateMovementDynamics(prevTrackedPosition, rawPoint);
    const address = await getOptimizedAddress(rawPoint.lat, rawPoint.lng);
    if (isStopped) return;

    const processed = {
      lat: rawPoint.lat,
      lng: rawPoint.lng,
      speed: dynamics.speed,
      heading: dynamics.heading,
      accuracy: rawPoint.accuracy,
      address,
      timestamp: rawPoint.timestamp || Date.now(),
    };

    prevTrackedPosition = processed;
    onLocation(processed);
  };

  if (Platform.OS === 'web') {
    if (!navigator.geolocation) {
      onError?.(new Error('Geolocation not supported'));
      return () => {};
    }

    const handleWebCoords = (coords, timestamp) => {
      processPoint({
        lat: coords.latitude,
        lng: coords.longitude,
        speed: Math.max(0, (coords.speed || 0) * 3.6),
        heading: coords.heading || 0,
        accuracy: Math.round(coords.accuracy || 0),
        timestamp,
      });
    };

    // 1. Immediate acquisition with fallback
    acquireWebPosition(6000)
      .then(pos => handleWebCoords(pos.coords, pos.timestamp))
      .catch(err => {
        if (err.code === 1) {
          onError?.(new Error('Location access denied. Please grant permission.'));
        }
      });

    // 2. Continuous watch with standard + high accuracy tolerance
    webWatchId = navigator.geolocation.watchPosition(
      (pos) => handleWebCoords(pos.coords, pos.timestamp),
      () => {}, // Silent error on watch fallback
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 }
    );

    // 3. Periodic polling every 3 seconds to guarantee telemetry packets stream continuously
    webPollInterval = setInterval(() => {
      if (isStopped) return;
      acquireWebPosition(4000)
        .then(pos => handleWebCoords(pos.coords, pos.timestamp))
        .catch(() => {}); // Periodic catch
    }, 3000);

    return () => {
      isStopped = true;
      if (webWatchId !== null) navigator.geolocation.clearWatch(webWatchId);
      if (webPollInterval !== null) clearInterval(webPollInterval);
    };
  } else {
    // Native (iOS / Android)
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          onError?.(new Error('Location permission denied'));
          return;
        }

        // Optional background permission request for driving with screen locked / app backgrounded
        try {
          if (Location.requestBackgroundPermissionsAsync) {
            await Location.requestBackgroundPermissionsAsync();
          }
        } catch (_) {}

        // Immediate first point
        const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (!isStopped) {
          processPoint({
            lat: first.coords.latitude,
            lng: first.coords.longitude,
            speed: Math.max(0, (first.coords.speed || 0) * 3.6),
            heading: first.coords.heading || 0,
            accuracy: Math.round(first.coords.accuracy || 0),
            timestamp: first.timestamp,
          });
        }

        // Continuous watch with distanceInterval: 0 to catch every vehicle movement
        nativeSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 2000, // Update every 2 seconds while moving
            distanceInterval: 1, // Trigger on 1 meter movement
          },
          (pos) => {
            if (isStopped) return;
            processPoint({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              speed: Math.max(0, (pos.coords.speed || 0) * 3.6),
              heading: pos.coords.heading || 0,
              accuracy: Math.round(pos.coords.accuracy || 0),
              timestamp: pos.timestamp,
            });
          }
        );
      } catch (err) {
        if (!isStopped) onError?.(err);
      }
    })();

    return () => {
      isStopped = true;
      if (nativeSubscription) nativeSubscription.remove();
    };
  }
}
