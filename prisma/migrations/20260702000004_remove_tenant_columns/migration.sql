-- Remove legacy multi-tenant columns (single-tenant app)

ALTER TABLE `business_events` DROP FOREIGN KEY `business_events_tenantId_fkey`;
ALTER TABLE `business_events` DROP COLUMN `tenantId`;

ALTER TABLE `collection_points` DROP FOREIGN KEY `collection_points_tenantId_fkey`;
ALTER TABLE `collection_points` DROP COLUMN `tenantId`;

ALTER TABLE `declarations` DROP FOREIGN KEY `declarations_tenantId_fkey`;
ALTER TABLE `declarations` DROP COLUMN `tenantId`;

ALTER TABLE `donor_requests` DROP FOREIGN KEY `donor_requests_tenantId_fkey`;
ALTER TABLE `donor_requests` DROP COLUMN `tenantId`;

ALTER TABLE `material_types` DROP FOREIGN KEY `material_types_tenantId_fkey`;
ALTER TABLE `material_types` DROP COLUMN `tenantId`;

ALTER TABLE `routes` DROP FOREIGN KEY `routes_tenantId_fkey`;
ALTER TABLE `routes` DROP COLUMN `tenantId`;

ALTER TABLE `tracking_sessions` DROP FOREIGN KEY `tracking_sessions_tenantId_fkey`;
ALTER TABLE `tracking_sessions` DROP COLUMN `tenantId`;

ALTER TABLE `drivers` DROP FOREIGN KEY `drivers_tenantId_fkey`;
ALTER TABLE `drivers` DROP COLUMN `tenantId`;

ALTER TABLE `weight_records` DROP FOREIGN KEY `weight_records_tenantId_fkey`;
ALTER TABLE `weight_records` DROP COLUMN `tenantId`;

DROP TABLE IF EXISTS `tenants`;
