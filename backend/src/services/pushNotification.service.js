'use strict';
const https = require('https');
const { dbGet } = require('../db/database');

/**
 * Send an Expo Push Notification to a mobile device.
 * @param {Object} options
 * @param {string} options.pushToken - Expo push token (ExponentPushToken[...])
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body text
 * @param {Object} [options.data] - Custom payload data
 * @returns {Promise<Object>}
 */
async function sendExpoPushNotification({ pushToken, title, body, data = {} }) {
  if (!pushToken || !pushToken.startsWith('ExponentPushToken[')) {
    // Graceful no-op if token is missing or not an Expo push token
    return { success: false, reason: 'Invalid or missing Expo push token' };
  }

  const payload = JSON.stringify({
    to: pushToken,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high',
    channelId: 'collection-requests',
  });

  return new Promise((resolve) => {
    const req = https.request(
      'https://exp.host/--/api/v2/push/send',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 5000,
      },
      (res) => {
        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            resolve({ success: true, data: parsed });
          } catch (_) {
            resolve({ success: true, raw: responseData });
          }
        });
      }
    );

    req.on('error', (err) => {
      console.warn('[PushNotification] Error sending push:', err.message);
      resolve({ success: false, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, reason: 'Push request timed out' });
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Send a collection request push notification to a driver by their user ID.
 */
async function sendDriverCollectionPush({ driverId, title, body, data }) {
  try {
    const user = dbGet('SELECT push_token FROM users WHERE id = ?', [driverId]);
    if (user && user.push_token) {
      return await sendExpoPushNotification({
        pushToken: user.push_token,
        title,
        body,
        data,
      });
    }
  } catch (err) {
    console.warn('[PushNotification] Driver lookup failed:', err.message);
  }
  return { success: false, reason: 'No push token for driver' };
}

module.exports = {
  sendExpoPushNotification,
  sendDriverCollectionPush,
};
