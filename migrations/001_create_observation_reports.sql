-- ============================================================================
-- SIH 2026 PS 26247: AI-Enabled Drone & Counter-Drone Threat Simulation Trainer
-- Migration 001: Create observation_reports table and performance indexes
-- ============================================================================

-- Create observation_reports table
CREATE TABLE IF NOT EXISTS observation_reports (
  id VARCHAR(64) PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  trainee_id VARCHAR(64) NOT NULL,
  trainee_name VARCHAR(128) NOT NULL DEFAULT 'Unknown Operator',
  drone_classification VARCHAR(64) NOT NULL,
  threat_rating VARCHAR(32) NOT NULL,
  observation_notes TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'VERIFIED',
  target_id VARCHAR(64),
  target_display_name VARCHAR(128),
  distance_meters INTEGER,
  azimuth_deg INTEGER,
  elevation_deg INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Enumeration Constraints
  CONSTRAINT chk_drone_classification CHECK (
    drone_classification IN (
      'rotary_recon',
      'fixed_wing_surveillance',
      'commercial_micro_quad',
      'swarm_cluster',
      'friendly_logistics'
    )
  ),
  CONSTRAINT chk_threat_rating CHECK (
    threat_rating IN (
      'low',
      'medium',
      'high',
      'critical',
      'friendly'
    )
  ),
  CONSTRAINT chk_report_status CHECK (
    status IN (
      'VERIFIED',
      'FLAGGED',
      'PENDING_REVIEW'
    )
  )
);

-- ============================================================================
-- Indexes for optimized querying across trainer, trainee, and commander views
-- ============================================================================

-- Index 1: Fast filtering by trainee identifier for personalized history views
CREATE INDEX IF NOT EXISTS idx_observation_reports_trainee_id 
  ON observation_reports(trainee_id);

-- Index 2: Fast filtering by training session identifier for post-mission after-action reviews
CREATE INDEX IF NOT EXISTS idx_observation_reports_session_id 
  ON observation_reports(session_id);

-- Index 3: Chronological ordering for timeline feeds and after-action logs
CREATE INDEX IF NOT EXISTS idx_observation_reports_created_at 
  ON observation_reports(created_at DESC);

-- Index 4: Compound index for trainee chronological queries
CREATE INDEX IF NOT EXISTS idx_observation_reports_trainee_created 
  ON observation_reports(trainee_id, created_at DESC);

-- Index 5: Threat rating index for commander threat heatmap queries
CREATE INDEX IF NOT EXISTS idx_observation_reports_threat_rating 
  ON observation_reports(threat_rating);
