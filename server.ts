import 'dotenv/config';
import express, { Request, Response } from 'express';
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
  runPostgresMigrations,
  closePostgresPool,
  DbObservationReport
} from './src/db/postgres.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const REPORTS_FILE = path.resolve(DATA_DIR, 'observation_reports.json');

// Ensure data persistence directory and file exist for fallback and safety backups
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(REPORTS_FILE)) {
  fs.writeFileSync(REPORTS_FILE, JSON.stringify([], null, 2), 'utf-8');
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

  app.use(express.json());

  // Check PostgreSQL status on startup
  const initialPgHealth = await checkPostgresHealth();
  if (initialPgHealth.isConnected) {
    console.log(`[C-UAS Trainer Backend] PostgreSQL connected successfully (${initialPgHealth.databaseName}).`);
    try {
      await runPostgresMigrations();
      console.log('[C-UAS Trainer Backend] PostgreSQL schema migrations verified.');
    } catch (migErr: any) {
      console.log(`[C-UAS Trainer Backend] Migration notice: ${migErr.message}`);
    }
  } else if (initialPgHealth.isConfigured) {
    console.log(`[C-UAS Trainer Backend] Database status: DATABASE_URL configured | Connection probe: ${initialPgHealth.errorCategory || 'PENDING'} | Engine: filesystem_json active`);
  } else {
    console.log('[C-UAS Trainer Backend] DATABASE_URL not configured. Active storage: filesystem_json (/data/observation_reports.json).');
  }

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
  app.get('/api/reports', async (req: Request, res: Response) => {
    try {
      const { traineeId, sessionId, threatRating, status } = req.query;
      const pgHealth = await checkPostgresHealth();

      let reports: any[] = [];
      let storageEngine: 'postgresql' | 'filesystem_json' = 'filesystem_json';

      if (pgHealth.isConnected) {
        storageEngine = 'postgresql';
        reports = await getReportsPg({
          traineeId: typeof traineeId === 'string' ? traineeId : undefined,
          sessionId: typeof sessionId === 'string' ? sessionId : undefined,
          threatRating: typeof threatRating === 'string' ? threatRating : undefined,
          status: typeof status === 'string' ? status : undefined
        });
      } else {
        storageEngine = 'filesystem_json';
        reports = readStoredReports();

        if (traineeId && typeof traineeId === 'string') {
          reports = reports.filter(r => r.traineeId === traineeId);
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
  app.get('/api/reports/:id', async (req: Request, res: Response) => {
    try {
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
  app.post('/api/reports', async (req: Request, res: Response) => {
    try {
      const {
        sessionId,
        traineeId,
        traineeName,
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

      if (!traineeId || typeof traineeId !== 'string' || !traineeId.trim()) {
        validationErrors.push('Missing or invalid authenticated trainee ID.');
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
        traineeId: traineeId.trim(),
        traineeName: traineeName ? String(traineeName).trim() : 'Unknown Operator',
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

      // 3. Role Validation & Storage Resolution
      const requesterRole = (req.headers['x-user-role'] as string) || 'trainee';
      const validRoles = ['trainee', 'instructor', 'commander'];
      if (!validRoles.includes(requesterRole)) {
        return res.status(403).json({
          success: false,
          error: `Forbidden: Invalid user role '${requesterRole}'. Authorized roles: ${validRoles.join(', ')}`
        });
      }

      // Check PostgreSQL status
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

  // API Route: Delete report (audit purge)
  app.delete('/api/reports/:id', async (req: Request, res: Response) => {
    try {
      // Role-Based Access Control: Trainees are prohibited from deleting observation records
      const requesterRole = (req.headers['x-user-role'] as string) || 'trainee';
      if (requesterRole === 'trainee') {
        return res.status(403).json({
          success: false,
          error: 'Authorization denied: Trainees are not permitted to delete or purge observation reports from the chain of custody. Instructor or Commander privileges required.',
          requiredRoles: ['instructor', 'commander'],
          providedRole: requesterRole
        });
      }

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
  });

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
