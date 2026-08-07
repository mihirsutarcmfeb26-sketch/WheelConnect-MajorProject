-- =====================================================================================
-- WheelConnect :: service-center-service
-- One-time migration: allow ONE USER -> MANY SERVICE CENTERS
-- =====================================================================================
--
-- WHY THIS SCRIPT EXISTS
-- ----------------------
-- The JPA entities no longer declare any one-to-one relationship or unique = true on
-- user_id. However, spring.jpa.hibernate.ddl-auto=update only ADDS tables, columns and
-- constraints - it NEVER DROPS them. So the UNIQUE index created by the original
-- one-center-per-user mapping is still present in the live MySQL schema and keeps
-- blocking the second row, no matter what the Java code says.
--
-- This script removes those leftover unique indexes and backfills the new
-- service_center_applications.service_center_id link column.
--
-- HOW TO RUN (once, against the service-center database)
-- -----------------------------------------------------
--   mysql -u root -p wheelconnect_service_center < V1__allow_multiple_service_centers_per_user.sql
--
-- The script is idempotent - running it twice is harmless. Take a backup first:
--   mysqldump -u root -p wheelconnect_service_center > backup_before_multicenter.sql
-- =====================================================================================

SET @db := DATABASE();

-- -------------------------------------------------------------------------------------
-- STEP 0 (diagnostic): what unique indexes exist on user_id right now?
-- Read this output - it tells you exactly which constraint was blocking you.
-- -------------------------------------------------------------------------------------
SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = @db
  AND TABLE_NAME IN ('service_centers', 'service_center_applications')
  AND COLUMN_NAME = 'user_id'
ORDER BY TABLE_NAME, INDEX_NAME;

-- -------------------------------------------------------------------------------------
-- STEP 1: add the application -> center link column if Hibernate has not created it yet.
-- Nullable, so every existing row is unaffected.
-- (MySQL 8 has no ADD COLUMN IF NOT EXISTS, hence the information_schema guard.)
-- -------------------------------------------------------------------------------------
SET @col_exists := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @db
      AND TABLE_NAME   = 'service_center_applications'
      AND COLUMN_NAME  = 'service_center_id'
);
SET @sql := IF(@col_exists = 0,
    'ALTER TABLE service_center_applications ADD COLUMN service_center_id BIGINT NULL',
    'SELECT ''service_center_applications.service_center_id already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- -------------------------------------------------------------------------------------
-- STEP 2: drop the leftover UNIQUE index on service_centers.user_id.
-- The index name is Hibernate-generated (e.g. UK_ka4mnxsgs8h1qvsm7lqhaqbmg), so it is
-- looked up dynamically. Only single-column, non-PRIMARY unique indexes are touched.
-- -------------------------------------------------------------------------------------
SET @idx := (
    SELECT s.INDEX_NAME
    FROM information_schema.STATISTICS s
    WHERE s.TABLE_SCHEMA = @db
      AND s.TABLE_NAME   = 'service_centers'
      AND s.COLUMN_NAME  = 'user_id'
      AND s.NON_UNIQUE   = 0
      AND s.INDEX_NAME  <> 'PRIMARY'
      AND (SELECT COUNT(*) FROM information_schema.STATISTICS s2
           WHERE s2.TABLE_SCHEMA = s.TABLE_SCHEMA
             AND s2.TABLE_NAME   = s.TABLE_NAME
             AND s2.INDEX_NAME   = s.INDEX_NAME) = 1
    LIMIT 1
);
SET @sql := IF(@idx IS NULL,
    'SELECT ''no unique index on service_centers.user_id - nothing to drop'' AS info',
    CONCAT('ALTER TABLE service_centers DROP INDEX `', @idx, '`'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- -------------------------------------------------------------------------------------
-- STEP 3: same treatment for service_center_applications.user_id.
-- If this index exists it is the direct cause of "the second application never reaches
-- Admin" - the INSERT fails with a duplicate-key error before the row is ever saved.
-- -------------------------------------------------------------------------------------
SET @idx := (
    SELECT s.INDEX_NAME
    FROM information_schema.STATISTICS s
    WHERE s.TABLE_SCHEMA = @db
      AND s.TABLE_NAME   = 'service_center_applications'
      AND s.COLUMN_NAME  = 'user_id'
      AND s.NON_UNIQUE   = 0
      AND s.INDEX_NAME  <> 'PRIMARY'
      AND (SELECT COUNT(*) FROM information_schema.STATISTICS s2
           WHERE s2.TABLE_SCHEMA = s.TABLE_SCHEMA
             AND s2.TABLE_NAME   = s.TABLE_NAME
             AND s2.INDEX_NAME   = s.INDEX_NAME) = 1
    LIMIT 1
);
SET @sql := IF(@idx IS NULL,
    'SELECT ''no unique index on service_center_applications.user_id - nothing to drop'' AS info',
    CONCAT('ALTER TABLE service_center_applications DROP INDEX `', @idx, '`'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- -------------------------------------------------------------------------------------
-- STEP 4: restore plain (non-unique) indexes so owner lookups stay fast.
-- Dropping the unique index above also removed the index used by findAllByUserId.
-- -------------------------------------------------------------------------------------
SET @has_idx := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'service_centers'
      AND INDEX_NAME = 'idx_service_centers_user_id'
);
SET @sql := IF(@has_idx = 0,
    'CREATE INDEX idx_service_centers_user_id ON service_centers (user_id)',
    'SELECT ''idx_service_centers_user_id already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_idx := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'service_center_applications'
      AND INDEX_NAME = 'idx_sc_applications_user_id'
);
SET @sql := IF(@has_idx = 0,
    'CREATE INDEX idx_sc_applications_user_id ON service_center_applications (user_id)',
    'SELECT ''idx_sc_applications_user_id already exists'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- -------------------------------------------------------------------------------------
-- STEP 5: backfill the link for applications that were approved BEFORE this change.
-- Without this, re-approving an old application would create a duplicate center.
-- Only owners who currently have exactly one center are matched, so nothing is guessed.
-- -------------------------------------------------------------------------------------
UPDATE service_center_applications a
JOIN (
    SELECT user_id, MIN(id) AS center_id, COUNT(*) AS center_count
    FROM service_centers
    GROUP BY user_id
) owned ON owned.user_id = a.user_id AND owned.center_count = 1
SET a.service_center_id = owned.center_id
WHERE a.status = 'APPROVED'
  AND a.service_center_id IS NULL;

-- -------------------------------------------------------------------------------------
-- STEP 6 (verification): user_id must now show NON_UNIQUE = 1 on both tables.
-- Any row still showing NON_UNIQUE = 0 means another unique index exists - re-run this
-- script to drop it as well.
-- -------------------------------------------------------------------------------------
SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = @db
  AND TABLE_NAME IN ('service_centers', 'service_center_applications')
  AND COLUMN_NAME = 'user_id'
ORDER BY TABLE_NAME, INDEX_NAME;

-- Applications that are approved but not yet linked to a center (expect 0 rows after
-- STEP 5, unless an owner legitimately has several centers already).
SELECT id, user_id, service_center_name, status, service_center_id
FROM service_center_applications
WHERE status = 'APPROVED' AND service_center_id IS NULL;
