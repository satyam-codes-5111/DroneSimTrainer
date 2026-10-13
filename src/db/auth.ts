/**
 * Authentication & Session Management Module
 * SIH 2026 PS 26247: AI-Enabled Drone & Counter-Drone Threat Simulation Trainer
 *
 * Implements bcrypt password hashing, cryptographic session tokens,
 * HttpOnly cookie session resolution, and administrator bootstrap.
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getPostgresPool, SanitizedUser, DbUser, DbAuthSession } from './postgres.js';

export const SESSION_COOKIE_NAME = 'cuas_session';
export const SESSION_EXPIRATION_HOURS = 24;

/**
 * Hashes a plaintext password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Validates a plaintext password against a stored bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

/**
 * Maps a database row to a sanitized user profile (strictly excludes password_hash).
 */
export function mapRowToSanitizedUser(row: any): SanitizedUser {
  return {
    id: row.id,
    username: row.username,
    email: row.email || undefined,
    name: row.name,
    callsign: row.callsign,
    role: row.role,
    rank: row.rank,
    unit: row.unit,
    serviceId: row.service_id || undefined,
    level: Number(row.level) || 1,
    xp: Number(row.xp) || 0,
    nextLevelXp: Number(row.next_level_xp) || 1000,
    totalMissions: Number(row.total_missions) || 0,
    accuracyRate: Number(row.accuracy_rate) || 0.0,
    avgResponseTimeSec: Number(row.avg_response_time_sec) || 0.0,
    qualificationStatus: row.qualification_status || 'In Training',
    avatarInitials: row.avatar_initials || 'OP',
    status: row.status || 'ACTIVE'
  };
}

/**
 * Maps a database row to an internal user record including password hash.
 */
export function mapRowToDbUser(row: any): DbUser {
  return {
    ...mapRowToSanitizedUser(row),
    passwordHash: row.password_hash,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined
  };
}

/**
 * Retrieves a user by case-insensitive username.
 */
export async function getUserByUsername(username: string): Promise<DbUser | null> {
  const pool = getPostgresPool();
  if (!pool) return null;

  const result = await pool.query(
    'SELECT * FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1;',
    [username.trim()]
  );

  if (result.rows.length === 0) return null;
  return mapRowToDbUser(result.rows[0]);
}

/**
 * Retrieves a user by unique identifier.
 */
export async function getUserById(id: string): Promise<SanitizedUser | null> {
  const pool = getPostgresPool();
  if (!pool) return null;

  const result = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1;', [id]);
  if (result.rows.length === 0) return null;
  return mapRowToSanitizedUser(result.rows[0]);
}

/**
 * Computes a cryptographically secure SHA-256 digest of a session token.
 * Tokens are stored strictly as SHA-256 hashes in PostgreSQL to prevent credential leakage at rest.
 */
