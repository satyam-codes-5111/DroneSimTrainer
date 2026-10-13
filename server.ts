import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  checkPostgresHealth,
  getPostgresPool,
  insertReportPg,
  getReportsPg,
  getReportByIdPg,
  deleteReportPg,
  insertTrainingSessionPg,
  getTrainingSessionsPg,
  getTrainingSessionByIdPg,
  deleteTrainingSessionPg,
  runPostgresMigrations,
  closePostgresPool,
  DbObservationReport,
  DbTrainingSession,
  SanitizedUser,
  DbAuthSession
} from './src/db/postgres.js';
import {
  SESSION_COOKIE_NAME,
  createAuthSession,
  getAuthSession,
  deleteAuthSession,
  getUserByUsername,
  getUserById,
  getUserByRole,
  getAllUsers,
  verifyPassword,
  bootstrapInitialUsers,
  cleanupExpiredSessions
} from './src/db/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const REPORTS_FILE = path.resolve(DATA_DIR, 'observation_reports.json');
const SESSIONS_FILE = path.resolve(DATA_DIR, 'training_sessions.json');

// Ensure data persistence directory and file exist for fallback and safety backups
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(REPORTS_FILE)) {
  fs.writeFileSync(REPORTS_FILE, JSON.stringify([], null, 2), 'utf-8');
}

if (!fs.existsSync(SESSIONS_FILE)) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify([], null, 2), 'utf-8');
}

