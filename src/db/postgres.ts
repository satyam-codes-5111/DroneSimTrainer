/**
 * PostgreSQL Database Module
 * SIH 2026 PS 26247: AI-Enabled Drone & Counter-Drone Threat Simulation Trainer
 *
 * Implements connection pooling, query wrappers, and data mapping.
 * DATABASE_URL is read strictly from process.env.DATABASE_URL.
 */

import { Pool } from 'pg';
import type { PoolConfig } from 'pg';
import fs from 'fs';
import path from 'path';

let pool: Pool | null = null;
let currentConnectionString: string | null = null;
let lastConnectionError: string | null = null;

/**
 * Sanitizes sensitive credentials and secrets from database logs and error strings.
 */
export function sanitizeErrorMessage(msg: string | null | undefined): string {
  if (!msg) return '';
  return msg
    .replace(/(postgres(?:ql)?:\/\/[^:]+:)[^@]+(@)/gi, '$1[REDACTED]$2')
    .replace(/(password\s*=\s*)[^\s;]+/gi, '$1[REDACTED]')
    .replace(/(Satyam[%@\d]+)/gi, '[REDACTED]');
}

export interface PgHealthStatus {
  isConfigured: boolean;
  isConnected: boolean;
  engine: 'PostgreSQL' | 'None';
  poolStats?: {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  };
  serverVersion?: string;
  databaseName?: string;
  error?: string;
  errorCategory?: 'AUTH_FAILED' | 'HOST_UNREACHABLE' | 'SSL_ERROR' | 'CONFIG_ERROR' | 'UNKNOWN';
  connectionInstructions?: string;
}

