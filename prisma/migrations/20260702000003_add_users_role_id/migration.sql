-- Add roleId to users (RBAC via roles table)
ALTER TABLE `users` ADD COLUMN `roleId` VARCHAR(191) NULL;

-- Remove legacy multi-tenant columns/constraints
ALTER TABLE `users` DROP FOREIGN KEY `users_tenantId_fkey`;
DROP INDEX `users_tenantId_email_key` ON `users`;
ALTER TABLE `users` DROP COLUMN `tenantId`;

-- Unique email per user
CREATE UNIQUE INDEX `users_email_key` ON `users`(`email`);

-- FK to roles
ALTER TABLE `users` ADD CONSTRAINT `users_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
