-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "BusinessScopeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "BusinessScopeType" AS ENUM ('RESTAURANT', 'PROPERTY_DEVELOPMENT', 'CONSTRUCTION', 'EVENT');

-- CreateEnum
CREATE TYPE "OrganizationMemberStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REMOVED');

-- CreateEnum
CREATE TYPE "ownership_transfer_proposal_status" AS ENUM ('PENDING', 'ACCEPTED', 'CANCELLED', 'EXPIRED');

-- AlterTable
ALTER TABLE "business_scope" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "created_by_id" TEXT NOT NULL,
ADD COLUMN     "external_id" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "location" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "responsible_person" TEXT,
ADD COLUMN     "status" "BusinessScopeStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "type" "BusinessScopeType" NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "company" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "organization_invitation" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "role" TEXT,
    "grants" JSONB,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_member" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "identity_id" TEXT NOT NULL,
    "status" "OrganizationMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "role" TEXT NOT NULL,
    "grants" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ownership_transfer_proposal" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "proposer_id" TEXT NOT NULL,
    "successor_id" TEXT NOT NULL,
    "status" "ownership_transfer_proposal_status" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ownership_transfer_proposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_invitation_token_hash_key" ON "organization_invitation"("token_hash");

-- CreateIndex
CREATE INDEX "organization_invitation_token_hash_idx" ON "organization_invitation"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "organization_member_organization_id_identity_id_key" ON "organization_member"("organization_id", "identity_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_scope_company_id_type_name_external_id_key" ON "business_scope"("company_id", "type", "name", "external_id");

-- AddForeignKey
ALTER TABLE "business_scope" ADD CONSTRAINT "business_scope_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_invitation" ADD CONSTRAINT "organization_invitation_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ownership_transfer_proposal" ADD CONSTRAINT "ownership_transfer_proposal_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ownership_transfer_proposal" ADD CONSTRAINT "ownership_transfer_proposal_proposer_id_fkey" FOREIGN KEY ("proposer_id") REFERENCES "organization_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ownership_transfer_proposal" ADD CONSTRAINT "ownership_transfer_proposal_successor_id_fkey" FOREIGN KEY ("successor_id") REFERENCES "organization_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organization_invitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_invitation" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "organization_invitation" FOR ALL USING (organization_id = current_setting('app.current_org_id', true));

ALTER TABLE "organization_member" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_member" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "organization_member" FOR ALL USING (organization_id = current_setting('app.current_org_id', true));

ALTER TABLE "ownership_transfer_proposal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ownership_transfer_proposal" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ownership_transfer_proposal" FOR ALL USING (organization_id = current_setting('app.current_org_id', true));
