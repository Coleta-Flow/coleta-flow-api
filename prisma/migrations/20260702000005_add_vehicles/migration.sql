-- CreateTable
CREATE TABLE `vehicles` (
    `id` VARCHAR(191) NOT NULL,
    `plate` VARCHAR(191) NOT NULL,
    `brand` VARCHAR(191) NULL,
    `model` VARCHAR(191) NOT NULL,
    `capacityKg` DECIMAL(10, 2) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `vehicles_plate_key`(`plate`),
    INDEX `vehicles_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `drivers` ADD COLUMN `vehicleId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `drivers_vehicleId_idx` ON `drivers`(`vehicleId`);

-- AddForeignKey
ALTER TABLE `drivers` ADD CONSTRAINT `drivers_vehicleId_fkey` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