export function hashSessionToken(token: string): string {
  if (!token) return '';
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Creates a cryptographically random session token and stores its SHA-256 hash in PostgreSQL.
 * Never stores or leaks the raw token at rest.
 */
export async function createAuthSession(
  userId: string,
  role: 'trainee' | 'instructor' | 'commander',
  ipAddress?: string,
  userAgent?: string
): Promise<{ rawToken: string; expiresAt: Date }> {
  const pool = getPostgresPool();
  if (!pool) {
    throw new Error('Database connection unavailable for session creation.');
  }

  // 64-character cryptographically secure high-entropy token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_EXPIRATION_HOURS * 60 * 60 * 1000);

  const query = `
    INSERT INTO auth_sessions (
      id, user_id, role, ip_address, user_agent, created_at, expires_at
    ) VALUES (
      $1, $2, $3, $4, $5, NOW(), $6
    ) RETURNING id;
  `;

  // Store strictly the SHA-256 hash in PostgreSQL
  await pool.query(query, [tokenHash, userId, role, ipAddress || null, userAgent || null, expiresAt]);
  return { rawToken, expiresAt };
}

/**
 * Validates a session token by SHA-256 hash lookup and returns the session plus sanitized user record.
 */
export async function getAuthSession(
  rawToken: string
): Promise<{ session: DbAuthSession; user: SanitizedUser } | null> {
  const pool = getPostgresPool();
  if (!pool || !rawToken) return null;

  const tokenHash = hashSessionToken(rawToken);

  const query = `
    SELECT 
      s.id as session_id,
      s.user_id,
      s.role as session_role,
      s.ip_address,
      s.user_agent,
      s.created_at as session_created_at,
      s.expires_at,
      u.*
    FROM auth_sessions s
    INNER JOIN users u ON s.user_id = u.id
    WHERE s.id = $1 AND s.expires_at > NOW() AND u.status = 'ACTIVE'
    LIMIT 1;
  `;

  const result = await pool.query(query, [tokenHash]);
  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const user = mapRowToSanitizedUser(row);
  const session: DbAuthSession = {
    id: row.session_id,
    userId: row.user_id,
    role: row.session_role,
    ipAddress: row.ip_address || undefined,
    userAgent: row.user_agent || undefined,
    createdAt: row.session_created_at ? new Date(row.session_created_at).toISOString() : undefined,
    expiresAt: new Date(row.expires_at).toISOString(),
    user
  };

  return { session, user };
}

/**
 * Destroys a session in PostgreSQL by SHA-256 hash (logout).
 */
export async function deleteAuthSession(rawToken: string): Promise<boolean> {
  const pool = getPostgresPool();
  if (!pool || !rawToken) return false;

  const tokenHash = hashSessionToken(rawToken);
  const result = await pool.query('DELETE FROM auth_sessions WHERE id = $1 RETURNING id;', [tokenHash]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Cleans up expired sessions.
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const pool = getPostgresPool();
  if (!pool) return 0;

  const result = await pool.query('DELETE FROM auth_sessions WHERE expires_at <= NOW();');
  return result.rowCount ?? 0;
}

/**
 * Retrieves a user by role for demonstration / persona switching.
 */
export async function getUserByRole(role: 'trainee' | 'instructor' | 'commander'): Promise<SanitizedUser | null> {
  const pool = getPostgresPool();
  if (pool) {
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE role = $1 AND status = \'ACTIVE\' ORDER BY created_at ASC LIMIT 1;',
        [role]
      );
      if (result.rows.length > 0) {
        return mapRowToSanitizedUser(result.rows[0]);
      }
    } catch {
      // Fallback if query fails
    }
  }

  // Fallback defaults if table empty or DB offline
  const fallbackUsers: Record<string, SanitizedUser> = {
    trainee: {
      id: 'TRN-2026-084',
      username: 'rajesh.kumar',
      name: 'Havildar Rajesh Kumar',
      callsign: 'FALCON-04',
      role: 'trainee',
      rank: 'Havildar (AD)',
      unit: '14th Forward Air Defense Battery',
      serviceId: 'AD-884920-K',
      level: 7,
      xp: 3450,
      nextLevelXp: 4000,
      totalMissions: 18,
      accuracyRate: 88.5,
      avgResponseTimeSec: 4.8,
      qualificationStatus: 'In Training',
      avatarInitials: 'RK',
      status: 'ACTIVE'
    },
    instructor: {
      id: 'INS-2026-012',
      username: 'ananya.sharma',
      name: 'Major Ananya Sharma',
      callsign: 'SENTINEL-LEAD',
      role: 'instructor',
      rank: 'Major',
      unit: 'Counter-UAS Training Directorate',
      serviceId: 'UAS-102934-S',
      level: 24,
      xp: 19800,
      nextLevelXp: 22000,
      totalMissions: 142,
      accuracyRate: 97.2,
      avgResponseTimeSec: 2.3,
      qualificationStatus: 'Qualified',
      avatarInitials: 'AS',
      status: 'ACTIVE'
    },
    commander: {
      id: 'CMD-2026-001',
      username: 'vikram.rathore',
      name: 'Colonel Vikram Rathore',
      callsign: 'EAGLE-EYE-1',
      role: 'commander',
      rank: 'Colonel',
      unit: 'Northern Sector Air Defense Brigade',
      serviceId: 'HQ-001928-R',
      level: 30,
      xp: 32000,
      nextLevelXp: 35000,
      totalMissions: 260,
      accuracyRate: 96.0,
      avgResponseTimeSec: 2.1,
      qualificationStatus: 'Qualified',
      avatarInitials: 'VR',
      status: 'ACTIVE'
    }
  };

  return fallbackUsers[role] || null;
}

/**
 * Retrieves all active users (for instructors/commanders).
 */
export async function getAllUsers(): Promise<SanitizedUser[]> {
  const pool = getPostgresPool();
  if (pool) {
    try {
      const result = await pool.query('SELECT * FROM users WHERE status = \'ACTIVE\' ORDER BY created_at ASC;');
      return result.rows.map(mapRowToSanitizedUser);
    } catch {
      // Fallback
    }
  }

  const trainee = await getUserByRole('trainee');
  const instructor = await getUserByRole('instructor');
  const commander = await getUserByRole('commander');
  return [trainee, instructor, commander].filter(Boolean) as SanitizedUser[];
}

/**
 * Safely bootstraps default personnel accounts if the users table is empty.
 * Uses environment configuration without hardcoded credential fallbacks in production.
 * Ensures all accounts receive distinct credentials rather than sharing one password.
 * Passwords are ONLY stored as salted bcrypt hashes.
 */