// Helpers for persistent JSON data access
function readStoredReports(): any[] {
  try {
    if (!fs.existsSync(REPORTS_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(REPORTS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading reports database:', err);
    throw new Error('Database read error');
  }
}

function writeStoredReports(reports: any[]): void {
  try {
    // Atomic write pattern: write to tmp file then rename
    const tmpFile = `${REPORTS_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(reports, null, 2), 'utf-8');
    fs.renameSync(tmpFile, REPORTS_FILE);
  } catch (err) {
    console.error('Error writing reports database:', err);
    throw new Error('Database write error: Failed to persist record to storage');
  }
}

function readStoredSessions(): any[] {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) return [];
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading training sessions file:', err);
    return [];
  }
}

function writeStoredSessions(sessions: any[]): void {
  try {
    const tmpFile = `${SESSIONS_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(sessions, null, 2), 'utf-8');
    fs.renameSync(tmpFile, SESSIONS_FILE);
  } catch (err) {
    console.error('Error writing training sessions file:', err);
  }
}

export interface AuthenticatedRequest extends Request {
  user?: SanitizedUser;
  authSession?: DbAuthSession;
  sessionToken?: string;
}

const VALID_DRONE_TYPES = [
  'rotary_recon',
  'fixed_wing_surveillance',
  'commercial_micro_quad',
  'swarm_cluster',
  'friendly_logistics'
];

const VALID_THREAT_LEVELS = [
  'low',
  'medium',
  'high',
  'critical',
  'friendly'
];

async function startServer() {
  const app = express();

  // Trust proxy for secure headers and client IP behind container ingress / Cloud Run
  app.set('trust proxy', 1);

  // Security Headers: Protection against MIME-sniffing, clickjacking, and XSS
  app.use(
    helmet({
      contentSecurityPolicy: false, // Preserves Vite SPA scripts & Three.js 3D WebGL runtime
      crossOriginEmbedderPolicy: false
    })
  );

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // CSRF & Origin Validation: Protects authenticated state-mutating requests
  const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
    const method = req.method.toUpperCase();
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      return next();
    }

    // Only apply CSRF check if request relies on cookie authentication
    const hasCookieAuth = !!req.cookies?.[SESSION_COOKIE_NAME];
    if (!hasCookieAuth) {
      return next();
    }

    const origin = req.headers['origin'] as string | undefined;
    const referer = req.headers['referer'] as string | undefined;

    // In local non-browser test runs without Origin/Referer headers, allow loopback callers
    if (!origin && !referer) {
      const isLoopback =
        req.ip === '127.0.0.1' ||
        req.ip === '::1' ||
        req.ip === '::ffff:127.0.0.1' ||
        !req.ip;
      if (isLoopback || process.env.NODE_ENV !== 'production') {
        return next();
      }
      return res.status(403).json({
        success: false,
        error: 'CSRF validation failed: Missing Origin or Referer header on credentialed mutation request.',
        code: 'CSRF_REJECTED'
      });
    }

    const hostHeader = (req.headers['host'] || '').toLowerCase();
    const appUrlHost = process.env.APP_URL ? new URL(process.env.APP_URL).host.toLowerCase() : null;
    const checkUrl = origin || referer || '';

    try {
      const parsed = new URL(checkUrl);
      const originHost = parsed.host.toLowerCase();

      const isAllowedOrigin =
        originHost === hostHeader ||
        (appUrlHost && originHost === appUrlHost) ||
        originHost === 'localhost:3000' ||
        originHost.endsWith('.run.app');

      if (!isAllowedOrigin) {
        return res.status(403).json({
          success: false,
          error: `Cross-Site Request Forgery guard: Untrusted origin '${originHost}' is denied permission to perform mutations.`,
          code: 'CSRF_REJECTED'
        });
      }
    } catch {
      return res.status(403).json({
        success: false,
        error: 'Malformed Origin or Referer header on mutation request.',
        code: 'CSRF_REJECTED'
      });
    }

    next();
  };

  app.use(csrfProtection);

  // Authentication Middleware: Validates HttpOnly cookie or Bearer session token
  const authenticateSession = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const token =
        req.cookies?.[SESSION_COOKIE_NAME] ||
        (req.headers.authorization?.startsWith('Bearer ')
          ? req.headers.authorization.slice(7).trim()
          : null);

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required. Please authenticate before accessing this operational resource.',
          code: 'UNAUTHENTICATED'
        });
      }

      const sessionData = await getAuthSession(token);
      if (!sessionData) {
        return res.status(401).json({
          success: false,
          error: 'Session expired or invalid. Please re-authenticate.',
          code: 'SESSION_INVALID'
        });
      }

      req.user = sessionData.user;
      req.authSession = sessionData.session;
      req.sessionToken = token;
      next();
    } catch (err: any) {
      console.error('Session authentication error:', err);
      return res.status(500).json({
        success: false,
        error: 'Authentication verification encountered an unexpected error.'
      });
    }
  };

  // Role Authorization Middleware Guard
  const requireRoles = (allowedRoles: Array<'trainee' | 'instructor' | 'commander'>) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required.',
          code: 'UNAUTHENTICATED'
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: `Authorization denied: Role '${req.user.role}' lacks required permissions. Required role(s): ${allowedRoles.join(', ')}.`,
          requiredRoles: allowedRoles,
          providedRole: req.user.role,
          code: 'FORBIDDEN'
        });
      }

      next();
    };
  };

  // Check PostgreSQL status on startup
  const initialPgHealth = await checkPostgresHealth();
  if (initialPgHealth.isConnected) {
    console.log(`[C-UAS Trainer Backend] PostgreSQL connected successfully (${initialPgHealth.databaseName}).`);
    try {
      await runPostgresMigrations();
      console.log('[C-UAS Trainer Backend] PostgreSQL schema migrations verified.');
      await bootstrapInitialUsers();
      console.log('[C-UAS Trainer Backend] Personnel accounts bootstrap verified.');
    } catch (migErr: any) {
      console.log(`[C-UAS Trainer Backend] Migration/Bootstrap notice: ${migErr.message}`);
    }
  } else if (initialPgHealth.isConfigured) {
    console.log(`[C-UAS Trainer Backend] Database status: DATABASE_URL configured | Connection probe: ${initialPgHealth.errorCategory || 'PENDING'} | Engine: filesystem_json active`);
  } else {
    console.log('[C-UAS Trainer Backend] DATABASE_URL not configured. Active storage: filesystem_json (/data/observation_reports.json).');
  }

  // Periodic cleanup of expired auth sessions (every 30 minutes)
  setInterval(() => {
    cleanupExpiredSessions().catch(() => {});
  }, 30 * 60 * 1000);

  // ============================================================================
  // AUTHENTICATION & SESSION API ROUTES
  // ============================================================================

  // API Route: Login with credentials (sets HttpOnly cookie)
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || typeof username !== 'string' || !username.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Username is required.'
        });
      }

      if (!password || typeof password !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Password is required.'
        });
      }

      const user = await getUserByUsername(username.trim());
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid username or password.'
        });
      }

      if (user.status !== 'ACTIVE') {
        return res.status(403).json({
          success: false,
          error: `Account is ${user.status}. Please contact administrator.`
        });
      }

      const passwordValid = await verifyPassword(password, user.passwordHash);
      if (!passwordValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid username or password.'
        });
      }

      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      const { rawToken, expiresAt } = await createAuthSession(user.id, user.role, ip, userAgent);

      // Set secure HttpOnly cookie (raw token is NEVER sent in JSON payload or persisted unhashed)
      res.cookie(SESSION_COOKIE_NAME, rawToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: expiresAt,
        path: '/'
      });

      // Exclude password hash and raw token from response
      const { passwordHash: _, ...sanitizedUser } = user;

      res.json({
        success: true,
        message: 'Authentication successful.',
        user: sanitizedUser
      });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({
        success: false,
        error: `Login failed: ${err.message}`
      });
    }
  });

  // API Route: Logout & Session Invalidation
  app.post('/api/auth/logout', async (req: Request, res: Response) => {
    try {
      const token =
        req.cookies?.[SESSION_COOKIE_NAME] ||
        (req.headers.authorization?.startsWith('Bearer ')
          ? req.headers.authorization.slice(7).trim()
          : null);

      if (token) {
        await deleteAuthSession(token);
      }

      res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });

      res.json({
        success: true,
        message: 'Logged out successfully.'
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: `Logout error: ${err.message}`
      });
    }
  });

  // API Route: Current Authenticated User & Session Check
  app.get('/api/auth/me', authenticateSession, async (req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: true,
      user: req.user,
      role: req.user!.role
    });
  });

  // API Route: Switch Role / Persona for Testing & Prototype Demo Mode
  // Strictly requires authenticated session, permitted only in explicit development mode.
  // Enforces least-privilege role boundaries: ordinary users cannot escalate to instructor/commander.
  app.post(
    '/api/auth/switch-role',
    authenticateSession,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const currentUser = req.user!;

        // 1. Strictly disabled in production environment
        if (process.env.NODE_ENV === 'production') {
          return res.status(403).json({
            success: false,
            error: 'Persona switching is disabled in production environments. Please authenticate using authorized credentials.',
            code: 'FORBIDDEN'
          });
        }

        const { role } = req.body;
        const validRoles = ['trainee', 'instructor', 'commander'];
        if (!role || !validRoles.includes(role)) {
          return res.status(400).json({
            success: false,
            error: `Invalid role specified. Must be one of: ${validRoles.join(', ')}`
          });
        }

        // 2. Prevent unauthorized privilege escalation
        // Trainees are strictly prohibited from escalating to instructor or commander
        if (currentUser.role === 'trainee' && (role === 'instructor' || role === 'commander')) {
          return res.status(403).json({
            success: false,
            error: `Privilege escalation denied: Trainee accounts cannot promote themselves to ${role}.`,
            code: 'FORBIDDEN'
          });
        }

        // Instructors cannot escalate to commander
        if (currentUser.role === 'instructor' && role === 'commander') {
          return res.status(403).json({
            success: false,
            error: 'Privilege escalation denied: Instructor accounts cannot promote themselves to commander.',
            code: 'FORBIDDEN'
          });
        }

        const targetUser = await getUserByRole(role);
        if (!targetUser) {
          return res.status(404).json({
            success: false,
            error: `No active user account found for role '${role}'.`
          });
        }

        const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';

        const { rawToken, expiresAt } = await createAuthSession(targetUser.id, targetUser.role, ip, userAgent);

        res.cookie(SESSION_COOKIE_NAME, rawToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          expires: expiresAt,
          path: '/'
        });

        // Raw token is strictly excluded from JSON response
        res.json({
          success: true,
          message: `Switched active session to ${targetUser.name} (${role}).`,
          user: targetUser
        });
      } catch (err: any) {
        console.error('Role switch error:', err);
        res.status(500).json({
          success: false,
          error: `Role switch failed: ${err.message}`
        });
      }
    }
  );

  // API Route: List All Active Personnel (Instructors & Commanders only)
  app.get(
    '/api/auth/users',
    authenticateSession,
    requireRoles(['instructor', 'commander']),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const users = await getAllUsers();
        res.json({
          success: true,
          count: users.length,
          users
        });
      } catch (err: any) {
        res.status(500).json({
          success: false,
          error: `Failed to fetch users: ${err.message}`
        });
      }
    }
  );

  // API Route: Database Specific Status & Diagnostics
  app.get('/api/database/status', async (req: Request, res: Response) => {
    try {
      const pgHealth = await checkPostgresHealth();
      const localReports = readStoredReports();
      res.json({
        activeStorageEngine: pgHealth.isConnected ? 'postgresql' : 'filesystem_json',
        postgres: pgHealth,
        filesystemStore: {
          path: REPORTS_FILE,
          totalReports: localReports.length,
          available: fs.existsSync(REPORTS_FILE)
        },
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Comprehensive Health & System Status
  app.get('/api/health', async (req: Request, res: Response) => {
    try {
      const pgHealth = await checkPostgresHealth();
      const localReports = readStoredReports();
      
      let totalReports = localReports.length;
      if (pgHealth.isConnected) {
        try {
          const pgReports = await getReportsPg();
          totalReports = pgReports.length;
        } catch {
          // fallback to local report count if query times out
        }
      }

      res.json({
        status: 'nominal',
        service: 'Counter-UAS Observation Backend',
        activeStorageEngine: pgHealth.isConnected ? 'postgresql' : 'filesystem_json',
        storagePath: pgHealth.isConnected ? `PostgreSQL Database [${pgHealth.databaseName}]` : REPORTS_FILE,
        totalPersistedReports: totalReports,
        postgres: {
          configured: pgHealth.isConfigured,
          connected: pgHealth.isConnected,
          engine: pgHealth.engine,
          serverVersion: pgHealth.serverVersion,
          databaseName: pgHealth.databaseName,
          poolStats: pgHealth.poolStats,
          error: pgHealth.error,
          instructions: pgHealth.connectionInstructions
        },
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // API Route: Fetch Persisted Observation Reports (PostgreSQL or Filesystem Store)
  app.get('/api/reports', authenticateSession, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const { traineeId: queryTraineeId, sessionId, threatRating, status } = req.query;
      const pgHealth = await checkPostgresHealth();

      // Enforce trainee isolation: trainees can only query their own reports
      const effectiveTraineeId = user.role === 'trainee'
        ? user.id
        : (typeof queryTraineeId === 'string' ? queryTraineeId : undefined);

      let reports: any[] = [];
      let storageEngine: 'postgresql' | 'filesystem_json' = 'filesystem_json';

      if (pgHealth.isConnected) {
        storageEngine = 'postgresql';
        reports = await getReportsPg({
          traineeId: effectiveTraineeId,
          sessionId: typeof sessionId === 'string' ? sessionId : undefined,
          threatRating: typeof threatRating === 'string' ? threatRating : undefined,
          status: typeof status === 'string' ? status : undefined
        });
      } else {
        storageEngine = 'filesystem_json';
        reports = readStoredReports();

        if (effectiveTraineeId) {
          reports = reports.filter(r => r.traineeId === effectiveTraineeId);
        }
        if (sessionId && typeof sessionId === 'string') {
          reports = reports.filter(r => r.sessionId === sessionId);
        }
        if (threatRating && typeof threatRating === 'string') {
          reports = reports.filter(r => r.threatRating === threatRating);
        }
        if (status && typeof status === 'string') {
          reports = reports.filter(r => r.status === status);
        }

        // Sort newest first
        reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      res.json({
        success: true,
        count: reports.length,
        storageEngine,
        reports
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: `Failed to fetch observation reports: ${err.message}`
      });
    }
  });

  // API Route: Fetch Single Report by ID
  app.get('/api/reports/:id', authenticateSession, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const pgHealth = await checkPostgresHealth();

      let report: any = null;
      let storageEngine: 'postgresql' | 'filesystem_json' = 'filesystem_json';

      if (pgHealth.isConnected) {
        storageEngine = 'postgresql';
        report = await getReportByIdPg(id);
      } else {
        storageEngine = 'filesystem_json';
        const reports = readStoredReports();
        report = reports.find(r => r.id === id) || null;
      }

      if (!report) {
        return res.status(404).json({
          success: false,
          error: `Observation report with ID ${id} was not found.`
        });
      }

      // Authorization guard: Trainees may only inspect reports they authored
      if (user.role === 'trainee' && report.traineeId !== user.id) {
        return res.status(403).json({
          success: false,
          error: 'Authorization denied: Trainees may only view observation reports assigned to their service identity.',
          code: 'FORBIDDEN'
        });
      }

      res.json({
        success: true,
        storageEngine,
        report
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: `Database query failed: ${err.message}`
      });
    }
  });

  // API Route: Create & Persist Observation Report
  app.post('/api/reports', authenticateSession, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const {
        sessionId,
        droneClassification,
        threatRating,
        observationNotes,
        targetId,
        targetDisplayName,
        distanceMeters,
        azimuthDeg,
        elevationDeg
      } = req.body;

      // 1. Rigorous Server-Side Input Validation
      const validationErrors: string[] = [];

      if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
        validationErrors.push('Missing or invalid session ID.');
      }

      if (!droneClassification || !VALID_DRONE_TYPES.includes(droneClassification)) {
        validationErrors.push(
          `Invalid drone classification. Must be one of: ${VALID_DRONE_TYPES.join(', ')}`
        );
      }

      if (!threatRating || !VALID_THREAT_LEVELS.includes(threatRating)) {
        validationErrors.push(
          `Invalid threat assessment rating. Must be one of: ${VALID_THREAT_LEVELS.join(', ')}`
        );
      }

      if (typeof observationNotes !== 'string') {
        validationErrors.push('Observation notes must be a string.');
      } else if (observationNotes.length > 5000) {
        validationErrors.push('Observation notes exceeds maximum allowed length of 5000 characters.');
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Input validation failed: ${validationErrors.join(' ')}`,
          validationErrors
        });
      }

      // 2. Generate Server-Authoritative Fields
      // DERIVE OPERATOR IDENTITY FROM AUTHENTICATED SERVER SESSION (ZERO TRUST CLIENT ID)
      const authoritativeTraineeId = user.id;
      const authoritativeTraineeName = user.name;

      const uniqueReportId = `REP-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const createdAt = new Date().toISOString();

      // Determine initial report status:
      // Critical threat or proximity breach under 300m flags report for immediate review
      let status: 'VERIFIED' | 'FLAGGED' | 'PENDING_REVIEW' = 'PENDING_REVIEW';
      if (threatRating === 'critical' || (typeof distanceMeters === 'number' && distanceMeters < 300)) {
        status = 'FLAGGED';
      } else {
        status = 'VERIFIED';
      }

      const reportPayload: DbObservationReport = {
        id: uniqueReportId,
        sessionId: sessionId.trim(),
        traineeId: authoritativeTraineeId,
        traineeName: authoritativeTraineeName,
        droneClassification,
        threatRating,
        observationNotes: observationNotes.trim(),
        createdAt,
        status,
        targetId: targetId ? String(targetId).trim() : undefined,
        targetDisplayName: targetDisplayName ? String(targetDisplayName).trim() : undefined,
        distanceMeters: typeof distanceMeters === 'number' ? distanceMeters : undefined,
        azimuthDeg: typeof azimuthDeg === 'number' ? azimuthDeg : undefined,
        elevationDeg: typeof elevationDeg === 'number' ? elevationDeg : undefined
      };

      // 3. PostgreSQL Health & Storage Resolution
      const pgHealth = await checkPostgresHealth();

      if (pgHealth.isConfigured) {
        // PREVENT SPLIT-BRAIN: If PostgreSQL is configured as authoritative, reject write if unreachable
        if (!pgHealth.isConnected) {
          return res.status(503).json({
            success: false,
            error: 'Database write rejected: PostgreSQL is configured as the authoritative system of record but is currently unreachable. Write operation aborted to prevent split-brain data inconsistency.',
            errorCategory: 'DB_OFFLINE_SPLIT_BRAIN_GUARD',
            storageEngine: 'postgresql'
          });
        }

        const persistedPgReport = await insertReportPg(reportPayload);

        // Mirror to local JSON store to preserve continuous audit trail across both engines
        try {
          const localReports = readStoredReports();
          if (!localReports.some(r => r.id === persistedPgReport.id)) {
            localReports.unshift(persistedPgReport);
            writeStoredReports(localReports);
          }
        } catch {
          // Non-fatal if local mirror write fails when PG write succeeded
        }

        return res.status(201).json({
          success: true,
          message: 'Observation report successfully persisted to PostgreSQL database.',
          storageEngine: 'postgresql',
          report: persistedPgReport
        });
      } else {
        // Fallback to verified local filesystem JSON store ONLY when DATABASE_URL is not configured
        const existingReports = readStoredReports();
        existingReports.unshift(reportPayload);
        writeStoredReports(existingReports);

        return res.status(201).json({
          success: true,
          message: 'Observation report successfully persisted to local storage (DATABASE_URL is not configured).',
          storageEngine: 'filesystem_json',
          report: reportPayload
        });
      }
    } catch (err: any) {
      console.error('Failed to persist observation report:', err);
      return res.status(500).json({
        success: false,
        error: `Database write failure: ${err.message || 'Unable to write record to persistent storage'}`
      });
    }
  });

  // API Route: Delete report (audit purge - requires Instructor or Commander)
  app.delete(
    '/api/reports/:id',
    authenticateSession,
    requireRoles(['instructor', 'commander']),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { id } = req.params;
        const pgHealth = await checkPostgresHealth();

        // PREVENT SPLIT-BRAIN: If PostgreSQL is configured as authoritative, reject delete if unreachable
        if (pgHealth.isConfigured && !pgHealth.isConnected) {
          return res.status(503).json({
            success: false,
            error: 'Database delete rejected: PostgreSQL is configured as the authoritative system of record but is currently unreachable. Purge aborted to prevent split-brain data inconsistency.',
            errorCategory: 'DB_OFFLINE_SPLIT_BRAIN_GUARD'
          });
        }

        let deletedFromPg = false;
        if (pgHealth.isConnected) {
          deletedFromPg = await deleteReportPg(id);
        }

        // Remove from local JSON backup if present
        let reports = readStoredReports();
        const initialCount = reports.length;
        reports = reports.filter(r => r.id !== id);
        const deletedFromJson = reports.length < initialCount;

        if (deletedFromJson) {
          writeStoredReports(reports);
        }

        if (!deletedFromPg && !deletedFromJson) {
          return res.status(404).json({
            success: false,
            error: `Report with ID ${id} does not exist.`
          });
        }

        res.json({
          success: true,
          message: `Report ${id} deleted successfully.`,
          deletedFrom: {
            postgres: deletedFromPg,
            filesystem: deletedFromJson
          }
        });
      } catch (err: any) {
        res.status(500).json({
          success: false,
          error: `Failed to delete report: ${err.message}`
        });
      }
    }
  );

  // ============================================================================
  // TRAINING SESSION API ROUTES (PERSISTENCE & RETRIEVAL)
  // ============================================================================

  // API Route: Create & Persist Completed Training Session
  app.post('/api/sessions', authenticateSession, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const sessionData = req.body;

      if (!sessionData.scenarioId || typeof sessionData.scenarioId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: scenarioId'
        });
      }

      // Derive trainee identity from authenticated session for trainees
      const traineeId = user.role === 'trainee' ? user.id : (sessionData.traineeId || user.id);
      const traineeName = user.role === 'trainee' ? user.name : (sessionData.traineeName || user.name);

      const uniqueSessionId = sessionData.id && typeof sessionData.id === 'string' && sessionData.id.trim()
        ? sessionData.id.trim()
        : `SESS-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const sessionPayload: DbTrainingSession = {
        id: uniqueSessionId,
        scenarioId: String(sessionData.scenarioId).trim(),
        scenarioTitle: sessionData.scenarioTitle ? String(sessionData.scenarioTitle).trim() : 'Tactical Counter-UAS Mission',
        traineeId,
        traineeName,
        date: sessionData.date || new Date().toISOString().split('T')[0],
        durationSec: Number(sessionData.durationSec) || 0,
        totalTargets: Number(sessionData.totalTargets) || 0,
        identifiedTargets: Number(sessionData.identifiedTargets) || 0,
        accuracyRate: Number(sessionData.accuracyRate) || 0.0,
        avgIdentificationTimeSec: Number(sessionData.avgIdentificationTimeSec) || 0.0,
        falseAlarmCount: Number(sessionData.falseAlarmCount) || 0,
        perimeterSafetyScore: Number(sessionData.perimeterSafetyScore) || 0.0,
        overallScore: Number(sessionData.overallScore) || 0.0,
        passed: Boolean(sessionData.passed),
        observationLogs: Array.isArray(sessionData.observationLogs) ? sessionData.observationLogs : [],
        evaluatorNotes: Array.isArray(sessionData.evaluatorNotes) ? sessionData.evaluatorNotes : [],
        recommendations: Array.isArray(sessionData.recommendations) ? sessionData.recommendations : []
      };

      const pgHealth = await checkPostgresHealth();

      if (pgHealth.isConfigured) {
        if (!pgHealth.isConnected) {
          return res.status(503).json({
            success: false,
            error: 'Session persistence rejected: PostgreSQL is configured as authoritative but is currently unreachable. Operation aborted to prevent split-brain data inconsistency.',
            errorCategory: 'DB_OFFLINE_SPLIT_BRAIN_GUARD',
            storageEngine: 'postgresql'
          });
        }

        const persistedSession = await insertTrainingSessionPg(sessionPayload);

        try {
          const localSessions = readStoredSessions();
          const existingIdx = localSessions.findIndex(s => s.id === persistedSession.id);
          if (existingIdx !== -1) {
            localSessions[existingIdx] = persistedSession;
          } else {
            localSessions.unshift(persistedSession);
          }
          writeStoredSessions(localSessions);
        } catch {
          // Local mirror non-fatal
        }

        return res.status(201).json({
          success: true,
          message: 'Training session successfully persisted to PostgreSQL database.',
          storageEngine: 'postgresql',
          session: persistedSession
        });
      } else {
        const localSessions = readStoredSessions();
        const existingIdx = localSessions.findIndex(s => s.id === sessionPayload.id);
        if (existingIdx !== -1) {
          localSessions[existingIdx] = sessionPayload;
        } else {
          localSessions.unshift(sessionPayload);
        }
        writeStoredSessions(localSessions);

        return res.status(201).json({
          success: true,
          message: 'Training session persisted to local storage (DATABASE_URL not configured).',
          storageEngine: 'filesystem_json',
          session: sessionPayload
        });
      }
    } catch (err: any) {
      console.error('Failed to persist training session:', err);
      res.status(500).json({
        success: false,
        error: `Database write failure: ${err.message}`
      });
    }
  });

  // API Route: Retrieve Training Sessions
  app.get('/api/sessions', authenticateSession, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const { traineeId: queryTraineeId, scenarioId } = req.query;

      // Trainees are restricted to viewing only their own completed sessions
      const filterTraineeId = user.role === 'trainee'
        ? user.id
        : (typeof queryTraineeId === 'string' ? queryTraineeId : undefined);

      const pgHealth = await checkPostgresHealth();

      let sessions: DbTrainingSession[] = [];
      let storageEngine: 'postgresql' | 'filesystem_json' = 'filesystem_json';

      if (pgHealth.isConnected) {
        storageEngine = 'postgresql';
        sessions = await getTrainingSessionsPg({
          traineeId: filterTraineeId,
          scenarioId: typeof scenarioId === 'string' ? scenarioId : undefined
        });
      } else {
        storageEngine = 'filesystem_json';
        sessions = readStoredSessions();
        if (filterTraineeId) {
          sessions = sessions.filter(s => s.traineeId === filterTraineeId);
        }
        if (scenarioId && typeof scenarioId === 'string') {
          sessions = sessions.filter(s => s.scenarioId === scenarioId);
        }
      }

      res.json({
        success: true,
        count: sessions.length,
        storageEngine,
        sessions
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: `Failed to fetch training sessions: ${err.message}`
      });
    }
  });

  // API Route: Retrieve Single Training Session by ID
  app.get('/api/sessions/:id', authenticateSession, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const pgHealth = await checkPostgresHealth();

      let session: DbTrainingSession | null = null;
      let storageEngine: 'postgresql' | 'filesystem_json' = 'filesystem_json';

      if (pgHealth.isConnected) {
        storageEngine = 'postgresql';
        session = await getTrainingSessionByIdPg(id);
      } else {
        storageEngine = 'filesystem_json';
        const sessions = readStoredSessions();
        session = sessions.find(s => s.id === id) || null;
      }

      if (!session) {
        return res.status(404).json({
          success: false,
          error: `Training session with ID ${id} was not found.`
        });
      }

      // Trainees can only inspect their own session details
      if (user.role === 'trainee' && session.traineeId !== user.id) {
        return res.status(403).json({
          success: false,
          error: 'Authorization denied: Trainees may only view their own training sessions.',
          code: 'FORBIDDEN'
        });
      }

      res.json({
        success: true,
        storageEngine,
        session
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: `Database query failed: ${err.message}`
      });
    }
  });

  // API Route: Delete Training Session (Instructors & Commanders only)
  app.delete(
    '/api/sessions/:id',
    authenticateSession,
    requireRoles(['instructor', 'commander']),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { id } = req.params;
        const pgHealth = await checkPostgresHealth();

        if (pgHealth.isConfigured && !pgHealth.isConnected) {
          return res.status(503).json({
            success: false,
            error: 'Session purge rejected: PostgreSQL is offline. Aborted to prevent split-brain inconsistency.',
            errorCategory: 'DB_OFFLINE_SPLIT_BRAIN_GUARD'
          });
        }

        let deletedFromPg = false;
        if (pgHealth.isConnected) {
          deletedFromPg = await deleteTrainingSessionPg(id);
        }

        let sessions = readStoredSessions();
        const initialCount = sessions.length;
        sessions = sessions.filter(s => s.id !== id);
        const deletedFromJson = sessions.length < initialCount;

        if (deletedFromJson) {
          writeStoredSessions(sessions);
        }

        if (!deletedFromPg && !deletedFromJson) {
          return res.status(404).json({
            success: false,
            error: `Session with ID ${id} does not exist.`
          });
        }

        res.json({
          success: true,
          message: `Session ${id} deleted successfully.`,
          deletedFrom: {
            postgres: deletedFromPg,
            filesystem: deletedFromJson
          }
        });
      } catch (err: any) {
        res.status(500).json({
          success: false,
          error: `Failed to delete session: ${err.message}`
        });
      }
    }
  );

  // Setup Vite middlewares for development or static build for production
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist'))) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ success: false, error: `API route not found: ${req.originalUrl}` });
      }
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);

    // Fallback for HTML index and API 404 guard in development
    app.use('*', async (req: Request, res: Response, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api')) {
        return res.status(404).json({ success: false, error: `API route not found: ${url}` });
      }
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        if (fs.existsSync(indexPath)) {
          let template = fs.readFileSync(indexPath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } else {
          next();
        }
      } catch (e) {
        next(e);
      }
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[C-UAS Trainer Backend] Running on http://0.0.0.0:${PORT}`);
  });

  // Graceful shutdown handling for container and process recycling
  const gracefulShutdown = async (signal: string) => {
    console.log(`[C-UAS Trainer Backend] Received ${signal}. Draining connections...`);
    server.close(async () => {
      await closePostgresPool();
      console.log('[C-UAS Trainer Backend] PostgreSQL pool closed cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
