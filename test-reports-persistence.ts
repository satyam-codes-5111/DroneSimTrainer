/**
 * Automated Verification Test for Persistent Observation Reports
 * Tests backend REST API endpoints, validation logic, and filesystem database persistence.
 */

import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:3000';
const DATA_FILE = path.resolve(process.cwd(), 'data', 'observation_reports.json');

async function runTests() {
  console.log('=== STARTING OBSERVATION REPORTS PERSISTENCE TESTS ===\n');
  let testsPassed = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      testsPassed++;
    } else {
      console.error(`[FAIL] ${testName}`, details || '');
      process.exitCode = 1;
    }
  }

  try {
    // TEST 1: Health Check
    console.log('--- Test 1: Backend Health Check ---');
    const healthRes = await fetch(`${API_BASE}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'Health endpoint returns 200 OK');
    assert(healthData.status === 'nominal', 'Service status is nominal');
    assert(healthData.persistence === 'filesystem_json_store', 'Persistence is filesystem_json_store');

    // TEST 2: Validation Failure on Invalid Payload
    console.log('\n--- Test 2: Input Validation (Negative Test) ---');
    const invalidRes = await fetch(`${API_BASE}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: '',
        traineeId: '',
        droneClassification: 'unknown_drone_type',
        threatRating: 'extreme_threat',
        observationNotes: 123
      })
    });
    const invalidData = await invalidRes.json();
    assert(invalidRes.status === 400, 'Invalid submission returns 400 Bad Request');
    assert(invalidData.success === false, 'success is false');
    assert(Array.isArray(invalidData.validationErrors) && invalidData.validationErrors.length >= 4, 'Returns comprehensive validation errors array');

    // TEST 3: Create and Persist Valid Observation Report
    console.log('\n--- Test 3: Create & Persist Observation Report ---');
    const testSessionId = `SESSION-${Date.now()}`;
    const testTraineeId = 'TRN-2026-084';
    const testNotes = 'Automated persistence verification: low-altitude quadcopter hovering over northern perimeter.';

    const createRes = await fetch(`${API_BASE}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: testSessionId,
        traineeId: testTraineeId,
        traineeName: 'Havildar Rajesh Kumar',
        droneClassification: 'commercial_micro_quad',
        threatRating: 'medium',
        observationNotes: testNotes,
        targetId: 'TGT-TEST-99',
        targetDisplayName: 'Test Micro-Quad',
        distanceMeters: 380,
        azimuthDeg: 42,
        elevationDeg: 15
      })
    });
    const createData = await createRes.json();
    assert(createRes.status === 201, 'Valid creation returns 201 Created');
    assert(createData.success === true, 'Response indicates success: true');
    assert(createData.report && createData.report.id.startsWith('REP-'), 'Report contains unique ID with REP- prefix');
    assert(createData.report.sessionId === testSessionId, 'Report preserves exact sessionId');
    assert(createData.report.traineeId === testTraineeId, 'Report preserves authenticated traineeId');
    assert(createData.report.droneClassification === 'commercial_micro_quad', 'Report preserves droneClassification');
    assert(createData.report.threatRating === 'medium', 'Report preserves threatRating');
    assert(createData.report.status === 'VERIFIED', 'Report assigned valid status');

    const createdId = createData.report.id;

    // TEST 4: Direct Filesystem Persistence Check
    console.log('\n--- Test 4: Filesystem Database Verification ---');
    assert(fs.existsSync(DATA_FILE), 'Persistent file exists on disk at /data/observation_reports.json');
    const diskContent = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    const diskReport = diskContent.find((r: any) => r.id === createdId);
    assert(diskReport !== undefined, 'Report record physically found in observation_reports.json on disk');
    assert(diskReport.observationNotes === testNotes, 'Disk record notes match submitted content verbatim');

    // TEST 5: Query Individual Report by ID
    console.log('\n--- Test 5: Fetch Report by ID ---');
    const getSingleRes = await fetch(`${API_BASE}/api/reports/${createdId}`);
    const getSingleData = await getSingleRes.json();
    assert(getSingleRes.status === 200, 'GET /api/reports/:id returns 200 OK');
    assert(getSingleData.report.id === createdId, 'Returned report ID matches queried ID');

    // TEST 6: Filtered Query by traineeId
    console.log('\n--- Test 6: Filter Reports by Trainee ---');
    const filterRes = await fetch(`${API_BASE}/api/reports?traineeId=${testTraineeId}`);
    const filterData = await filterRes.json();
    assert(filterRes.status === 200, 'GET /api/reports?traineeId=... returns 200 OK');
    assert(filterData.reports.some((r: any) => r.id === createdId), 'Filtered list includes created report');

    // TEST 7: Cleanup Test Record
    console.log('\n--- Test 7: Delete Test Report & Verify Disk Update ---');
    const delRes = await fetch(`${API_BASE}/api/reports/${createdId}`, { method: 'DELETE' });
    const delData = await delRes.json();
    assert(delRes.status === 200, 'DELETE /api/reports/:id returns 200 OK');
    assert(delData.success === true, 'DELETE response success: true');

    const diskContentAfter = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    assert(!diskContentAfter.some((r: any) => r.id === createdId), 'Report permanently removed from disk storage');

    console.log(`\n=== RESULTS: ${testsPassed}/${totalTests} TESTS PASSED ===`);
  } catch (err) {
    console.error('Test execution failed with exception:', err);
    process.exit(1);
  }
}

runTests();
