-- CreateTable: roles
CREATE TABLE `roles` (
    `id` VARCHAR(191) NOT NULL,
    `name` ENUM('ADMIN', 'OPERATOR', 'DRIVER', 'COLLECTION_POINT_OPERATOR', 'DONOR') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed one row per UserRole value
INSERT INTO `roles` (`id`, `name`) VALUES
  (UUID(), 'ADMIN'),
  (UUID(), 'OPERATOR'),
  (UUID(), 'DRIVER'),
  (UUID(), 'COLLECTION_POINT_OPERATOR'),
  (UUID(), 'DONOR');

-- AlterTable: add roleId (nullable first so existing rows can be backfilled)
ALTER TABLE `users` ADD COLUMN `roleId` VARCHAR(191) NULL;

-- Backfill roleId from the existing role enum column
UPDATE `users` u JOIN `roles` r ON r.name = u.role SET u.roleId = r.id;

-- Enforce NOT NULL now that every row has a roleId
ALTER TABLE `users` MODIFY COLUMN `roleId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
