/*
  Warnings:

  - Added the required column `access_status` to the `organization` table without a default value. This is not possible if the table is not empty.
  - Added the required column `commercial_status` to the `organization` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `organization` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `organization` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrganizationAccessStatus" AS ENUM ('PROVISIONING', 'ACTIVE', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "OrganizationCommercialStatus" AS ENUM ('DEMO', 'PILOT', 'ACTIVE');

-- AlterTable
ALTER TABLE "evidence" ADD COLUMN     "after" JSONB,
ADD COLUMN     "before" JSONB,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "reason" TEXT;

-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "access_status" "OrganizationAccessStatus" NOT NULL,
ADD COLUMN     "commercial_status" "OrganizationCommercialStatus" NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;
