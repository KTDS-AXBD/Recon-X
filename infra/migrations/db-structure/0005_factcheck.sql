-- Migration: 0005_factcheck.sql
-- Description: Fact Check Engine — source-document cross-comparison result tables
-- Service: svc-extraction (db-structure)
-- Date: 2026-03-06

CREATE TABLE IF NOT EXISTS fact_check_results (
  result_id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  spec_type TEXT NOT NULL DEFAULT 'mixed',
  source_document_ids TEXT NOT NULL,      -- JSON array
  doc_document_ids TEXT NOT NULL,         -- JSON array
  total_source_items INTEGER DEFAULT 0,
  total_doc_items INTEGER DEFAULT 0,
  matched_items INTEGER DEFAULT 0,
  gap_count INTEGER DEFAULT 0,
  coverage_pct REAL DEFAULT 0,
  gaps_by_type TEXT,                      -- JSON: {"SM":1,"MC":2,...}
  gaps_by_severity TEXT,                  -- JSON: {"HIGH":1,"MEDIUM":2,"LOW":3}
  status TEXT NOT NULL DEFAULT 'pending',
  match_result_json TEXT,                 -- Full MatchedItem[] JSON
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS fact_check_gaps (
  gap_id TEXT PRIMARY KEY,
  result_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  gap_type TEXT NOT NULL,                 -- SM | MC | PM | TM | MID
  severity TEXT NOT NULL,                 -- HIGH | MEDIUM | LOW
  source_item TEXT,                       -- JSON: source side reference
  source_document_id TEXT,
  document_item TEXT,                     -- JSON: document side (NULL for MID)
  document_id TEXT,
  description TEXT NOT NULL,
  evidence TEXT,
  auto_resolved INTEGER DEFAULT 0,
  review_status TEXT NOT NULL DEFAULT 'pending',
  reviewer_id TEXT,
  reviewer_comment TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fc_results_org ON fact_check_results(organization_id);
CREATE INDEX IF NOT EXISTS idx_fc_results_status ON fact_check_results(status);
CREATE INDEX IF NOT EXISTS idx_fc_gaps_result ON fact_check_gaps(result_id);
CREATE INDEX IF NOT EXISTS idx_fc_gaps_type ON fact_check_gaps(gap_type);
CREATE INDEX IF NOT EXISTS idx_fc_gaps_severity ON fact_check_gaps(severity);
CREATE INDEX IF NOT EXISTS idx_fc_gaps_review ON fact_check_gaps(review_status);
