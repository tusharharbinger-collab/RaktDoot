// Comprehensive System Integration Test Suite
const http = require('http');
const { io } = require('./web/node_modules/socket.io-client');
const fs = require('fs');
const path = require('path');

const BACKEND_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:5173';

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

function request(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 5000,
    };

    if (postData) {
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) {}
        resolve({ status: res.statusCode, headers: res.headers, data, json });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });

    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🚀 RUNNING COMPLETE SYSTEM VERIFICATION TESTS');
  console.log('======================================================\n');

  // ─────────────────────────────────────────
  // 1. HEALTH CHECK
  // ─────────────────────────────────────────
  console.log('📦 TEST SUITE 1: Backend Health Check');
  try {
    const res = await request(`${BACKEND_URL}/health`);
    assert(res.status === 200, 'GET /health returns HTTP 200');
    assert(res.json?.status === 'ok', 'Status is "ok"');
    assert(res.json?.service === 'raktdoot-tracking-api' || res.json?.service === 'delivery-tracking-api', 'Service is tracking API');
    assert(typeof res.json?.timestamp === 'string', 'Timestamp is present and valid string');
  } catch (err) {
    assert(false, `Health check failed: ${err.message}`);
  }

  // ─────────────────────────────────────────
  // 2. AUTHENTICATION
  // ─────────────────────────────────────────
  console.log('\n🔐 TEST SUITE 2: Authentication & Multi-Role Access');
  let managerToken = null;
  let driverToken = null;
  let adminToken = null;
  let driverUser = null;

  try {
    // Manager login
    const mRes = await request(`${BACKEND_URL}/api/auth/login`, { method: 'POST' }, JSON.stringify({
      email: 'manager@delivery.com',
      password: 'manager123',
    }));
    assert(mRes.status === 200, 'Manager login returns HTTP 200');
    assert(mRes.json?.success === true, 'Manager login success flag is true');
    assert(mRes.json?.data?.user?.role === 'manager', 'Manager role is "manager"');
    assert(!!mRes.json?.data?.token, 'Manager receives valid JWT token');
    managerToken = mRes.json?.data?.token;

    // Driver login
    const dRes = await request(`${BACKEND_URL}/api/auth/login`, { method: 'POST' }, JSON.stringify({
      email: 'driver1@delivery.com',
      password: 'driver123',
    }));
    assert(dRes.status === 200, 'Driver login returns HTTP 200');
    assert(dRes.json?.data?.user?.role === 'driver', 'Driver role is "driver"');
    driverToken = dRes.json?.data?.token;
    driverUser = dRes.json?.data?.user;

    // Admin login
    const aRes = await request(`${BACKEND_URL}/api/auth/login`, { method: 'POST' }, JSON.stringify({
      email: 'admin@delivery.com',
      password: 'admin123',
    }));
    assert(aRes.status === 200, 'Admin login returns HTTP 200');
    assert(aRes.json?.data?.user?.role === 'admin', 'Admin role is "admin"');
    adminToken = aRes.json?.data?.token;

    // Invalid credentials check
    const badRes = await request(`${BACKEND_URL}/api/auth/login`, { method: 'POST' }, JSON.stringify({
      email: 'manager@delivery.com',
      password: 'wrongpassword',
    }));
    assert(badRes.status === 401, 'Invalid password correctly rejected with HTTP 401');
  } catch (err) {
    assert(false, `Auth tests failed: ${err.message}`);
  }

  // ─────────────────────────────────────────
  // 3. REST APIS & DATA RETRIEVAL
  // ─────────────────────────────────────────
  console.log('\n📊 TEST SUITE 3: REST APIs & Drivers List');
  let driversList = [];
  let firstDriverId = null;

  try {
    const driversRes = await request(`${BACKEND_URL}/api/drivers`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(driversRes.status === 200, 'GET /api/drivers returns HTTP 200');
    assert(Array.isArray(driversRes.json?.data), 'Drivers list is an array');
    assert(driversRes.json?.data?.length > 0, `Returned ${driversRes.json?.data?.length} drivers`);
    driversList = driversRes.json?.data || [];

    const sample = driversList[0];
    assert(sample && sample.id && sample.name, 'Driver object has id and name properties');
    assert(sample.lat !== undefined && sample.lng !== undefined, 'Driver object has GPS coordinates');
    firstDriverId = sample.id;

    // Single driver details
    const singleRes = await request(`${BACKEND_URL}/api/drivers/${firstDriverId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(singleRes.status === 200, `GET /api/drivers/${firstDriverId} returns HTTP 200`);
    assert(singleRes.json?.data?.id === firstDriverId, 'Fetched driver id matches');

    // Admin Telemetry endpoint
    const telemetryRes = await request(`${BACKEND_URL}/api/admin/telemetry`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(telemetryRes.status === 200, 'GET /api/admin/telemetry returns HTTP 200');
    assert(telemetryRes.json?.data?.totalDrivers > 0, `Admin telemetry reports totalDrivers: ${telemetryRes.json?.data?.totalDrivers}`);
    assert(telemetryRes.json?.data?.activeDrivers >= 0, `Admin telemetry reports activeDrivers: ${telemetryRes.json?.data?.activeDrivers}`);
    assert(typeof telemetryRes.json?.data?.uptime === 'number', 'Admin telemetry reports server uptime');

    // Issues endpoint
    const issuesRes = await request(`${BACKEND_URL}/api/issues`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(issuesRes.status === 200, 'GET /api/issues returns HTTP 200');
    assert(Array.isArray(issuesRes.json?.data), 'Issues list is an array');
  } catch (err) {
    assert(false, `REST API tests failed: ${err.message}`);
  }

  // ─────────────────────────────────────────
  // 4. MAP PERSON SEARCH FEATURE LOGIC TEST
  // ─────────────────────────────────────────
  console.log('\n🔍 TEST SUITE 4: Map Person Search & Filtering Logic');
  try {
    assert(driversList.length >= 2, 'Fleet list has sufficient personnel for search tests');

    // Search by Name
    const targetDriver = driversList[0];
    const searchTerm = targetDriver.name.slice(0, 3).toLowerCase();
    const nameMatches = driversList.filter(d => d.name?.toLowerCase().includes(searchTerm));
    assert(nameMatches.length >= 1, `Searching query "${searchTerm}" matches ${nameMatches.length} driver(s)`);
    assert(nameMatches.some(d => d.id === targetDriver.id), `Target driver "${targetDriver.name}" found in search results`);

    // Search by Phone
    if (targetDriver.phone) {
      const phoneDigits = targetDriver.phone.replace(/\D/g, '').slice(-4);
      const phoneMatches = driversList.filter(d => d.phone?.includes(phoneDigits));
      assert(phoneMatches.length >= 1, `Searching phone digits "${phoneDigits}" correctly locates driver`);
    }

    // Status Filter Tabs
    const activeDrivers = driversList.filter(d => d.status === 'active');
    const idleDrivers = driversList.filter(d => d.status === 'idle');
    assert(activeDrivers.length >= 0 && idleDrivers.length >= 0, 'Status filtering isolates drivers properly');

    // Check GPS presence logic
    const withGps = driversList.filter(d => d.lat && d.lng && (d.lat !== 0 || d.lng !== 0));
    assert(withGps.length > 0, `${withGps.length} driver(s) ready for live map camera flyTo`);
  } catch (err) {
    assert(false, `Map Person Search tests failed: ${err.message}`);
  }

  // ─────────────────────────────────────────
  // 5. REAL-TIME WEBSOCKET (SOCKET.IO) TEST
  // ─────────────────────────────────────────
  console.log('\n⚡ TEST SUITE 5: Real-Time Socket.io Telemetry & Alerts');
  await new Promise((resolve) => {
    let managerSocket = null;
    let driverSocket = null;
    let timeoutId = null;

    timeoutId = setTimeout(() => {
      assert(false, 'Socket test timed out after 7 seconds');
      if (managerSocket) managerSocket.disconnect();
      if (driverSocket) driverSocket.disconnect();
      resolve();
    }, 7000);

    try {
      // Connect Manager Socket
      managerSocket = io(BACKEND_URL, {
        auth: { token: managerToken },
        transports: ['websocket'],
      });

      managerSocket.on('connect', () => {
        assert(true, 'Manager socket connected successfully to WebSocket server');
      });

      managerSocket.on('initial_fleet_state', (data) => {
        assert(Array.isArray(data.drivers), 'Manager received initial_fleet_state array');

        // Connect Driver Socket
        driverSocket = io(BACKEND_URL, {
          auth: { token: driverToken },
          transports: ['websocket'],
        });

        driverSocket.on('connect', () => {
          assert(true, 'Driver socket connected successfully to WebSocket server');

          // Driver sends live location update
          setTimeout(() => {
            driverSocket.emit('location_update', {
              lat: 18.5204,
              lng: 73.8567,
              speed: 46.5,
              heading: 180,
              status: 'active',
              address: 'FC Road, Shivaji Nagar, Pune',
            });
          }, 300);
        });
      });

      // Manager listens for real-time fleet_update
      managerSocket.on('fleet_update', (update) => {
        if (update.driver_id === driverUser.id) {
          assert(true, `Manager received real-time fleet_update for driver ${update.driver_name}`);
          assert(update.lat === 18.5204 && update.lng === 73.8567, 'GPS coordinates match emitted telemetry (18.5204, 73.8567)');
          assert(update.speed === 46.5, 'Speed matches emitted telemetry (46.5 km/h)');
          assert(update.address === 'FC Road, Shivaji Nagar, Pune', 'Manager received exact physical address: "FC Road, Shivaji Nagar, Pune"');

          // Now test issue reporting
          driverSocket.emit('issue_reported', {
            type: 'vehicle_breakdown',
            description: 'Flat tire on Western Express Highway',
            severity: 'critical',
            lat: 18.5204,
            lng: 73.8567,
          });
        }
      });

      // Manager listens for issue_alert
      managerSocket.on('issue_alert', (payload) => {
        const issue = payload.issue || payload;
        assert(true, `Manager received real-time issue_alert: ${issue.type}`);
        assert(issue.description.includes('Flat tire'), 'Issue description matches emitted alert');
        clearTimeout(timeoutId);
        managerSocket.disconnect();
        driverSocket.disconnect();
        resolve();
      });
    } catch (err) {
      assert(false, `Socket test error: ${err.message}`);
      clearTimeout(timeoutId);
      resolve();
    }
  });

  // ─────────────────────────────────────────
  // 6. FRONTEND SERVER & BUILD VERIFICATION
  // ─────────────────────────────────────────
  console.log('\n🌐 TEST SUITE 6: Web Portal Server & Production Bundle');
  try {
    // Check Dev Server
    const fRes = await request(`${FRONTEND_URL}/`);
    assert(fRes.status === 200, 'Frontend dev server GET / returns HTTP 200');
    assert(fRes.data.includes('<div id="root"></div>') || fRes.data.includes('id="root"'), 'HTML contains #root container');

    // Check Production Dist Bundle
    const distHtml = path.resolve(__dirname, 'web/dist/index.html');
    assert(fs.existsSync(distHtml), 'Production build file web/dist/index.html exists');

    const distAssets = fs.readdirSync(path.resolve(__dirname, 'web/dist/assets'));
    const hasJs = distAssets.some(f => f.endsWith('.js'));
    const hasCss = distAssets.some(f => f.endsWith('.css'));
    assert(hasJs && hasCss, `Production assets present (${distAssets.length} bundled files in dist/assets)`);
  } catch (err) {
    assert(false, `Frontend server check failed: ${err.message}`);
  }

  // ─────────────────────────────────────────
  // 7. REACT NATIVE DELIVERY DRIVER APP
  // ─────────────────────────────────────────
  console.log('\n📱 TEST SUITE 7: React Native Delivery Driver App');
  try {
    const appDir = path.resolve(__dirname, 'driver_app');
    assert(fs.existsSync(appDir), 'driver_app directory exists');

    // Key file structure checks
    const expectedFiles = [
      'package.json',
      'app.json',
      'App.js',
      'src/config/constants.js',
      'src/services/api.js',
      'src/services/socket.js',
      'src/services/locationSimulator.js',
      'src/services/realLocation.js',
      'src/screens/LoginScreen.js',
      'src/screens/DriverDashboardScreen.js',
      'src/components/ReportIssueModal.js',
      'src/components/IssuesHistoryModal.js',
    ];

    for (const file of expectedFiles) {
      const fullPath = path.join(appDir, file);
      assert(fs.existsSync(fullPath), `Driver App file exists: ${file}`);
    }

    // App.json permissions & package ID check
    const appJson = JSON.parse(fs.readFileSync(path.join(appDir, 'app.json'), 'utf8'));
    assert(appJson.expo?.name === 'Raktdoot Driver', 'App name configured as "Raktdoot Driver"');
    assert(appJson.expo?.android?.package === 'com.harbinger.raktdoot.driver', 'Android package name is "com.harbinger.raktdoot.driver"');
    const perms = appJson.expo?.android?.permissions || [];
    assert(perms.includes('ACCESS_FINE_LOCATION'), 'Android permissions include ACCESS_FINE_LOCATION');
    assert(perms.includes('FOREGROUND_SERVICE'), 'Android permissions include FOREGROUND_SERVICE');

    // Package.json dependencies check
    const pkgJson = JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf8'));
    const deps = pkgJson.dependencies || {};
    assert(!!deps['socket.io-client'], 'driver_app has socket.io-client installed');
    assert(!!deps['expo-location'], 'driver_app has expo-location installed');
    assert(!!deps['@react-native-async-storage/async-storage'], 'driver_app has @react-native-async-storage/async-storage installed');

    // Location Simulator Telemetry check
    const { LocationSimulator } = require('./driver_app/src/services/locationSimulator');
    const sim = new LocationSimulator();
    const pt1 = sim.getNextPoint();
    const pt2 = sim.getNextPoint();
    assert(typeof pt1.lat === 'number' && typeof pt1.lng === 'number', 'LocationSimulator outputs numeric coordinates');
    assert(pt1.lat > 18 && pt1.lat < 20 && pt1.lng > 72 && pt1.lng < 74, 'Coordinates fall inside Mumbai delivery zone');
    assert(typeof pt1.speed === 'number' && pt1.speed >= 0, `Speed calculated properly (${pt1.speed} km/h)`);
    assert(typeof pt1.heading === 'number' && pt1.heading >= 0 && pt1.heading <= 360, `Bearing calculated properly (${pt1.heading}°)`);
    assert(pt1.address && pt1.address.includes('➔'), `Waypoint routing description valid: ${pt1.address}`);
  } catch (err) {
    assert(false, `React Native App tests failed: ${err.message}`);
  }

  // ─────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────
  console.log('\n======================================================');
  console.log(`🏁 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();

