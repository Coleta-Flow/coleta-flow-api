-- CreateTable
CREATE TABLE `business_events` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `type` ENUM('DONOR_REQUEST_CREATED', 'DONOR_REQUEST_REVIEWED', 'REQUEST_DIRECTED_TO_POINT', 'PICKUP_APPROVED', 'DRIVER_ASSIGNED_TO_ROUTE', 'ROUTE_STARTED', 'DRIVER_ARRIVED_AT_DONOR', 'MATERIAL_COLLECTED', 'DRIVER_ARRIVED_AT_COLLECTION_POINT', 'MATERIAL_DELIVERED_TO_COLLECTION_POINT', 'WEIGHT_REGISTERED', 'DECLARATION_GENERATED', 'ROUTE_FINISHED', 'REQUEST_CANCELLED') NOT NULL,
    `payload` JSON NOT NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `business_events_tenantId_idx`(`tenantId`),
    INDEX `business_events_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `business_events_type_idx`(`type`),
    INDEX `business_events_tenantId_occurredAt_idx`(`tenantId`, `occurredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `collection_points` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `lat` DECIMAL(10, 8) NOT NULL,
    `lng` DECIMAL(11, 8) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `operatingHours` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `collection_points_tenantId_idx`(`tenantId`),
    INDEX `collection_points_tenantId_city_idx`(`tenantId`, `city`),
    INDEX `collection_points_tenantId_active_idx`(`tenantId`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `declarations` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `donorRequestId` VARCHAR(191) NOT NULL,
    `weightRecordId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `pdfUrl` VARCHAR(191) NULL,
    `validationToken` VARCHAR(191) NOT NULL,
    `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `declarations_donorRequestId_key`(`donorRequestId`),
    UNIQUE INDEX `declarations_weightRecordId_key`(`weightRecordId`),
    UNIQUE INDEX `declarations_code_key`(`code`),
    UNIQUE INDEX `declarations_validationToken_key`(`validationToken`),
    INDEX `declarations_tenantId_idx`(`tenantId`),
    INDEX `declarations_code_idx`(`code`),
    INDEX `declarations_validationToken_idx`(`validationToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `donor_requests` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `trackingCode` VARCHAR(191) NOT NULL,
    `status` ENUM('REQUESTED', 'UNDER_REVIEW', 'DIRECTED_TO_COLLECTION_POINT', 'WAITING_DROPOFF_AT_POINT', 'APPROVED_FOR_PICKUP', 'DRIVER_ASSIGNED', 'DRIVER_ON_THE_WAY', 'DRIVER_ARRIVED', 'COLLECTED', 'GOING_TO_COLLECTION_POINT', 'DELIVERED_TO_COLLECTION_POINT', 'WEIGHED', 'DECLARATION_AVAILABLE', 'FINISHED', 'CANCELLED') NOT NULL DEFAULT 'REQUESTED',
    `donorName` VARCHAR(191) NOT NULL,
    `donorWhatsapp` VARCHAR(191) NOT NULL,
    `donorEmail` VARCHAR(191) NULL,
    `address` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `materialTypeId` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `estimatedWeightKg` DECIMAL(10, 2) NULL,
    `bestTimeForPickup` VARCHAR(191) NOT NULL,
    `operatorNotes` TEXT NULL,
    `cancelReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `donor_requests_trackingCode_key`(`trackingCode`),
    INDEX `donor_requests_tenantId_idx`(`tenantId`),
    INDEX `donor_requests_tenantId_status_idx`(`tenantId`, `status`),
    INDEX `donor_requests_tenantId_city_idx`(`tenantId`, `city`),
    INDEX `donor_requests_trackingCode_idx`(`trackingCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `donor_request_photos` (
    `id` VARCHAR(191) NOT NULL,
    `donorRequestId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `sizeBytes` INTEGER NULL,
    `mimeType` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `donor_request_photos_donorRequestId_idx`(`donorRequestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pickup_decisions` (
    `id` VARCHAR(191) NOT NULL,
    `donorRequestId` VARCHAR(191) NOT NULL,
    `willPickup` BOOLEAN NOT NULL,
    `collectionPointId` VARCHAR(191) NULL,
    `decidedByUserId` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `pickup_decisions_donorRequestId_key`(`donorRequestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `file_assets` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `sizeBytes` INTEGER NULL,
    `mimeType` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `file_assets_entityType_entityId_idx`(`entityType`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `material_types` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `material_types_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `routes` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `donorRequestId` VARCHAR(191) NOT NULL,
    `driverId` VARCHAR(191) NULL,
    `status` ENUM('PLANNED', 'ASSIGNED', 'IN_PROGRESS', 'ARRIVED_AT_DONOR', 'COLLECTED', 'GOING_TO_COLLECTION_POINT', 'ARRIVED_AT_COLLECTION_POINT', 'DELIVERED', 'WEIGHED', 'FINISHED', 'CANCELLED') NOT NULL DEFAULT 'PLANNED',
    `trackingToken` VARCHAR(191) NULL,
    `cancelReason` VARCHAR(191) NULL,
    `startedAt` DATETIME(3) NULL,
    `finishedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `routes_donorRequestId_key`(`donorRequestId`),
    UNIQUE INDEX `routes_trackingToken_key`(`trackingToken`),
    INDEX `routes_tenantId_idx`(`tenantId`),
    INDEX `routes_tenantId_status_idx`(`tenantId`, `status`),
    INDEX `routes_tenantId_driverId_idx`(`tenantId`, `driverId`),
    INDEX `routes_trackingToken_idx`(`trackingToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `route_stops` (
    `id` VARCHAR(191) NOT NULL,
    `routeId` VARCHAR(191) NOT NULL,
    `collectionPointId` VARCHAR(191) NULL,
    `sequence` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `lat` DECIMAL(10, 8) NULL,
    `lng` DECIMAL(11, 8) NULL,
    `arrivedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,

    INDEX `route_stops_routeId_idx`(`routeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenants` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `cnpj` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `logoUrl` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `tenants_slug_key`(`slug`),
    INDEX `tenants_slug_idx`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tracking_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `routeId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `invalidatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `tracking_sessions_routeId_key`(`routeId`),
    UNIQUE INDEX `tracking_sessions_token_key`(`token`),
    INDEX `tracking_sessions_token_idx`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `driver_location_snapshots` (
    `id` VARCHAR(191) NOT NULL,
    `routeId` VARCHAR(191) NOT NULL,
    `lat` DECIMAL(10, 8) NOT NULL,
    `lng` DECIMAL(11, 8) NOT NULL,
    `speed` DECIMAL(6, 2) NULL,
    `heading` INTEGER NULL,
    `accuracy` DECIMAL(6, 2) NULL,
    `battery` INTEGER NULL,
    `capturedAt` DATETIME(3) NOT NULL,

    INDEX `driver_location_snapshots_routeId_idx`(`routeId`),
    INDEX `driver_location_snapshots_routeId_capturedAt_idx`(`routeId`, `capturedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'TENANT_ADMIN', 'OPERATOR', 'DRIVER', 'COLLECTION_POINT_OPERATOR') NOT NULL DEFAULT 'OPERATOR',
    `phone` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `users_tenantId_idx`(`tenantId`),
    INDEX `users_tenantId_role_idx`(`tenantId`, `role`),
    UNIQUE INDEX `users_tenantId_email_key`(`tenantId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `drivers` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `licenseNumber` VARCHAR(191) NULL,
    `vehiclePlate` VARCHAR(191) NULL,
    `vehicleModel` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `drivers_userId_key`(`userId`),
    INDEX `drivers_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `weight_records` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `donorRequestId` VARCHAR(191) NOT NULL,
    `routeId` VARCHAR(191) NULL,
    `collectionPointId` VARCHAR(191) NULL,
    `grossWeightKg` DECIMAL(10, 3) NOT NULL,
    `netWeightKg` DECIMAL(10, 3) NOT NULL,
    `tareKg` DECIMAL(10, 3) NULL,
    `notes` VARCHAR(191) NULL,
    `confirmedByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `weight_records_donorRequestId_key`(`donorRequestId`),
    INDEX `weight_records_tenantId_idx`(`tenantId`),
    INDEX `weight_records_donorRequestId_idx`(`donorRequestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `business_events` ADD CONSTRAINT `business_events_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collection_points` ADD CONSTRAINT `collection_points_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `declarations` ADD CONSTRAINT `declarations_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `declarations` ADD CONSTRAINT `declarations_donorRequestId_fkey` FOREIGN KEY (`donorRequestId`) REFERENCES `donor_requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `declarations` ADD CONSTRAINT `declarations_weightRecordId_fkey` FOREIGN KEY (`weightRecordId`) REFERENCES `weight_records`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `donor_requests` ADD CONSTRAINT `donor_requests_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `donor_requests` ADD CONSTRAINT `donor_requests_materialTypeId_fkey` FOREIGN KEY (`materialTypeId`) REFERENCES `material_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `donor_request_photos` ADD CONSTRAINT `donor_request_photos_donorRequestId_fkey` FOREIGN KEY (`donorRequestId`) REFERENCES `donor_requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pickup_decisions` ADD CONSTRAINT `pickup_decisions_donorRequestId_fkey` FOREIGN KEY (`donorRequestId`) REFERENCES `donor_requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pickup_decisions` ADD CONSTRAINT `pickup_decisions_collectionPointId_fkey` FOREIGN KEY (`collectionPointId`) REFERENCES `collection_points`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `material_types` ADD CONSTRAINT `material_types_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `routes` ADD CONSTRAINT `routes_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `routes` ADD CONSTRAINT `routes_donorRequestId_fkey` FOREIGN KEY (`donorRequestId`) REFERENCES `donor_requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `routes` ADD CONSTRAINT `routes_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `drivers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `route_stops` ADD CONSTRAINT `route_stops_routeId_fkey` FOREIGN KEY (`routeId`) REFERENCES `routes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `route_stops` ADD CONSTRAINT `route_stops_collectionPointId_fkey` FOREIGN KEY (`collectionPointId`) REFERENCES `collection_points`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tracking_sessions` ADD CONSTRAINT `tracking_sessions_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tracking_sessions` ADD CONSTRAINT `tracking_sessions_routeId_fkey` FOREIGN KEY (`routeId`) REFERENCES `routes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `driver_location_snapshots` ADD CONSTRAINT `driver_location_snapshots_routeId_fkey` FOREIGN KEY (`routeId`) REFERENCES `routes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `drivers` ADD CONSTRAINT `drivers_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `weight_records` ADD CONSTRAINT `weight_records_donorRequestId_fkey` FOREIGN KEY (`donorRequestId`) REFERENCES `donor_requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `weight_records` ADD CONSTRAINT `weight_records_collectionPointId_fkey` FOREIGN KEY (`collectionPointId`) REFERENCES `collection_points`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