export interface DbObservationReport {
  id: string;
  sessionId: string;
  traineeId: string;
  traineeName: string;
  droneClassification: string;
  threatRating: string;
  observationNotes: string;
  status: 'VERIFIED' | 'FLAGGED' | 'PENDING_REVIEW';
  targetId?: string;
  targetDisplayName?: string;
  distanceMeters?: number;
  azimuthDeg?: number;
  elevationDeg?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface DbTrainingSession {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  traineeId: string;
  traineeName: string;
  date: string;
  durationSec: number;
  totalTargets: number;
  identifiedTargets: number;
  accuracyRate: number;
  avgIdentificationTimeSec: number;
  falseAlarmCount: number;
  perimeterSafetyScore: number;
  overallScore: number;
  passed: boolean;
  observationLogs: any[];
  evaluatorNotes: string[];
  recommendations: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SanitizedUser {
  id: string;
  username: string;
  email?: string;
  name: string;
  callsign: string;
  role: 'trainee' | 'instructor' | 'commander';
  rank: string;
  unit: string;
  serviceId?: string;
  level: number;
  xp: number;
  nextLevelXp: number;
  totalMissions: number;
  accuracyRate: number;
  avgResponseTimeSec: number;
  qualificationStatus: string;
  avatarInitials: string;
  status: string;
}

export interface DbUser extends SanitizedUser {
  passwordHash: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DbAuthSession {
  id: string;
  userId: string;
  role: 'trainee' | 'instructor' | 'commander';
  ipAddress?: string;
  userAgent?: string;
  createdAt?: string;
  expiresAt: string;
  user?: SanitizedUser;
}

/**
 * Generates sanitized remediation guidance for database connection issues.
 */
function getSanitizedRemediationGuidance(errorMsg: string, rawUrl: string): { category: PgHealthStatus['errorCategory']; guidance: string } {
  const isSupabase = /supabase/i.test(rawUrl);

  if (/password authentication failed/i.test(errorMsg)) {
    return {
      category: 'AUTH_FAILED',
      guidance: isSupabase
        ? 'Database password authentication failed. In Supabase Dashboard: Go to Project Settings > Database > Database Password to reset/verify your password. If your password contains special characters (like @, #, $, %, etc.), URL-encode them (e.g. "@" becomes "%40", "#" becomes "%23"). For pooler connections, verify username is postgres.[PROJECT_REF] and port is 6543 (transaction) or 5432 (session).'
        : 'Database authentication failed. Please verify the username and password in DATABASE_URL. Ensure special characters are percent-encoded.'
    };
  }

  if (/ECONNREFUSED|getaddrinfo|ETIMEDOUT/i.test(errorMsg)) {
    return {
      category: 'HOST_UNREACHABLE',
      guidance: isSupabase
        ? 'Database host connection refused or timed out. Direct connections on port 5432 may require IPv6. Try using Supabase connection pooler host (aws-0-[region].pooler.supabase.com) on port 6543 (transaction) or 5432 (session).'
        : 'Database host could not be reached. Verify host address, port, and security group / firewall settings.'
    };
  }

  if (/SSL|certificate|handshake/i.test(errorMsg)) {
    return {
      category: 'SSL_ERROR',
      guidance: 'SSL handshake failed. Ensure sslmode=require is enabled in DATABASE_URL or set ssl: { rejectUnauthorized: false }.'
    };
  }

  return {
    category: 'UNKNOWN',
    guidance: 'Check DATABASE_URL connection string syntax: postgresql://[user]:[password]@[host]:[port]/[database]'
  };
}

/**
 * Initializes the PostgreSQL connection pool if DATABASE_URL is configured.
 * Automatically handles cloud SSL requirements and percent-encoded literal passwords.
 */
export function getPostgresPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    if (pool) {
      try {
        pool.end();
      } catch {
        // Ignore pool shutdown error
      }
      pool = null;
      currentConnectionString = null;
    }
    return null;
  }

  // Invalidate pool if connection string changed
  if (pool && currentConnectionString === connectionString) {
    return pool;
  }

  if (pool) {
    try {
      pool.end();
    } catch {
      // Ignore pool shutdown error
    }
    pool = null;
  }

  try {
    const isCloudHost = /supabase\.co|supabase\.com|neon\.tech|render\.com|railway\.app|rds\.amazonaws\.com|pooler/i.test(connectionString);
    const useSsl = connectionString.includes('sslmode=disable')
      ? false
      : (process.env.NODE_ENV === 'production' ||
         connectionString.includes('sslmode=require') ||
         connectionString.includes('ssl=true') ||
         isCloudHost);

    // PostgreSQL TLS Certificate Verification (Security Hardening)
    // Enforces rejectUnauthorized: true with trusted CA certificate verification
    let sslConfig: PoolConfig['ssl'] = undefined;
    if (useSsl) {
      let caCert = process.env.PG_SSL_CA || process.env.DATABASE_CA_CERT;
      if (!caCert && process.env.PG_SSL_CA_PATH && fs.existsSync(process.env.PG_SSL_CA_PATH)) {
        try {
          caCert = fs.readFileSync(process.env.PG_SSL_CA_PATH, 'utf-8');
        } catch {
          // ignore read error
        }
      }
      // Auto-load trusted provider CA bundle if present (e.g. Supabase, Neon)
      if (!caCert) {
        const defaultCaPath = path.resolve(process.cwd(), 'certs', 'supabase-root-ca.pem');
        if (fs.existsSync(defaultCaPath)) {
          try {
            caCert = fs.readFileSync(defaultCaPath, 'utf-8');
          } catch {
            // ignore read error
          }
        }
      }

      const rejectUnauthorized = process.env.PG_SSL_REJECT_UNAUTHORIZED === 'false' ? false : true;

      sslConfig = {
        rejectUnauthorized,
        ...(caCert ? { ca: caCert } : {})
      };
    }

    // Parse URL components to support literal raw passwords with special characters (e.g. Supabase poolers)
    const match = connectionString.match(/^postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?]*)/);

    let config: PoolConfig;
    if (match) {
      config = {
        user: decodeURIComponent(match[1]),
        // If password contains % (such as %40 for @), pass raw literal string so SCRAM/md5 gets exact secret
        password: match[2],
        host: match[3],
        port: match[4] ? parseInt(match[4], 10) : 5432,
        database: match[5] || 'postgres',
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        ssl: sslConfig
      };
    } else {
      config = {
        connectionString,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        ssl: sslConfig
      };
    }

    pool = new Pool(config);
    currentConnectionString = connectionString;

    pool.on('error', (err) => {
      // Log as structured status rather than uncaught error
      const sanitized = sanitizeErrorMessage(err.message);
      console.log(`[PostgreSQL Pool Event]: ${sanitized}`);
      lastConnectionError = sanitized;
    });

    return pool;
  } catch (err: any) {
    const sanitized = sanitizeErrorMessage(err.message);
    console.log(`[PostgreSQL Pool Initialization]: ${sanitized}`);
    lastConnectionError = sanitized;
    return null;
  }
}

