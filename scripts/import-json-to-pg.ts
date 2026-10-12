/**
 * Safe, Repeatable JSON to PostgreSQL Import Utility
 * SIH 2026 PS 26247: AI-Enabled Drone & Counter-Drone Threat Simulation Trainer
 *
 * Rules:
 * 1. Reads existing reports from /data/observation_reports.json.
 * 2. Creates a backup copy before import.
 * 3. Never deletes the original JSON file.
 * 4. Preserves original report IDs, timestamps, and classifications.
 * 5. Uses ON CONFLICT (id) DO NOTHING to prevent duplicates.
 * 6. Provides full rollback guidance.
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { getPostgresPool, checkPostgresHealth, runPostgresMigrations } from '../src/db/postgres.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const JSON_FILE = path.resolve(DATA_DIR, 'observation_reports.json');

async function importJsonReportsToPostgres() {
  console.log('================================================================');
  console.log('🔄 Counter-UAS Trainer: JSON to PostgreSQL Safe Import Utility');
  console.log('================================================================\n');

  // Step 1: Check source JSON file
  if (!fs.existsSync(JSON_FILE)) {
    console.error(`❌ Source file not found: ${JSON_FILE}`);
    process.exit(1);
  }

  const rawJson = fs.readFileSync(JSON_FILE, 'utf-8');
  let records: any[] = [];
  try {
    records = JSON.parse(rawJson);
    if (!Array.isArray(records)) {
      throw new Error('Data in JSON file is not an array.');
    }
  } catch (err: any) {
    console.error(`❌ Error parsing JSON file: ${err.message}`);
    process.exit(1);
  }

  console.log(`📂 Found source file: ${JSON_FILE}`);
  console.log(`📋 Total records in source JSON: ${records.length}`);

  // Step 2: Create safety backup
  const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.resolve(DATA_DIR, `observation_reports.backup.${backupTimestamp}.json`);
  fs.writeFileSync(backupFile, rawJson, 'utf-8');
  console.log(`💾 Safety backup created: ${backupFile}`);
  console.log(`🔒 Notice: The original file "${JSON_FILE}" will NEVER be deleted.\n`);

  // Step 3: Check PostgreSQL connection
  console.log('🔌 Probing PostgreSQL connection...');
  const health = await checkPostgresHealth();

  if (!health.isConnected) {
    console.error('\n❌ PostgreSQL is not connected.');
    if (!health.isConfigured) {
      console.error('💡 Reason: DATABASE_URL is not set.');
      console.error('👉 Configuration required:');
      console.error('   Export DATABASE_URL="postgresql://user:password@host:port/dbname?sslmode=require"');
      console.error('   or define it in your .env configuration.');
    } else {
      console.error(`💡 Connection probe error: ${health.error}`);
    }
    console.error('\n🛑 Import aborted. No data was modified.');
    process.exit(1);
  }

  console.log(`✅ Connected to PostgreSQL database: "${health.databaseName}"`);
  console.log(`ℹ️  Server version: ${health.serverVersion}\n`);

  // Step 4: Ensure schema migrations are applied
  console.log('🔨 Ensuring database schema and indexes exist...');
  try {
    await runPostgresMigrations();
    console.log('✅ Database schema verified.');
  } catch (err: any) {
    console.error(`❌ Migration execution failed: ${err.message}`);
    process.exit(1);
  }

  // Step 5: Perform safe import with duplicate prevention
  const pool = getPostgresPool()!;
  let insertedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  const insertQuery = `
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
    ON CONFLICT (id) DO NOTHING
    RETURNING id;
  `;

  console.log('\n🚀 Beginning idempotent import batch...');

  for (const report of records) {
    try {
      const createdAt = report.createdAt ? new Date(report.createdAt).toISOString() : new Date().toISOString();
      const status = report.status || 'VERIFIED';

      const values = [
        report.id,
        report.sessionId || 'UNKNOWN_SESSION',
        report.traineeId || 'UNKNOWN_TRAINEE',
        report.traineeName || 'Unknown Operator',
        report.droneClassification || 'commercial_micro_quad',
        report.threatRating || 'medium',
        report.observationNotes || '',
        status,
        report.targetId || null,
        report.targetDisplayName || null,
        typeof report.distanceMeters === 'number' ? report.distanceMeters : null,
        typeof report.azimuthDeg === 'number' ? report.azimuthDeg : null,
        typeof report.elevationDeg === 'number' ? report.elevationDeg : null,
        createdAt,
        createdAt
      ];

      const res = await pool.query(insertQuery, values);
      if (res.rowCount && res.rowCount > 0) {
        insertedCount++;
        console.log(`   + [IMPORTED] ${report.id} (${report.droneClassification} / ${report.threatRating})`);
      } else {
        skippedCount++;
        console.log(`   = [SKIPPED - ALREADY EXISTS] ${report.id}`);
      }
    } catch (err: any) {
      errorCount++;
      console.error(`   ! [ERROR] Failed to import report ${report.id}:`, err.message);
    }
  }

  console.log('\n================================================================');
  console.log('📊 IMPORT SUMMARY:');
  console.log(`   Total JSON records examined: ${records.length}`);
  console.log(`   New records inserted to PG:  ${insertedCount}`);
  console.log(`   Duplicates skipped (safe):   ${skippedCount}`);
  console.log(`   Errors encountered:          ${errorCount}`);
  console.log(`   Source JSON file:            ${JSON_FILE} (PRESERVED)`);
  console.log(`   Backup copy created:         ${backupFile}`);
  console.log('================================================================');

  if (errorCount === 0) {
    console.log('✅ Migration completed successfully with zero errors.');
  } else {
    console.warn('⚠️  Migration completed with some errors. Inspect error logs above.');
  }

  console.log('\n🔙 ROLLBACK INSTRUCTIONS:');
  console.log('If you need to roll back:');
  console.log('1. PostgreSQL records can be purged by running:');
  console.log('   DELETE FROM observation_reports;');
  console.log('2. The original filesystem data remains untouched at:');
  console.log(`   ${JSON_FILE}`);
  console.log('3. Additional immutable backup available at:');
  console.log(`   ${backupFile}\n`);
}

importJsonReportsToPostgres()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal import error:', err);
    process.exit(1);
  });