export async function bootstrapInitialUsers(): Promise<void> {
  const pool = getPostgresPool();
  if (!pool) return;

  const countRes = await pool.query('SELECT count(*) FROM users;');
  const userCount = parseInt(countRes.rows[0]?.count || '0', 10);

  const isProduction = process.env.NODE_ENV === 'production';
  const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;

  // FAIL SAFELY: Production startup MUST fail safely if required bootstrap secret is absent
  if (isProduction && !adminPassword && userCount === 0) {
    throw new Error(
      '[Security Exception] Fatal configuration error: ADMIN_BOOTSTRAP_PASSWORD must be explicitly configured in production environment. Bootstrap aborted to prevent insecure defaults.'
    );
  }

  if (userCount > 0) {
    return;
  }

  // Derive distinct credentials per persona to prevent shared-credential vulnerability
  const traineePass =
    process.env.TRAINEE_BOOTSTRAP_PASSWORD ||
    (adminPassword ? `${adminPassword}_trn` : (!isProduction ? 'Defense@2026!' : null));
  const instructorPass =
    process.env.INSTRUCTOR_BOOTSTRAP_PASSWORD ||
    (adminPassword ? `${adminPassword}_inst` : (!isProduction ? 'Instructor#Sentinel12!' : null));
  const commanderPass =
    process.env.COMMANDER_BOOTSTRAP_PASSWORD ||
    adminPassword ||
    (!isProduction ? 'Commander#EagleEye01!' : null);

  if (!traineePass || !instructorPass || !commanderPass) {
    throw new Error(
      '[Security Exception] Fatal configuration error: Distinct credentials must be configured for all bootstrap personas.'
    );
  }

  const traineeHash = await hashPassword(traineePass);
  const instructorHash = await hashPassword(instructorPass);
  const commanderHash = await hashPassword(commanderPass);

  const initialPersonnel = [
    {
      id: 'TRN-2026-084',
      username: 'rajesh.kumar',
      email: 'rajesh.kumar@airdefense.mil',
      passwordHash: traineeHash,
      name: 'Havildar Rajesh Kumar',
      callsign: 'FALCON-04',
      role: 'trainee',
      rank: 'Havildar (AD)',
      unit: '14th Forward Air Defense Battery',
      serviceId: 'AD-884920-K',
      level: 7,
      xp: 3450,
      nextLevelXp: 4000,
      totalMissions: 18,
      accuracyRate: 88.5,
      avgResponseTimeSec: 4.8,
      qualificationStatus: 'In Training',
      avatarInitials: 'RK'
    },
    {
      id: 'INS-2026-012',
      username: 'ananya.sharma',
      email: 'ananya.sharma@cuas.mil',
      passwordHash: instructorHash,
      name: 'Major Ananya Sharma',
      callsign: 'SENTINEL-LEAD',
      role: 'instructor',
      rank: 'Major',
      unit: 'Counter-UAS Training Directorate',
      serviceId: 'UAS-102934-S',
      level: 24,
      xp: 19800,
      nextLevelXp: 22000,
      totalMissions: 142,
      accuracyRate: 97.2,
      avgResponseTimeSec: 2.3,
      qualificationStatus: 'Qualified',
      avatarInitials: 'AS'
    },
    {
      id: 'CMD-2026-001',
      username: 'vikram.rathore',
      email: 'vikram.rathore@command.mil',
      passwordHash: commanderHash,
      name: 'Colonel Vikram Rathore',
      callsign: 'EAGLE-EYE-1',
      role: 'commander',
      rank: 'Colonel',
      unit: 'Northern Sector Air Defense Brigade',
      serviceId: 'HQ-001928-R',
      level: 30,
      xp: 32000,
      nextLevelXp: 35000,
      totalMissions: 260,
      accuracyRate: 96.0,
      avgResponseTimeSec: 2.1,
      qualificationStatus: 'Qualified',
      avatarInitials: 'VR'
    }
  ];

  for (const u of initialPersonnel) {
    await pool.query(
      `INSERT INTO users (
        id, username, email, password_hash, name, callsign, role, rank, unit,
        service_id, level, xp, next_level_xp, total_missions, accuracy_rate,
        avg_response_time_sec, qualification_status, avatar_initials, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'ACTIVE'
      ) ON CONFLICT (id) DO NOTHING;`,
      [
        u.id,
        u.username,
        u.email,
        u.passwordHash,
        u.name,
        u.callsign,
        u.role,
        u.rank,
        u.unit,
        u.serviceId,
        u.level,
        u.xp,
        u.nextLevelXp,
        u.totalMissions,
        u.accuracyRate,
        u.avgResponseTimeSec,
        u.qualificationStatus,
        u.avatarInitials
      ]
    );
  }

  console.log('[C-UAS Trainer Auth] Bootstrapped 3 initial personnel accounts with bcrypt password hashes.');
}