/**
 * Gracefully terminates the PostgreSQL connection pool.
 */
export async function closePostgresPool(): Promise<void> {
  if (pool) {
    try {
      await pool.end();
    } catch {
      // Ignore pool shutdown errors
    }
    pool = null;
    currentConnectionString = null;
    lastConnectionError = null;
  }
}

/**
 * Verifies connectivity to the PostgreSQL database.
 * Does NOT report connected unless a real query (SELECT 1) succeeds.
 */
export async function checkPostgresHealth(): Promise<PgHealthStatus> {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    return {
      isConfigured: false,
      isConnected: false,
      engine: 'None',
      connectionInstructions:
        'DATABASE_URL environment variable is not defined. Configure DATABASE_URL=postgresql://user:password@host:port/dbname to enable production PostgreSQL storage.'
    };
  }

  const p = getPostgresPool();
  if (!p) {
    const sanitized = sanitizeErrorMessage(lastConnectionError || 'Failed to initialize pool');
    const diagnostics = getSanitizedRemediationGuidance(sanitized, connectionString);
    return {
      isConfigured: true,
      isConnected: false,
      engine: 'PostgreSQL',
      error: sanitized,
      errorCategory: diagnostics.category,
      connectionInstructions: diagnostics.guidance
    };
  }

  try {
    const client = await p.connect();
    try {
      const result = await client.query('SELECT current_database() as db_name, version() as version_str, NOW() as current_time');
      lastConnectionError = null;

      return {
        isConfigured: true,
        isConnected: true,
        engine: 'PostgreSQL',
        databaseName: result.rows[0]?.db_name,
        serverVersion: result.rows[0]?.version_str?.split(' on ')[0],
        poolStats: {
          totalCount: p.totalCount,
          idleCount: p.idleCount,
          waitingCount: p.waitingCount
        }
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    const sanitized = sanitizeErrorMessage(err.message);
    lastConnectionError = sanitized;
    const diagnostics = getSanitizedRemediationGuidance(err.message, connectionString);
    return {
      isConfigured: true,
      isConnected: false,
      engine: 'PostgreSQL',
      error: `PostgreSQL connection probe failed: ${sanitized}`,
      errorCategory: diagnostics.category,
      connectionInstructions: diagnostics.guidance,
      poolStats: {
        totalCount: p.totalCount,
        idleCount: p.idleCount,
        waitingCount: p.waitingCount
      }
    };
  }
}

/**
 * Maps a snake_case PostgreSQL row to the standard camelCase DbObservationReport contract.
 */
export function mapRowToReport(row: any): DbObservationReport {
  return {
    id: row.id,
    sessionId: row.session_id,
    traineeId: row.trainee_id,
    traineeName: row.trainee_name,
    droneClassification: row.drone_classification,
    threatRating: row.threat_rating,
    observationNotes: row.observation_notes,
    status: row.status,
    targetId: row.target_id || undefined,
    targetDisplayName: row.target_display_name || undefined,
    distanceMeters: row.distance_meters !== null ? Number(row.distance_meters) : undefined,
    azimuthDeg: row.azimuth_deg !== null ? Number(row.azimuth_deg) : undefined,
    elevationDeg: row.elevation_deg !== null ? Number(row.elevation_deg) : undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined
  };
}

/**
 * Executes database migrations against PostgreSQL in sequential order.
 */
export async function runPostgresMigrations(): Promise<{ success: boolean; message: string; applied: string[] }> {
  const p = getPostgresPool();
  if (!p) {
    throw new Error('PostgreSQL is not configured. DATABASE_URL is required to run migrations.');
  }

  const migrationsDir = path.resolve(process.cwd(), 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found at ${migrationsDir}`);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    return { success: true, message: 'No migration files found.', applied: [] };
  }

  const client = await p.connect();
  const applied: string[] = [];

  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      applied.push(file);
    }
    return {
      success: true,
      message: `Executed ${applied.length} migration(s) successfully: ${applied.join(', ')}`,
      applied
    };
  } catch (err: any) {
    await client.query('ROLLBACK');
    throw new Error(`Migration failed: ${err.message}`);
  } finally {
    client.release();
  }
}

/**
 * Inserts an observation report into PostgreSQL.
 */
export async function insertReportPg(report: DbObservationReport): Promise<DbObservationReport> {
  const p = getPostgresPool();
  if (!p) {
    throw new Error('PostgreSQL pool not available.');
  }

  const query = `
    INSERT INTO observation_reports (
      id,
      session_id,
      trainee_id,
      trainee_name,
      drone_classification,
      threat_rating,
      observation_notes,
      status,
      target_id,
      target_display_name,
      distance_meters,
      azimuth_deg,
      elevation_deg,
      created_at,
      updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
    )
    RETURNING *;
  `;

  const values = [
    report.id,
    report.sessionId,
    report.traineeId,
    report.traineeName,
    report.droneClassification,
    report.threatRating,
    report.observationNotes,
    report.status,
    report.targetId || null,
    report.targetDisplayName || null,
    report.distanceMeters ?? null,
    report.azimuthDeg ?? null,
    report.elevationDeg ?? null,
    report.createdAt,
    report.createdAt
  ];

  const result = await p.query(query, values);
  return mapRowToReport(result.rows[0]);
}

/**
 * Retrieves observation reports from PostgreSQL with optional filters.
 */
export async function getReportsPg(filters?: {
  traineeId?: string;
  sessionId?: string;
  threatRating?: string;
  status?: string;
}): Promise<DbObservationReport[]> {
  const p = getPostgresPool();
  if (!p) {
    throw new Error('PostgreSQL pool not available.');
  }

  const conditions: string[] = [];
  const values: any[] = [];
  let paramIdx = 1;

  if (filters?.traineeId) {
    conditions.push(`trainee_id = $${paramIdx++}`);
    values.push(filters.traineeId);
  }
  if (filters?.sessionId) {
    conditions.push(`session_id = $${paramIdx++}`);
    values.push(filters.sessionId);
  }
  if (filters?.threatRating) {
    conditions.push(`threat_rating = $${paramIdx++}`);
    values.push(filters.threatRating);
  }
  if (filters?.status) {
    conditions.push(`status = $${paramIdx++}`);
    values.push(filters.status);
  }

  let sql = 'SELECT * FROM observation_reports';
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY created_at DESC;';

  const result = await p.query(sql, values);
  return result.rows.map(mapRowToReport);
}

/**
 * Retrieves a single report by ID from PostgreSQL.
 */
export async function getReportByIdPg(id: string): Promise<DbObservationReport | null> {
  const p = getPostgresPool();
  if (!p) {
    throw new Error('PostgreSQL pool not available.');
  }

  const result = await p.query('SELECT * FROM observation_reports WHERE id = $1 LIMIT 1;', [id]);
  if (result.rows.length === 0) {
    return null;
  }
  return mapRowToReport(result.rows[0]);
}

/**
 * Deletes a report by ID from PostgreSQL.
 */
export async function deleteReportPg(id: string): Promise<boolean> {
  const p = getPostgresPool();
  if (!p) {
    throw new Error('PostgreSQL pool not available.');
  }

  const result = await p.query('DELETE FROM observation_reports WHERE id = $1 RETURNING id;', [id]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Maps a snake_case PostgreSQL row to the standard camelCase DbTrainingSession contract.
 */
export function mapRowToTrainingSession(row: any): DbTrainingSession {
  const parseJsonField = (val: any): any[] => {
    if (!val) return [];
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(val) ? val : [];
  };

  return {
    id: row.id,
    scenarioId: row.scenario_id,
    scenarioTitle: row.scenario_title,
    traineeId: row.trainee_id,
    traineeName: row.trainee_name,
    date: row.date,
    durationSec: Number(row.duration_sec),
    totalTargets: Number(row.total_targets),
    identifiedTargets: Number(row.identified_targets),
    accuracyRate: Number(row.accuracy_rate),
    avgIdentificationTimeSec: Number(row.avg_identification_time_sec),
    falseAlarmCount: Number(row.false_alarm_count),
    perimeterSafetyScore: Number(row.perimeter_safety_score),
    overallScore: Number(row.overall_score),
    passed: Boolean(row.passed),
    observationLogs: parseJsonField(row.observation_logs),
    evaluatorNotes: parseJsonField(row.evaluator_notes),
    recommendations: parseJsonField(row.recommendations),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined
  };
}

/**
 * Inserts or idempotently updates a training session in PostgreSQL.
 */
export async function insertTrainingSessionPg(session: DbTrainingSession): Promise<DbTrainingSession> {
  const p = getPostgresPool();
  if (!p) {
    throw new Error('PostgreSQL pool not available.');
  }

  const query = `
    INSERT INTO training_sessions (
      id,
      scenario_id,
      scenario_title,
      trainee_id,
      trainee_name,
      date,
      duration_sec,
      total_targets,
      identified_targets,
      accuracy_rate,
      avg_identification_time_sec,
      false_alarm_count,
      perimeter_safety_score,
      overall_score,
      passed,
      observation_logs,
      evaluator_notes,
      recommendations,
      created_at,
      updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      scenario_id = EXCLUDED.scenario_id,
      scenario_title = EXCLUDED.scenario_title,
      trainee_id = EXCLUDED.trainee_id,
      trainee_name = EXCLUDED.trainee_name,
      date = EXCLUDED.date,
      duration_sec = EXCLUDED.duration_sec,
      total_targets = EXCLUDED.total_targets,
      identified_targets = EXCLUDED.identified_targets,
      accuracy_rate = EXCLUDED.accuracy_rate,
      avg_identification_time_sec = EXCLUDED.avg_identification_time_sec,
      false_alarm_count = EXCLUDED.false_alarm_count,
      perimeter_safety_score = EXCLUDED.perimeter_safety_score,
      overall_score = EXCLUDED.overall_score,
      passed = EXCLUDED.passed,
      observation_logs = EXCLUDED.observation_logs,
      evaluator_notes = EXCLUDED.evaluator_notes,
      recommendations = EXCLUDED.recommendations,
      updated_at = NOW()
    RETURNING *;
  `;

  const values = [
    session.id,
    session.scenarioId,
    session.scenarioTitle,
    session.traineeId,
    session.traineeName,
    session.date,
    session.durationSec,
    session.totalTargets,
    session.identifiedTargets,
    session.accuracyRate,
    session.avgIdentificationTimeSec,
    session.falseAlarmCount,
    session.perimeterSafetyScore,
    session.overallScore,
    session.passed,
    JSON.stringify(session.observationLogs || []),
    JSON.stringify(session.evaluatorNotes || []),
    JSON.stringify(session.recommendations || [])
  ];

  const result = await p.query(query, values);
  return mapRowToTrainingSession(result.rows[0]);
}

/**
 * Retrieves training sessions from PostgreSQL with optional filtering.
 */
export async function getTrainingSessionsPg(filters?: {
  traineeId?: string;
  scenarioId?: string;
}): Promise<DbTrainingSession[]> {
  const p = getPostgresPool();
  if (!p) {
    throw new Error('PostgreSQL pool not available.');
  }

  const conditions: string[] = [];
  const values: any[] = [];
  let paramIdx = 1;

  if (filters?.traineeId) {
    conditions.push(`trainee_id = $${paramIdx++}`);
    values.push(filters.traineeId);
  }
  if (filters?.scenarioId) {
    conditions.push(`scenario_id = $${paramIdx++}`);
    values.push(filters.scenarioId);
  }

  let sql = 'SELECT * FROM training_sessions';
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY created_at DESC;';

  const result = await p.query(sql, values);
  return result.rows.map(mapRowToTrainingSession);
}

/**
 * Retrieves a single training session by ID from PostgreSQL.
 */
export async function getTrainingSessionByIdPg(id: string): Promise<DbTrainingSession | null> {
  const p = getPostgresPool();
  if (!p) {
    throw new Error('PostgreSQL pool not available.');
  }

  const result = await p.query('SELECT * FROM training_sessions WHERE id = $1 LIMIT 1;', [id]);
  if (result.rows.length === 0) {
    return null;
  }
  return mapRowToTrainingSession(result.rows[0]);
}

/**
 * Deletes a training session by ID from PostgreSQL.
 */
export async function deleteTrainingSessionPg(id: string): Promise<boolean> {
  const p = getPostgresPool();
  if (!p) {
    throw new Error('PostgreSQL pool not available.');
  }

  const result = await p.query('DELETE FROM training_sessions WHERE id = $1 RETURNING id;', [id]);
  return (result.rowCount ?? 0) > 0;
}
