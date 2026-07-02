-- Fix produção: migration 20260701000006_add_roles_table falhou (P3009)
-- Rodar no MySQL do Railway ANTES de `prisma migrate resolve --applied`
--
-- 1. Diagnóstico (opcional):
-- SELECT migration_name, finished_at, rolled_back_at, logs
--   FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5;
-- SHOW TABLES LIKE 'roles';
-- SHOW COLUMNS FROM users LIKE 'roleId';
-- SELECT DISTINCT role FROM users;
-- SELECT COUNT(*) FROM users WHERE roleId IS NULL;

-- 2. Normalizar roles legados (se ainda existirem SUPER_ADMIN / TENANT_ADMIN)
UPDATE `users` SET `role` = 'ADMIN' WHERE `role` IN ('SUPER_ADMIN', 'TENANT_ADMIN');

-- 3. Criar tabela roles (pule se já existir)
CREATE TABLE IF NOT EXISTS `roles` (
    `id` VARCHAR(191) NOT NULL,
    `name` ENUM('ADMIN', 'OPERATOR', 'DRIVER', 'COLLECTION_POINT_OPERATOR', 'DONOR') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 4. Seed roles (só insere se faltar)
INSERT INTO `roles` (`id`, `name`)
SELECT UUID(), 'ADMIN' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `roles` WHERE `name` = 'ADMIN');
INSERT INTO `roles` (`id`, `name`)
SELECT UUID(), 'OPERATOR' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `roles` WHERE `name` = 'OPERATOR');
INSERT INTO `roles` (`id`, `name`)
SELECT UUID(), 'DRIVER' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `roles` WHERE `name` = 'DRIVER');
INSERT INTO `roles` (`id`, `name`)
SELECT UUID(), 'COLLECTION_POINT_OPERATOR' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `roles` WHERE `name` = 'COLLECTION_POINT_OPERATOR');
INSERT INTO `roles` (`id`, `name`)
SELECT UUID(), 'DONOR' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `roles` WHERE `name` = 'DONOR');

-- 5. Coluna roleId (MySQL não tem IF NOT EXISTS para coluna — ignore erro se já existir)
-- ALTER TABLE `users` ADD COLUMN `roleId` VARCHAR(191) NULL;

-- 6. Backfill roleId
UPDATE `users` u
JOIN `roles` r ON r.name = u.role
SET u.roleId = r.id
WHERE u.roleId IS NULL;

-- 7. Garantir NOT NULL (só se todos os users tiverem roleId)
-- SELECT COUNT(*) FROM users WHERE roleId IS NULL;  -- deve ser 0
-- ALTER TABLE `users` MODIFY COLUMN `roleId` VARCHAR(191) NOT NULL;

-- 8. FK (ignore se já existir)
-- ALTER TABLE `users` ADD CONSTRAINT `users_roleId_fkey`
--   FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
