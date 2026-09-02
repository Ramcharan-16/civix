-- AlterTable
ALTER TABLE `complaints` ADD COLUMN `acceptedAt` DATETIME(3) NULL,
    ADD COLUMN `actualResolutionDurationMinutes` INTEGER NULL,
    ADD COLUMN `assignedAt` DATETIME(3) NULL,
    ADD COLUMN `deadlineAt` DATETIME(3) NULL,
    ADD COLUMN `escalatedAt` DATETIME(3) NULL,
    ADD COLUMN `expectedDurationMinutes` INTEGER NULL,
    ADD COLUMN `lastProgressUpdateAt` DATETIME(3) NULL,
    ADD COLUMN `overdueAt` DATETIME(3) NULL,
    ADD COLUMN `progressPercentage` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `slaStatus` ENUM('NOT_STARTED', 'ON_TRACK', 'DUE_SOON', 'OVERDUE', 'RESOLVED_ON_TIME', 'RESOLVED_LATE') NOT NULL DEFAULT 'NOT_STARTED',
    ADD COLUMN `startedAt` DATETIME(3) NULL,
    MODIFY `status` ENUM('DRAFT', 'SUBMITTED', 'UNDER_AI_ANALYSIS', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED', 'REOPENED') NOT NULL DEFAULT 'SUBMITTED';

-- AlterTable
ALTER TABLE `users` ADD COLUMN `assignmentNotificationsEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `deadlineNotificationsEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `emailNotificationsEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `overdueNotificationsEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `pushNotificationsEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `smsNotificationsEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `statusChangeNotificationsEnabled` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `complaint_assignments` (
    `id` VARCHAR(191) NOT NULL,
    `complaintId` VARCHAR(191) NOT NULL,
    `departmentId` VARCHAR(191) NOT NULL,
    `staffId` VARCHAR(191) NOT NULL,
    `assignedBy` VARCHAR(191) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `acceptedAt` DATETIME(3) NULL,
    `startedAt` DATETIME(3) NULL,
    `expectedDurationMinutes` INTEGER NOT NULL,
    `deadlineAt` DATETIME(3) NOT NULL,
    `unassignedAt` DATETIME(3) NULL,
    `reason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `complaint_progress_updates` (
    `id` VARCHAR(191) NOT NULL,
    `complaintId` VARCHAR(191) NOT NULL,
    `staffId` VARCHAR(191) NOT NULL,
    `progressPercentage` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `estimatedCompletionAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sla_settings` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `durationMinutes` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sla_settings_type_key_key`(`type`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `complaint_assignments` ADD CONSTRAINT `complaint_assignments_complaintId_fkey` FOREIGN KEY (`complaintId`) REFERENCES `complaints`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaint_assignments` ADD CONSTRAINT `complaint_assignments_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaint_assignments` ADD CONSTRAINT `complaint_assignments_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaint_assignments` ADD CONSTRAINT `complaint_assignments_assignedBy_fkey` FOREIGN KEY (`assignedBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaint_progress_updates` ADD CONSTRAINT `complaint_progress_updates_complaintId_fkey` FOREIGN KEY (`complaintId`) REFERENCES `complaints`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `complaint_progress_updates` ADD CONSTRAINT `complaint_progress_updates_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
