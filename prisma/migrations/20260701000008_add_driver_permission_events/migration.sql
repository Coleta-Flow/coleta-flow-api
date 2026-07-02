-- CreateTable: driver_permission_events
CREATE TABLE `driver_permission_events` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `permissionType` ENUM('LOCATION_FOREGROUND', 'LOCATION_BACKGROUND') NOT NULL,
    `status` ENUM('GRANTED', 'DENIED', 'REVOKED') NOT NULL,
    `platform` VARCHAR(191) NOT NULL,
    `osVersion` VARCHAR(191) NULL,
    `appVersion` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `driver_permission_events_userId_idx`(`userId`),
    INDEX `driver_permission_events_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `driver_permission_events` ADD CONSTRAINT `driver_permission_events_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
