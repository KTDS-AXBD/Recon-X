-- 세션 221 TD-37: handoff.ts:78이 SELECT하는 document_ids 컬럼 부재 해소
-- Sprint 5(Phase 1)에서 handoff.ts 도입 시 migration 누락 → production에서 한 번도 동작 못 함
-- Source Manifest(buildSourceManifest)의 untracedPolicies 검증용. JSON string 배열 또는 NULL.
-- 기존 row는 NULL 유지 → handoff.ts 라인 111 `skillRow.document_ids ? JSON.parse(...) : []`로 safe fallback
ALTER TABLE skills ADD COLUMN document_ids TEXT;
CREATE INDEX IF NOT EXISTS idx_skills_document_ids_notnull ON skills(skill_id)
  WHERE document_ids IS NOT NULL;
