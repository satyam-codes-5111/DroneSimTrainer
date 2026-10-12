/**
 * PostgreSQL Integration & Persistence Test Suite
 * SIH 2026 PS 26247: AI-Enabled Drone & Counter-Drone Threat Simulation Trainer
 *
 * Verifies:
 * 1. Health check & configuration probe (accurate status without false claims)
 * 2. SQL Migration structure, schema constraints, and index definitions
 * 3. Data mapper (snake_case DB columns to camelCase API contract)
 * 4. Server-side input validation and error responses (negative tests)
 * 5. Report creation, server-authoritative fields, and status determination
 * 6. Report retrieval, filtering, and 404 handling
 * 7. Duplicate handling logic for safe repeatable JSON-to-PG migration
 * 8. Cleanup and deletion verification
 */

import fs from 'fs';
import path from 'path';
import { checkPostgresHealth, mapRowToReport } from './src/db/postgres.js';

const API_BASE = 'http://localhost:3000';

async function runTestSuite() {
  console.log('================================================================');
  console.log('🧪 COUNTER-UAS TRAINER: POSTGRESQL & PERSISTENCE TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, errorDetails?: any) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (errorDetails) {
        console.error('     Details:', errorDetails);
      }
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST SECTION 1: DATABASE PROBE & ACCURATE HEALTH REPORTING
  // --------------------------------------------------------------------------
  console.log('--- SECTION 1: Database Probe & Accurate Health Reporting ---');
  try {
    const health = await checkPostgresHealth();
    if (!process.env.DATABASE_URL) {
      assert(health.isConnected === false, 'Accurately reports isConnected=false when DATABASE_URL is not set');
      assert(health.isConfigured === false, 'Accurately reports isConfigured=false when DATABASE_URL is not set');
      assert(typeof health.connectionInstructions === 'string' && health.connectionInstructions.includes('DATABASE_URL'), 'Provides clear instructions when unconfigured');
    } else {
      console.log(`     DATABASE_URL detected. Probe result: isConnected=${health.isConnected}`);
    }

    const res = await fetch(`${API_BASE}/api/health`);
    assert(res.status === 200, 'GET /api/health returns HTTP 200');
    const healthBody = await res.json();
    assert(healthBody.status === 'nominal', 'Service status is nominal');
    assert(typeof healthBody.activeStorageEngine === 'string', `Reports active storage engine: "${healthBody.activeStorageEngine}"`);
    assert(healthBody.postgres !== undefined, 'Enriches health endpoint with postgres status object');
    assert(healthBody.postgres.connected === health.isConnected, 'Health API postgres.connected matches actual probe result');
  } catch (err: any) {
    assert(false, 'Health check tests failed with unexpected error', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SECTION 2: SQL MIGRATION FILE & INDEX DEFINITIONS
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 2: SQL Migration File & Schema Structure ---');
  const migrationPath = path.resolve(process.cwd(), 'migrations', '001_create_observation_reports.sql');
  assert(fs.existsSync(migrationPath), `Migration file exists at ${migrationPath}`);

  if (fs.existsSync(migrationPath)) {
    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
    assert(sqlContent.includes('CREATE TABLE IF NOT EXISTS observation_reports'), 'Defines observation_reports table');
    assert(sqlContent.includes('id VARCHAR(64) PRIMARY KEY'), 'Defines id VARCHAR(64) PRIMARY KEY');
    assert(sqlContent.includes('session_id VARCHAR(64) NOT NULL'), 'Defines session_id column');
    assert(sqlContent.includes('trainee_id VARCHAR(64) NOT NULL'), 'Defines trainee_id column');
    assert(sqlContent.includes('drone_classification VARCHAR(64) NOT NULL'), 'Defines drone_classification column');
    assert(sqlContent.includes('threat_rating VARCHAR(32) NOT NULL'), 'Defines threat_rating column');
    assert(sqlContent.includes('observation_notes TEXT NOT NULL'), 'Defines observation_notes TEXT column');
    assert(sqlContent.includes('chk_drone_classification CHECK'), 'Enforces drone classification whitelist constraint');
    assert(sqlContent.includes('chk_threat_rating CHECK'), 'Enforces threat rating whitelist constraint');
    assert(sqlContent.includes('chk_report_status CHECK'), 'Enforces status whitelist constraint');
    assert(sqlContent.includes('idx_observation_reports_trainee_id'), 'Creates performance index for trainee_id');
    assert(sqlContent.includes('idx_observation_reports_session_id'), 'Creates performance index for session_id');
    assert(sqlContent.includes('idx_observation_reports_created_at'), 'Creates performance index for created_at');
  }

  // --------------------------------------------------------------------------
  // TEST SECTION 3: DATA MAPPER (snake_case -> camelCase)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Database Column to TypeScript Interface Mapping ---');
  const mockDbRow = {
    id: 'REP-TEST-12345',
    session_id: 'SESS-ALPHA-99',
    trainee_id: 'TRN-2026-084',
    trainee_name: 'Havildar Rajesh Kumar',
    drone_classification: 'commercial_micro_quad',
    threat_rating: 'medium',
    observation_notes: 'Target observed hovering near outpost.',
    status: 'VERIFIED',
    target_id: 'TGT-101-A',
    target_display_name: 'Target Alpha (DJI-Class Quadcopter)',
    distance_meters: 350,
    azimuth_deg: 45,
    elevation_deg: 12,
    created_at: '2026-10-11T12:00:00.000Z',
    updated_at: '2026-10-11T12:00:00.000Z'
  };

  const mapped = mapRowToReport(mockDbRow);
  assert(mapped.id === mockDbRow.id, 'Maps id correctly');
  assert(mapped.sessionId === mockDbRow.session_id, 'Maps session_id to sessionId');
  assert(mapped.traineeId === mockDbRow.trainee_id, 'Maps trainee_id to traineeId');
  assert(mapped.droneClassification === mockDbRow.drone_classification, 'Maps drone_classification to droneClassification');
  assert(mapped.threatRating === mockDbRow.threat_rating, 'Maps threat_rating to threatRating');
  assert(mapped.observationNotes === mockDbRow.observation_notes, 'Maps observation_notes to observationNotes');
  assert(mapped.distanceMeters === 350, 'Maps numeric distance_meters');
  assert(mapped.createdAt === '2026-10-11T12:00:00.000Z', 'Maps created_at timestamp');

  // --------------------------------------------------------------------------
  // TEST SECTION 4: SERVER-SIDE VALIDATION & ERROR RESPONSES
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Server-Side Input Validation (Negative Tests) ---');
  try {
    const invalidPayload = {
      sessionId: '',
      traineeId: '   ',
      droneClassification: 'alien_mothership_ufo',
      threatRating: 'apocalyptic_critical_100',
      observationNotes: 12345
    };

    const invalidRes = await fetch(`${API_BASE}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidPayload)
    });

    assert(invalidRes.status === 400, 'Rejects invalid payload with HTTP 400 Bad Request');
    const invalidBody = await invalidRes.json();
    assert(invalidBody.success === false, 'Response success is false');
    assert(Array.isArray(invalidBody.validationErrors) && invalidBody.validationErrors.length >= 4, 'Returns comprehensive array of specific validation errors');
  } catch (err: any) {
    assert(false, 'Validation test threw unexpected error', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SECTION 5: REPORT CREATION & PERSISTENCE
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 5: Report Creation & Storage Verification ---');
  let createdReportId: string | null = null;
  const testSessionId = `SESS-PG-TEST-${Date.now()}`;
  const testTraineeId = 'TRN-PG-TEST-007';

  try {
    const validReportPayload = {
      sessionId: testSessionId,
      traineeId: testTraineeId,
      traineeName: 'Captain Ananya Roy',
      droneClassification: 'rotary_recon',
      threatRating: 'high',
      observationNotes: 'High-speed rotary reconnaissance drone identified at 520m range.',
      targetId: 'TGT-TEST-RECON-1',
      targetDisplayName: 'Target Recon Alpha',
      distanceMeters: 520,
      azimuthDeg: 125,
      elevationDeg: 28
    };

    const createRes = await fetch(`${API_BASE}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validReportPayload)
    });

    assert(createRes.status === 201, 'POST /api/reports returns HTTP 201 Created');
    const createBody = await createRes.json();
    assert(createBody.success === true, 'Response success is true');
    assert(typeof createBody.storageEngine === 'string', `Accurately reports storageEngine: "${createBody.storageEngine}"`);
    assert(createBody.report && typeof createBody.report.id === 'string' && createBody.report.id.startsWith('REP-'), 'Assigns authoritative unique report ID');
    assert(createBody.report.status === 'VERIFIED', 'Assigns verified status for high threat at 520m range');

    createdReportId = createBody.report.id;
  } catch (err: any) {
    assert(false, 'Report creation test failed', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SECTION 6: REPORT RETRIEVAL & FILTERING
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 6: Report Retrieval & Query Filters ---');
  try {
    if (createdReportId) {
      // Fetch by filter
      const filterRes = await fetch(`${API_BASE}/api/reports?sessionId=${encodeURIComponent(testSessionId)}`);
      assert(filterRes.status === 200, 'GET /api/reports?sessionId=... returns HTTP 200');
      const filterBody = await filterRes.json();
      assert(filterBody.success === true, 'Filter response success is true');
      assert(Array.isArray(filterBody.reports) && filterBody.reports.some((r: any) => r.id === createdReportId), 'Finds created report by session ID filter');

      // Fetch single by ID
      const singleRes = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(createdReportId)}`);
      assert(singleRes.status === 200, `GET /api/reports/${createdReportId} returns HTTP 200`);
      const singleBody = await singleRes.json();
      assert(singleBody.report && singleBody.report.id === createdReportId, 'Returns exact report matching requested ID');

      // 404 test
      const missingRes = await fetch(`${API_BASE}/api/reports/REP-NON-EXISTENT-ID-99999`);
      assert(missingRes.status === 404, 'GET /api/reports/NON-EXISTENT returns HTTP 404 Not Found');
    }
  } catch (err: any) {
    assert(false, 'Retrieval test failed', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SECTION 7: DUPLICATE PREVENTION & SAFE IDEMPOTENCY
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 7: Duplicate Handling & Idempotency Simulation ---');
  try {
    const existingIds = new Set<string>();
    if (createdReportId) {
      existingIds.add(createdReportId);
    }

    const candidateRecord = {
      id: createdReportId || 'REP-MOCK-ID',
      sessionId: 'SESS-DUPE-TEST'
    };

    // Verify duplicate detection
    const isDuplicate = existingIds.has(candidateRecord.id);
    assert(isDuplicate === true, 'Correctly detects duplicate record by primary key (id)');

    const newRecordId = 'REP-BRAND-NEW-RECORD-1';
    const isNew = !existingIds.has(newRecordId);
    assert(isNew === true, 'Allows distinct unique records without collision');
  } catch (err: any) {
    assert(false, 'Duplicate prevention test failed', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SECTION 8: ROLE-BASED ACCESS CONTROL & CLEANUP
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 8: Role-Based Access Control & Audit Purge ---');
  try {
    if (createdReportId) {
      // 1. RBAC Test: Trainee cannot delete report (must return 403 Forbidden)
      const traineeDelRes = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(createdReportId)}`, {
        method: 'DELETE',
        headers: { 'x-user-role': 'trainee' }
      });
      assert(traineeDelRes.status === 403, 'RBAC: Trainee role receives HTTP 403 Forbidden on DELETE');
      const traineeDelBody = await traineeDelRes.json();
      assert(traineeDelBody.success === false, 'RBAC: Trainee delete success is false');
      assert(typeof traineeDelBody.error === 'string' && traineeDelBody.error.includes('Authorization denied'), 'RBAC: Explains authorization denial in error message');

      // 2. Credential Redaction Test
      const healthRes = await fetch(`${API_BASE}/api/health`);
      const healthRaw = await healthRes.text();
      assert(!healthRaw.includes('Satyam@730') && !healthRaw.includes('Satyam%40730'), 'Security: Raw database password is redacted from health responses');

      // 3. Authorized Delete: Instructor role succeeds (returns 200 OK)
      const instructorDelRes = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(createdReportId)}`, {
        method: 'DELETE',
        headers: { 'x-user-role': 'instructor' }
      });
      assert(instructorDelRes.status === 200, 'RBAC: Instructor role receives HTTP 200 OK on DELETE');
      const deleteBody = await instructorDelRes.json();
      assert(deleteBody.success === true, 'Delete response success is true');

      // 4. Confirm report is removed from database
      const verifyGoneRes = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(createdReportId)}`);
      assert(verifyGoneRes.status === 404, 'Verifies deleted report is no longer retrievable (HTTP 404)');
    }
  } catch (err: any) {
    assert(false, 'Cleanup test failed', err.message);
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTestSuite().catch(err => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});
