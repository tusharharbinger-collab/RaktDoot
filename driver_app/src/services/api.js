import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_STORAGE_KEY = '@delivery_driver_auth_v1';
const SERVER_URL_KEY = '@delivery_server_url_v1';

export async function getStoredServerUrl(defaultUrl) {
  try {
    const stored = await AsyncStorage.getItem(SERVER_URL_KEY);
    // If stored URL is stale localhost or internal network on a live environment, use defaultUrl
    if (stored && (stored.includes('localhost') || stored.includes('10.0.2.2') || stored.includes('10.60.'))) {
      return defaultUrl;
    }
    return stored || defaultUrl;
  } catch (_) {
    return defaultUrl;
  }
}

export async function storeServerUrl(url) {
  try {
    await AsyncStorage.setItem(SERVER_URL_KEY, url);
  } catch (_) {}
}

export async function getStoredAuth() {
  try {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

export async function storeAuth(authData) {
  try {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
  } catch (_) {}
}

export async function clearAuth() {
  try {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (_) {}
}

export async function loginDriver(serverUrl, email, password) {
  const url = `${serverUrl.replace(/\/+$/, '')}/api/auth/login`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Login failed. Please verify credentials.');
  }

  return data.data; // { token, user }
}

export async function registerDriver(serverUrl, { name, email, password, phone, vehicle_type, vehicle_number }) {
  const url = `${serverUrl.replace(/\/+$/, '')}/api/auth/register`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      email,
      password,
      phone,
      role: 'driver',
      vehicle_type: vehicle_type || 'two_wheeler',
      vehicle_number: vehicle_number || null,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Registration failed. Please try again.');
  }

  return data.data; // { token, user }
}

export async function updateDriverProfile(serverUrl, token, profileData) {
  const url = `${serverUrl.replace(/\/+$/, '')}/api/drivers/profile`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to update vehicle profile');
  }

  return data.data;
}

export async function getDriverProfile(serverUrl, token, driverId) {
  const url = `${serverUrl.replace(/\/+$/, '')}/api/drivers/${driverId}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch driver profile');
  }

  return data.data;
}

export async function getDriverIssues(serverUrl, token) {
  const url = `${serverUrl.replace(/\/+$/, '')}/api/issues`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    return [];
  }

  return data.data || [];
}

export async function createIssue(serverUrl, token, issueData) {
  const url = `${serverUrl.replace(/\/+$/, '')}/api/issues`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(issueData),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to submit issue report');
  }

  return data.data;
}
