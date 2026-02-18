"""
PhishX Database Schema Enhancements

Migration script for Phase 1:
- Add critical indexes for performance
- Add constraints for data integrity
- Add audit fields
- Update schema for multi-tenancy
"""

# ========================================
# Migration: 001_phase1_indexes.sql
# ========================================

MIGRATION_UP = """

-- ========================================
-- PHASE 1: PERFORMANCE INDEXES
-- ========================================

-- Email decisions table indexes
CREATE INDEX IF NOT EXISTS idx_email_decisions_tenant_category 
  ON email_decisions(tenant_id, category, created_at DESC)
  WHERE decision != 'ALLOW';

CREATE INDEX IF NOT EXISTS idx_email_decisions_risk_score 
  ON email_decisions(tenant_id, risk_score DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_decisions_created_at 
  ON email_decisions(created_at DESC);

-- SOC alerts indexes (most critical for dashboard queries)
CREATE INDEX IF NOT EXISTS idx_soc_alerts_tenant_status 
  ON soc_alerts(tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_soc_alerts_status_open 
  ON soc_alerts(status, created_at DESC)
  WHERE status = 'OPEN';

CREATE INDEX IF NOT EXISTS idx_soc_alerts_category 
  ON soc_alerts(category, created_at DESC);

-- SOC actions indexes
CREATE INDEX IF NOT EXISTS idx_soc_actions_alert_id 
  ON soc_actions(alert_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_soc_actions_created_at 
  ON soc_actions(created_at DESC);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_entity 
  ON audit_log(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_action 
  ON audit_log(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at 
  ON audit_log(created_at DESC);

-- ML feedback indexes
CREATE INDEX IF NOT EXISTS idx_ml_feedback_email_id 
  ON ml_feedback(email_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ml_feedback_label 
  ON ml_feedback(label, created_at DESC);

-- Blocklists indexes
CREATE INDEX IF NOT EXISTS idx_blocklists_tenant_type 
  ON blocklists(tenant_id, block_type, active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blocklists_value 
  ON blocklists(value, active)
  WHERE active = TRUE;

-- Tenants and policies indexes
CREATE INDEX IF NOT EXISTS idx_tenant_policies_active 
  ON tenant_policies(tenant_id, active, created_at DESC);

-- ========================================
-- PHASE 1: DATA INTEGRITY & CONSTRAINTS
-- ========================================

-- Add tenant_id to email_decisions if not exists
ALTER TABLE email_decisions 
ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

ALTER TABLE email_decisions
ADD CONSTRAINT fk_email_decisions_tenant 
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
  ON DELETE CASCADE;

-- Add tenant_id to soc_alerts if not exists
ALTER TABLE soc_alerts 
ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

ALTER TABLE soc_alerts
ADD CONSTRAINT fk_soc_alerts_tenant 
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
  ON DELETE CASCADE;

-- Add tenant_id to ml_feedback if not exists
ALTER TABLE ml_feedback 
ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

ALTER TABLE ml_feedback
ADD CONSTRAINT fk_ml_feedback_tenant 
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
  ON DELETE CASCADE;

-- ========================================
-- PHASE 1: AUDIT ENHANCEMENTS
-- ========================================

-- Add processed_by column to email_decisions
ALTER TABLE email_decisions 
ADD COLUMN IF NOT EXISTS processed_by JSONB DEFAULT '{"source":"system","service":"phishx"}';

-- Add updated_at to soc_alerts for tracking status changes
ALTER TABLE soc_alerts 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add index on updated_at for recent changes
CREATE INDEX IF NOT EXISTS idx_soc_alerts_updated_at 
  ON soc_alerts(updated_at DESC);

-- ========================================
-- PHASE 1: PERFORMANCE TUNING
-- ========================================

-- Analyze tables to update statistics
ANALYZE email_decisions;
ANALYZE soc_alerts;
ANALYZE soc_actions;
ANALYZE audit_log;
ANALYZE ml_feedback;
ANALYZE blocklists;

"""

