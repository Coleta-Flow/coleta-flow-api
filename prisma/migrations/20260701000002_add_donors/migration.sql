-- CreateTable: donors
CREATE TABLE `donors` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `cpfCnpj` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `whatsapp` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `cep` VARCHAR(191) NULL,
    `street` VARCHAR(191) NULL,
    `number` VARCHAR(191) NULL,
    `complement` VARCHAR(191) NULL,
    `neighborhood` VARCHAR(191) NULL,
    `city` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NULL,
    `lat` DECIMAL(10, 8) NULL,
    `lng` DECIMAL(11, 8) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `donors_cpfCnpj_key`(`cpfCnpj`),
    INDEX `donors_city_idx`(`city`),
    INDEX `donors_cpfCnpj_idx`(`cpfCnpj`),
    INDEX `donors_email_idx`(`email`),
    INDEX `donors_whatsapp_idx`(`whatsapp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable: add donorId to donor_requests
ALTER TABLE `donor_requests` ADD COLUMN `donorId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `donor_requests` ADD CONSTRAINT `donor_requests_donorId_fkey` FOREIGN KEY (`donorId`) REFERENCES `donors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Index for donorId
CREATE INDEX `donor_requests_donorId_idx` ON `donor_requests`(`donorId`);
