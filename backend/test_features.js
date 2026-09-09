'use strict';
const http = require('http');
const jwt = require('jsonwebtoken');
const { initDB, dbGet } = require('./src/db/database');
const { initSocket } = require('./src/sockets/socket.handler');
const app = require('./app');

async function runTests() {
  console.log('🧪 Starting Destination Management, Geofencing & Assignment Verification Tests...\n');

  initDB();

  const server = http.createServer(app);
  initSocket(server);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  console.log(`📡 Test Server running on ${baseUrl}`);

  // Fetch test tokens
  const managerUser = dbGet("SELECT * FROM users WHERE role = 'manager' AND is_active = 1 LIMIT 1");
  const driverUser = dbGet("SELECT * FROM users WHERE role = 'driver' AND is_active = 1 LIMIT 1");

  if (!managerUser || !driverUser) {
    throw new Error('Manager or Driver user missing from database');
  }

  const jwtSecret = process.env.JWT_SECRET || 'delivery_tracking_super_secret_key_2024';
  const managerToken = jwt.sign({ id: managerUser.id, role: managerUser.role }, jwtSecret, { expiresIn: '1h' });
  const driverToken = jwt.sign({ id: driverUser.id, role: driverUser.role }, jwtSecret, { expiresIn: '1h' });

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  async function req(path, { method = 'GET', body = null, token = null } = {}) {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (body) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, json };
  }

  try {
    // ── SUITE 1: Destination Management ──
    console.log('\n📍 SUITE 1: Destination Management CRUD');
    const newDest = {
      name: 'Ruby Hall Clinic Hub',
      address: '40 Sassoon Road, Pune 411001',
      lat: 18.5312,
      lng: 73.8744,
      radius_m: 400,
      description: 'Emergency blood transfusion wing entrance',
    };

    const createRes = await req('/api/destinations', { method: 'POST', body: newDest, token: managerToken });
    assert(createRes.status === 201 && createRes.json?.success, 'POST /api/destinations creates destination');
    const createdId = createRes.json?.data?.id;
    assert(createdId && createRes.json?.data?.name === newDest.name, 'Created destination returns correct ID and name');

    const getListRes = await req('/api/destinations', { token: managerToken });
    assert(getListRes.status === 200 && Array.isArray(getListRes.json?.data), 'GET /api/destinations returns array');
    assert(getListRes.json?.data.some(d => d.id === createdId), 'List contains created destination');

    const getSingleRes = await req(`/api/destinations/${createdId}`, { token: managerToken });
    assert(getSingleRes.status === 200 && getSingleRes.json?.data?.id === createdId, 'GET /api/destinations/:id returns item');

    const patchRes = await req(`/api/destinations/${createdId}`, {
      method: 'PATCH',
      body: { radius_m: 650, name: 'Ruby Hall Clinic - Emergency Wing' },
      token: managerToken,
    });
    assert(patchRes.status === 200 && patchRes.json?.data?.radius_m === 650, 'PATCH /api/destinations/:id updates radius');

    // ── SUITE 2: Driver Assignment & Collection Request ──
    console.log('\n🚚 SUITE 2: Driver Assignment & Blood Collection Request');
    const assignRes = await req('/api/assignments', {
      method: 'POST',
      body: {
        destination_id: createdId,
        driver_id: driverUser.id,
        source_name: 'Jankalyan Blood Centre (Swargate HQ)',
        source_lat: 18.5039,
        source_lng: 73.8524,
        urgency: 'emergency',
        notes: 'STAT 4 units O+ PRBC for surgery',
      },
      token: managerToken,
    });
    assert(assignRes.status === 201 && assignRes.json?.success, 'POST /api/assignments creates collection request');
    const assignmentId = assignRes.json?.data?.id;
    assert(assignRes.json?.data?.status === 'pending', 'Assignment initially has status "pending"');
    assert(assignRes.json?.data?.urgency === 'emergency', 'Assignment stores urgency "emergency"');
    assert(assignRes.json?.data?.notes === 'STAT 4 units O+ PRBC for surgery', 'Assignment stores notes');
    assert(assignRes.json?.data?.source_lat === 18.5039, 'Assignment stores source coordinates');

    // Register push token test
    const pushTokenRes = await req('/api/drivers/push-token', {
      method: 'POST',
      body: { push_token: 'ExponentPushToken[mock_test_token_12345]' },
      token: driverToken,
    });
    assert(pushTokenRes.status === 200 && pushTokenRes.json?.success, 'POST /api/drivers/push-token registers token');

    // Driver retrieves active assignment
    const driverActiveRes = await req('/api/assignments/driver/active', { token: driverToken });
    assert(driverActiveRes.status === 200 && driverActiveRes.json?.data?.id === assignmentId, 'GET /api/assignments/driver/active returns pending assignment');
    assert(driverActiveRes.json?.data?.urgency === 'emergency', 'Driver active assignment includes urgency');

    // Driver accepts assignment
    const acceptRes = await req(`/api/assignments/${assignmentId}/status`, {
      method: 'PATCH',
      body: { status: 'accepted' },
      token: driverToken,
    });
    assert(acceptRes.status === 200 && acceptRes.json?.data?.status === 'accepted', 'PATCH /api/assignments/:id/status sets status to "accepted"');
    assert(Boolean(acceptRes.json?.data?.accepted_at), 'Assignment records accepted_at timestamp');

    // ── SUITE 3: Geofence Notifications ──
    console.log('\n🔔 SUITE 3: Geofence Notifications');
    const { createGeofenceNotification } = require('./src/modules/notifications/notifications.service');
    const testNotif = createGeofenceNotification({
      manager_id: managerUser.id,
      driver_id: driverUser.id,
      destination_id: createdId,
      assignment_id: assignmentId,
      message: `Driver ${driverUser.name} arrived at destination (${newDest.name})`,
      distance_m: 150,
    });
    assert(Boolean(testNotif?.id), 'Notification service creates record in database');

    const notifsRes = await req('/api/notifications', { token: managerToken });
    assert(notifsRes.status === 200 && notifsRes.json?.count > 0, 'GET /api/notifications returns list');
    assert(notifsRes.json?.unreadCount > 0, 'Unread count is greater than 0');

    const readRes = await req(`/api/notifications/${testNotif.id}/read`, {
      method: 'PATCH',
      token: managerToken,
    });
    assert(readRes.status === 200 && readRes.json?.data?.is_read === 1, 'PATCH /api/notifications/:id/read marks notification as read');

    const readAllRes = await req('/api/notifications/read-all', {
      method: 'PATCH',
      token: managerToken,
    });
    assert(readAllRes.status === 200 && readAllRes.json?.unreadCount === 0, 'PATCH /api/notifications/read-all marks all read');

    // ── SUITE 4: Assignment Completion ──
    console.log('\n🏁 SUITE 4: Assignment Completion & Cleanup');
    const completeRes = await req(`/api/assignments/${assignmentId}/status`, {
      method: 'PATCH',
      body: { status: 'completed' },
      token: driverToken,
    });
    assert(completeRes.status === 200 && completeRes.json?.data?.status === 'completed', 'Driver can complete assignment');

    // Delete destination soft deletes
    const deleteRes = await req(`/api/destinations/${createdId}`, {
      method: 'DELETE',
      token: managerToken,
    });
    assert(deleteRes.status === 200 && deleteRes.json?.success, 'DELETE /api/destinations/:id soft deletes');

  } catch (err) {
    console.error('❌ Test error:', err);
    failed++;
  } finally {
    server.close();
  }

  console.log(`\n======================================================`);
  console.log(`🏁 TEST RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
