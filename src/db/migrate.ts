/**
 * Database Migration CLI Runner
 * SIH 2026 PS 26247: AI-Enabled Drone & Counter-Drone Threat Simulation Trainer
 */

import 'dotenv/config';
import { runPostgresMigrations, checkPostgresHealth } from './postgres.js';

async function main() {
  console.log('🚀 Running PostgreSQL migrations...');
  const health = await checkPostgresHealth();

  if (!health.isConnected) {
    console.error('❌ Cannot run migrations: PostgreSQL is not connected.');
    if (!health.isConfigured) {
      console.error('💡 DATABASE_URL environment variable is not defined.');
    } else {
      console.error(`💡 Connection error: ${health.error}`);
    }
    process.exit(1);
  }

  try {
    const res = await runPostgresMigrations();
    console.log(`✅ ${res.message}`);
    process.exit(0);
  } catch (err: any) {
    console.error(`❌ Migration failed: ${err.message}`);
    process.exit(1);
  }
}

main();
