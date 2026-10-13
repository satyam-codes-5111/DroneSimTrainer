-- ============================================================================
-- SIH 2026 PS 26247: AI-Enabled Drone & Counter-Drone Threat Simulation Trainer
-- Migration 002: Create training_sessions table and performance indexes
-- ============================================================================

-- Create training_sessions table
CREATE TABLE IF NOT EXISTS training_sessions (
  id VARCHAR(64) PRIMARY KEY,
  scenario_id VARCHAR(64) NOT NULL,
  scenario_title VARCHAR(256) NOT NULL,
  trainee_id VARCHAR(64) NOT NULL,
  trainee_name VARCHAR(128) NOT NULL DEFAULT 'Unknown Operator',
  date VARCHAR(64) NOT NULL,
  duration_sec INTEGER NOT NULL,
  total_targets INTEGER NOT NULL DEFAULT 0,
  identified_targets INTEGER NOT NULL DEFAULT 0,
  accuracy_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  avg_identification_time_sec NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  false_alarm_count INTEGER NOT NULL DEFAULT 0,
  perimeter_safety_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  overall_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  passed BOOLEAN NOT NULL DEFAULT false,
  observation_logs JSONB NOT NULL DEFAULT '[]'::jsonb,
  evaluator_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Performance Indexes for Training History, After-Action Review, & Unit Metrics
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_training_sessions_trainee_id 
  ON training_sessions(trainee_id);

CREATE INDEX IF NOT EXISTS idx_training_sessions_scenario_id 
  ON training_sessions(scenario_id);

CREATE INDEX IF NOT EXISTS idx_training_sessions_created_at 
  ON training_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_training_sessions_trainee_created 
  ON training_sessions(trainee_id, created_at DESC);
