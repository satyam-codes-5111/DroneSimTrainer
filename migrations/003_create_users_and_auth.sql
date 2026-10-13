-- ============================================================================
-- SIH 2026 PS 26247: AI-Enabled Drone & Counter-Drone Threat Simulation Trainer
-- Migration 003: Create users and server-managed auth_sessions tables
-- ============================================================================

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL,
  email VARCHAR(128) UNIQUE,
  password_hash VARCHAR(256) NOT NULL,
  name VARCHAR(128) NOT NULL,
  callsign VARCHAR(64) NOT NULL DEFAULT 'OPERATOR',
  role VARCHAR(32) NOT NULL,
  rank VARCHAR(64) NOT NULL DEFAULT 'Soldier',
  unit VARCHAR(128) NOT NULL DEFAULT 'Air Defense Battery',
  service_id VARCHAR(64),
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  next_level_xp INTEGER NOT NULL DEFAULT 1000,
  total_missions INTEGER NOT NULL DEFAULT 0,
  accuracy_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  avg_response_time_sec NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  qualification_status VARCHAR(64) NOT NULL DEFAULT 'In Training',
  avatar_initials VARCHAR(8) NOT NULL DEFAULT 'OP',
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_user_role CHECK (
    role IN ('trainee', 'instructor', 'commander')
  ),
  CONSTRAINT chk_user_status CHECK (
    status IN ('ACTIVE', 'SUSPENDED', 'LOCKED')
  )
);

-- Create auth_sessions table for secure HttpOnly cookie session management
CREATE TABLE IF NOT EXISTS auth_sessions (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL,
  ip_address VARCHAR(64),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);
