-- Add term_type column to terms table for entity/relation/attribute classification
ALTER TABLE terms ADD COLUMN term_type TEXT DEFAULT 'entity';
CREATE INDEX IF NOT EXISTS idx_terms_type ON terms(term_type);
