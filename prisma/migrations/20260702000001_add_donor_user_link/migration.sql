-- Link Donor to User for donor portal access
ALTER TABLE `donors` ADD COLUMN `userId` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `donors_userId_key` ON `donors`(`userId`);

ALTER TABLE `donors` ADD CONSTRAINT `donors_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
