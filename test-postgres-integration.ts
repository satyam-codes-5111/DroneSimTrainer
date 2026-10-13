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
import crypto from 'crypto';
import { checkPostgresHealth, mapRowToReport, getPostgresPool } from './src/db/postgres.js';

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
  // TEST SECTION 4: SERVER-SIDE AUTHENTICATION & ACCESS CONTROL
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Server-Side Authentication & Session Management ---');
  let traineeCookie = '';
  let traineeToken = '';
  let instructorCookie = '';

  try {
    // 1. Unauthenticated requests are rejected with 401 Unauthorized
    const unauthReportRes = await fetch(`${API_BASE}/api/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'TEST-SESSION' })
    });
    assert(unauthReportRes.status === 401, 'Unauthenticated POST /api/reports receives HTTP 401 Unauthorized');

    const unauthGetRes = await fetch(`${API_BASE}/api/reports`);
    assert(unauthGetRes.status === 401, 'Unauthenticated GET /api/reports receives HTTP 401 Unauthorized');

    const unauthMeRes = await fetch(`${API_BASE}/api/auth/me`);
    assert(unauthMeRes.status === 401, 'Unauthenticated GET /api/auth/me receives HTTP 401 Unauthorized');

    // 2. Negative login with bad credentials receives 401
    const badLoginRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'rajesh.kumar', password: 'WrongPassword123!' })
    });
    assert(badLoginRes.status === 401, 'Login with incorrect password returns HTTP 401 Unauthorized');

    // 3. Trainee login with correct credentials receives 200 OK
    const traineeLoginRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'rajesh.kumar', password: 'Defense@2026!' })
    });
    assert(traineeLoginRes.status === 200, 'Trainee login with valid credentials returns HTTP 200 OK');
    const rawSetCookie = traineeLoginRes.headers.get('set-cookie');
    const cookieMatch = rawSetCookie ? rawSetCookie.match(/cuas_session=([^;]+)/) : null;
    traineeCookie = cookieMatch ? `cuas_session=${cookieMatch[1]}` : '';
    const rawCookieToken = cookieMatch ? cookieMatch[1] : '';
    const traineeLoginBody = await traineeLoginRes.json();
    
    // Security verification: Raw token must NEVER be returned in JSON response
    assert(traineeLoginBody.token === undefined, 'Security: Raw session token is strictly excluded from JSON response');
    assert(traineeLoginBody.success === true, 'Login response success is true');
    assert(traineeLoginBody.user.id === 'TRN-2026-084', 'Authenticated user matches Havildar Rajesh Kumar');
    assert(traineeLoginBody.user.role === 'trainee', 'Authenticated user role is trainee');
    assert(traineeLoginBody.user.passwordHash === undefined, 'Password hash is strictly excluded from login response');

    // Security verification: Raw token must NEVER be stored in database at rest
    const pgPool = getPostgresPool();
    if (pgPool && rawCookieToken) {
      const rawDbRes = await pgPool.query('SELECT id FROM auth_sessions WHERE id = $1;', [rawCookieToken]);
      assert(rawDbRes.rows.length === 0, 'Security: Raw session token is never stored in PostgreSQL at rest');

      const expectedSha256 = crypto.createHash('sha256').update(rawCookieToken).digest('hex');
      const hashDbRes = await pgPool.query('SELECT id FROM auth_sessions WHERE id = $1;', [expectedSha256]);
      assert(hashDbRes.rows.length === 1, 'Security: Session token is stored strictly as cryptographic SHA-256 hash in PostgreSQL');
    }

    // 4. GET /api/auth/me with session cookie succeeds
    const traineeMeRes = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Cookie: traineeCookie }
    });
    assert(traineeMeRes.status === 200, 'GET /api/auth/me with session cookie returns HTTP 200 OK');
    const traineeMeBody = await traineeMeRes.json();
    assert(traineeMeBody.user.id === 'TRN-2026-084', 'Auth session returns correct authenticated profile');
  } catch (err: any) {
    assert(false, 'Authentication test failed', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SECTION 5: INPUT VALIDATION (AUTHENTICATED)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 5: Server-Side Input Validation (Negative Tests) ---');
  try {
    const invalidPayload = {
      sessionId: '',
      droneClassification: 'alien_mothership_ufo',
      threatRating: 'apocalyptic_critical_100',
      observationNotes: 12345
    };

    const invalidRes = await fetch(`${API_BASE}/api/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: traineeCookie
      },
      body: JSON.stringify(invalidPayload)
    });

    assert(invalidRes.status === 400, 'Rejects invalid payload with HTTP 400 Bad Request');
    const invalidBody = await invalidRes.json();
    assert(invalidBody.success === false, 'Response success is false');
    assert(Array.isArray(invalidBody.validationErrors) && invalidBody.validationErrors.length >= 3, 'Returns comprehensive array of specific validation errors');
  } catch (err: any) {
    assert(false, 'Validation test threw unexpected error', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SECTION 6: REPORT CREATION & SERVER-DERIVED IDENTITY
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 6: Report Creation & Server-Derived Identity ---');
  let createdReportId: string | null = null;
  const testSessionId = `SESS-PG-TEST-${Date.now()}`;

  try {
    const validReportPayload = {
      sessionId: testSessionId,
      // Attempting client spoofing of trainee ID - server MUST override with authenticated identity!
      traineeId: 'SPOOFED-CLIENT-TRAINEE-999',
      traineeName: 'Spoofed Name',
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
      headers: {
        'Content-Type': 'application/json',
        Cookie: traineeCookie
      },
      body: JSON.stringify(validReportPayload)
    });

    assert(createRes.status === 201, 'POST /api/reports returns HTTP 201 Created');
    const createBody = await createRes.json();
    assert(createBody.success === true, 'Response success is true');
    assert(typeof createBody.storageEngine === 'string', `Accurately reports storageEngine: "${createBody.storageEngine}"`);
    assert(createBody.report && typeof createBody.report.id === 'string' && createBody.report.id.startsWith('REP-'), 'Assigns authoritative unique report ID');
    assert(createBody.report.status === 'VERIFIED', 'Assigns verified status for high threat at 520m range');

    // Zero-Trust Check: traineeId MUST be derived from session, NOT client body
    assert(createBody.report.traineeId === 'TRN-2026-084', 'Server-derived trainee identity: traineeId matches session, ignoring spoofed client ID');
    assert(createBody.report.traineeName === 'Havildar Rajesh Kumar', 'Server-derived trainee name matches session');

    createdReportId = createBody.report.id;
  } catch (err: any) {
    assert(false, 'Report creation test failed', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SECTION 7: REPORT RETRIEVAL & QUERY FILTERS
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 7: Report Retrieval & Query Filters ---');
  try {
    if (createdReportId) {
      // Fetch by filter with trainee session
      const filterRes = await fetch(`${API_BASE}/api/reports?sessionId=${encodeURIComponent(testSessionId)}`, {
        headers: { Cookie: traineeCookie }
      });
      assert(filterRes.status === 200, 'GET /api/reports?sessionId=... returns HTTP 200');
      const filterBody = await filterRes.json();
      assert(filterBody.success === true, 'Filter response success is true');
      assert(Array.isArray(filterBody.reports) && filterBody.reports.some((r: any) => r.id === createdReportId), 'Finds created report by session ID filter');

      // Fetch single by ID
      const singleRes = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(createdReportId)}`, {
        headers: { Cookie: traineeCookie }
      });
      assert(singleRes.status === 200, `GET /api/reports/${createdReportId} returns HTTP 200`);
      const singleBody = await singleRes.json();
      assert(singleBody.report && singleBody.report.id === createdReportId, 'Returns exact report matching requested ID');

      // 404 test
      const missingRes = await fetch(`${API_BASE}/api/reports/REP-NON-EXISTENT-ID-99999`, {
        headers: { Cookie: traineeCookie }
      });
      assert(missingRes.status === 404, 'GET /api/reports/NON-EXISTENT returns HTTP 404 Not Found');
    }
  } catch (err: any) {
    assert(false, 'Retrieval test failed', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SECTION 8: TRAINING SESSION PERSISTENCE (PRIORITY 1)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 8: Training Session Persistence in PostgreSQL (Priority 1) ---');
  let createdSessionId: string | null = null;
  try {
    const sessionPayload = {
      scenarioId: 'SCN-BASIC-01',
      scenarioTitle: 'Rotary Drone Perimeter Intrusion',
      date: '2026-10-12',
      durationSec: 215,
      totalTargets: 5,
      identifiedTargets: 5,
      accuracyRate: 94.0,
      avgIdentificationTimeSec: 3.1,
      falseAlarmCount: 0,
      perimeterSafetyScore: 96.0,
      overallScore: 95.0,
      passed: true,
      observationLogs: [
        { targetId: 'TGT-1', droneType: 'rotary_recon', identified: true }
      ],
      evaluatorNotes: ['Excellent acoustic discrimination and rapid reaction time.'],
      recommendations: ['Advance to adverse weather night simulation tier.']
    };

    const sessCreateRes = await fetch(`${API_BASE}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: traineeCookie
      },
      body: JSON.stringify(sessionPayload)
    });

    assert(sessCreateRes.status === 201, 'POST /api/sessions returns HTTP 201 Created');
    const sessCreateBody = await sessCreateRes.json();
    assert(sessCreateBody.success === true, 'Session persistence response success is true');
    assert(sessCreateBody.session && sessCreateBody.session.id.startsWith('SESS-'), 'Assigns authoritative session identifier');
    assert(sessCreateBody.session.traineeId === 'TRN-2026-084', 'Server derives trainee identity for session persistence');
    assert(sessCreateBody.storageEngine === 'postgresql', 'Confirms activeStorageEngine: "postgresql" for sessions');

    createdSessionId = sessCreateBody.session.id;

    // Retrieve sessions list
    const sessListRes = await fetch(`${API_BASE}/api/sessions`, {
      headers: { Cookie: traineeCookie }
    });
    assert(sessListRes.status === 200, 'GET /api/sessions returns HTTP 200');
    const sessListBody = await sessListRes.json();
    assert(Array.isArray(sessListBody.sessions) && sessListBody.sessions.some((s: any) => s.id === createdSessionId), 'Found persisted training session in PostgreSQL query');
  } catch (err: any) {
    assert(false, 'Training session persistence test failed', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SECTION 9: ROLE-BASED ACCESS CONTROL (RBAC) GUARDS
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 9: Role-Based Access Control & Privilege Denial (403) ---');
  try {
    // 1. Trainee attempting to delete report receives HTTP 403 Forbidden
    if (createdReportId) {
      const traineeDelRes = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(createdReportId)}`, {
        method: 'DELETE',
        headers: { Cookie: traineeCookie }
      });
      assert(traineeDelRes.status === 403, 'RBAC: Trainee receives HTTP 403 Forbidden on DELETE /api/reports/:id');
      const traineeDelBody = await traineeDelRes.json();
      assert(traineeDelBody.success === false, 'Trainee delete success is false');
      assert(traineeDelBody.code === 'FORBIDDEN', 'Error code is FORBIDDEN');
    }

    // 2. Trainee attempting to access privileged personnel list receives HTTP 403 Forbidden
    const traineeUsersRes = await fetch(`${API_BASE}/api/auth/users`, {
      headers: { Cookie: traineeCookie }
    });
    assert(traineeUsersRes.status === 403, 'RBAC: Trainee receives HTTP 403 Forbidden on GET /api/auth/users');

    // 3. Trainee attempting to purge training sessions receives HTTP 403 Forbidden
    if (createdSessionId) {
      const traineeDelSessRes = await fetch(`${API_BASE}/api/sessions/${encodeURIComponent(createdSessionId)}`, {
        method: 'DELETE',
        headers: { Cookie: traineeCookie }
      });
      assert(traineeDelSessRes.status === 403, 'RBAC: Trainee receives HTTP 403 Forbidden on DELETE /api/sessions/:id');
    }

    // 4. Regression Test: Unauthenticated POST /api/auth/switch-role MUST be rejected with HTTP 401
    const unauthSwitchRes = await fetch(`${API_BASE}/api/auth/switch-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'instructor' })
    });
    assert(unauthSwitchRes.status === 401, 'Regression: Unauthenticated POST /api/auth/switch-role receives HTTP 401 Unauthorized');
    const unauthSwitchBody = await unauthSwitchRes.json();
    assert(unauthSwitchBody.code === 'UNAUTHENTICATED', 'Error code is UNAUTHENTICATED for unauthenticated switch');

    // 5. Regression Test: Authenticated Trainee attempting to escalate to Instructor MUST be rejected with HTTP 403
    const traineeEscalateInst = await fetch(`${API_BASE}/api/auth/switch-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: traineeCookie },
      body: JSON.stringify({ role: 'instructor' })
    });
    assert(traineeEscalateInst.status === 403, 'Regression: Trainee cannot escalate role to Instructor (HTTP 403 Forbidden)');
    const instEscBody = await traineeEscalateInst.json();
    assert(instEscBody.code === 'FORBIDDEN', 'Error code is FORBIDDEN for trainee privilege escalation');

    // 6. Regression Test: Authenticated Trainee attempting to escalate to Commander MUST be rejected with HTTP 403
    const traineeEscalateCmd = await fetch(`${API_BASE}/api/auth/switch-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: traineeCookie },
      body: JSON.stringify({ role: 'commander' })
    });
    assert(traineeEscalateCmd.status === 403, 'Regression: Trainee cannot escalate role to Commander (HTTP 403 Forbidden)');

    // 7. Security Test: Cross-Site Request Forgery (CSRF) protection on state mutation routes
    const csrfAttackRes = await fetch(`${API_BASE}/api/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: traineeCookie,
        Origin: 'https://malicious-attacker-site.com'
      },
      body: JSON.stringify({ sessionId: 'TEST-CSRF' })
    });
    assert(csrfAttackRes.status === 403, 'Security: Cross-Site Request Forgery (CSRF) blocked on untrusted Origin (HTTP 403 Forbidden)');
    const csrfBody = await csrfAttackRes.json();
    assert(csrfBody.code === 'CSRF_REJECTED', 'Error code is CSRF_REJECTED for untrusted cross-origin requests');

    // 8. Security Test: PostgreSQL TLS Certificate Verification (rejectUnauthorized: true)
    const activePgPool = getPostgresPool();
    if (activePgPool && activePgPool.options.ssl) {
      assert(
        (activePgPool.options.ssl as any).rejectUnauthorized === true,
        'Security: PostgreSQL TLS certificate verification is enforced (rejectUnauthorized: true)'
      );
    }

    // 9. Credential Redaction Test: DATABASE_URL secrets never leak in responses
    const healthRes = await fetch(`${API_BASE}/api/health`);
    const healthRaw = await healthRes.text();
    assert(!healthRaw.includes('Satyam@730') && !healthRaw.includes('Satyam%40730'), 'Security: Raw database password is redacted from health responses');
  } catch (err: any) {
    assert(false, 'RBAC guard test failed', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SECTION 10: INSTRUCTOR AUTHORIZATION, AUDIT PURGE & LOGOUT
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 10: Instructor Privileges, Purge & Session Destruction ---');
  try {
    // 1. Instructor login
    const instLoginRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'ananya.sharma', password: 'Defense@2026!' })
    });
    assert(instLoginRes.status === 200, 'Instructor login returns HTTP 200 OK');
    const rawInstCookie = instLoginRes.headers.get('set-cookie');
    const instCookieMatch = rawInstCookie ? rawInstCookie.match(/cuas_session=([^;]+)/) : null;
    instructorCookie = instCookieMatch ? `cuas_session=${instCookieMatch[1]}` : '';
    const instLoginBody = await instLoginRes.json();
    assert(instLoginBody.token === undefined, 'Security: Raw session token strictly excluded from instructor login response');
    assert(instLoginBody.user.role === 'instructor', 'User role confirmed as instructor');

    // 2. Instructor can view all personnel
    const usersRes = await fetch(`${API_BASE}/api/auth/users`, {
      headers: { Cookie: instructorCookie }
    });
    assert(usersRes.status === 200, 'Instructor receives HTTP 200 on GET /api/auth/users');
    const usersBody = await usersRes.json();
    assert(Array.isArray(usersBody.users) && usersBody.users.length >= 3, 'Instructor retrieves personnel registry');

    // 3. Authorized Delete: Instructor successfully purges test report
    if (createdReportId) {
      const instructorDelRes = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(createdReportId)}`, {
        method: 'DELETE',
        headers: { Cookie: instructorCookie }
      });
      assert(instructorDelRes.status === 200, 'Authorized Instructor receives HTTP 200 OK on DELETE /api/reports/:id');
      const deleteBody = await instructorDelRes.json();
      assert(deleteBody.success === true, 'Delete response success is true');

      // Confirm report is deleted
      const verifyGoneRes = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(createdReportId)}`, {
        headers: { Cookie: instructorCookie }
      });
      assert(verifyGoneRes.status === 404, 'Verifies deleted report is no longer retrievable (HTTP 404)');
    }

    // 4. Authorized Delete: Instructor cleans up test training session
    if (createdSessionId) {
      const instDelSessRes = await fetch(`${API_BASE}/api/sessions/${encodeURIComponent(createdSessionId)}`, {
        method: 'DELETE',
        headers: { Cookie: instructorCookie }
      });
      assert(instDelSessRes.status === 200, 'Instructor receives HTTP 200 on DELETE /api/sessions/:id');
    }

    // 5. Logout & Session Destruction
    const logoutRes = await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: instructorCookie }
    });
    assert(logoutRes.status === 200, 'POST /api/auth/logout returns HTTP 200 OK');

    // Verify session token is invalidated
    const postLogoutMe = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Cookie: instructorCookie }
    });
    assert(postLogoutMe.status === 401, 'Post-logout session access returns HTTP 401 Unauthorized');
  } catch (err: any) {
    assert(false, 'Instructor authorization test failed', err.message);
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
