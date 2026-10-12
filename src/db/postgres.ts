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
        ssl: useSsl ? { rejectUnauthorized: false } : undefined
      };
    } else {
      config = {
        connectionString,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        ssl: useSsl ? { rejectUnauthorized: false } : undefined
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
 * Executes database migrations against PostgreSQL.
 */
export async function runPostgresMigrations(): Promise<{ success: boolean; message: string }> {
  const p = getPostgresPool();
  if (!p) {
    throw new Error('PostgreSQL is not configured. DATABASE_URL is required to run migrations.');
  }

  const migrationFile = path.resolve(process.cwd(), 'migrations', '001_create_observation_reports.sql');
  if (!fs.existsSync(migrationFile)) {
    throw new Error(`Migration file not found at ${migrationFile}`);
  }

  const sql = fs.readFileSync(migrationFile, 'utf-8');
  const client = await p.connect();

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    return { success: true, message: 'Migration 001_create_observation_reports executed successfully.' };
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
