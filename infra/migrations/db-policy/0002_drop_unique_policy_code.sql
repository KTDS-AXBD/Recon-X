-- Remove UNIQUE constraint from policy_code.
-- In a multi-tenant system, different organizations may generate the same
-- policy codes independently (e.g., POL-PENSION-WD-001).
-- SQLite does not support ALTER TABLE DROP CONSTRAINT, so we recreate the table.

PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS policies_new (
  policy_id TEXT PRIMARY KEY,
  extraction_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  policy_code TEXT NOT NULL,  -- UNIQUE removed
  title TEXT NOT NULL,
  condition TEXT NOT NULL,
  criteria TEXT NOT NULL,
  outcome TEXT NOT NULL,
  source_document_id TEXT NOT NULL,
  source_page_ref TEXT,
  source_excerpt TEXT,
  status TEXT NOT NULL DEFAULT 'candidate',
  trust_level TEXT NOT NULL DEFAULT 'unreviewed',
  trust_score REAL DEFAULT 0.0,
  tags TEXT DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO policies_new SELECT * FROM policies;
DROP TABLE policies;
ALTER TABLE policies_new RENAME TO policies;

CREATE INDEX IF NOT EXISTS idx_policies_extraction ON policies(extraction_id);
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);
CREATE INDEX IF NOT EXISTS idx_policies_org_code ON policies(organization_id, policy_code);

PRAGMA foreign_keys = ON;