MIGRATION_DOWN = """

-- ========================================
-- ROLLBACK: PHASE 1 INDEXES & CONSTRAINTS
-- ========================================

-- Drop indexes
DROP INDEX IF EXISTS idx_email_decisions_tenant_category;
DROP INDEX IF EXISTS idx_email_decisions_risk_score;
DROP INDEX IF EXISTS idx_email_decisions_created_at;
DROP INDEX IF EXISTS idx_soc_alerts_tenant_status;
DROP INDEX IF EXISTS idx_soc_alerts_status_open;
DROP INDEX IF EXISTS idx_soc_alerts_category;
DROP INDEX IF EXISTS idx_soc_actions_alert_id;
DROP INDEX IF EXISTS idx_soc_actions_created_at;
DROP INDEX IF EXISTS idx_audit_log_entity;
DROP INDEX IF EXISTS idx_audit_log_action;
DROP INDEX IF EXISTS idx_audit_log_created_at;
DROP INDEX IF EXISTS idx_ml_feedback_email_id;
DROP INDEX IF EXISTS idx_ml_feedback_label;
DROP INDEX IF EXISTS idx_blocklists_tenant_type;
DROP INDEX IF EXISTS idx_blocklists_value;
DROP INDEX IF EXISTS idx_tenant_policies_active;
DROP INDEX IF EXISTS idx_soc_alerts_updated_at;

-- Drop constraints
ALTER TABLE email_decisions 
DROP CONSTRAINT IF EXISTS fk_email_decisions_tenant;

ALTER TABLE soc_alerts 
DROP CONSTRAINT IF EXISTS fk_soc_alerts_tenant;

ALTER TABLE ml_feedback 
DROP CONSTRAINT IF EXISTS fk_ml_feedback_tenant;

-- Drop columns
ALTER TABLE email_decisions 
DROP COLUMN IF EXISTS tenant_id,
DROP COLUMN IF EXISTS processed_by;

ALTER TABLE soc_alerts 
DROP COLUMN IF EXISTS tenant_id,
DROP COLUMN IF EXISTS updated_at;

ALTER TABLE ml_feedback 
DROP COLUMN IF EXISTS tenant_id;

"""

# ========================================
# Migration Runner
# ========================================

import os
import sys
from datetime import datetime
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def run_migration(direction: str = "up"):
    """Run database migration"""
    
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL environment variable is required")
    
    # Parse connection string
    conn = psycopg2.connect(database_url)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    
    try:
        # Execute migration
        sql = MIGRATION_UP if direction == "up" else MIGRATION_DOWN
        
        print(f"\n{'='*60}")
        print(f"Running Migration: {direction.upper()}")
        print(f"Timestamp: {datetime.now().isoformat()}")
        print(f"{'='*60}\n")
        
        # Split into individual statements for better error tracking
        statements = [s.strip() for s in sql.split(';') if s.strip()]
        
        for i, statement in enumerate(statements, 1):
            try:
                cur.execute(statement)
                print(f"✓ Statement {i}/{len(statements)}")
            except psycopg2.Error as e:
                # Some errors (like constraint already exists) are acceptable
                if "already exists" in str(e).lower() or "does not exist" in str(e).lower():
                    print(f"⚠ Statement {i}/{len(statements)} - Skipped (already in state)")
                else:
                    print(f"✗ Statement {i}/{len(statements)} - Error: {str(e)}")
                    raise
        
        print(f"\n{'='*60}")
        print(f"Migration {direction.upper()} completed successfully!")
        print(f"{'='*60}\n")
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        conn.rollback()
        sys.exit(1)
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    direction = sys.argv[1] if len(sys.argv) > 1 else "up"
    
    if direction not in ("up", "down"):
        print("Usage: python migration.py [up|down]")
        sys.exit(1)
    
    run_migration(direction)
