-- CreateTable
CREATE TABLE "organization" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_credential" (
    "id" TEXT NOT NULL,
    "identity_id" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,

    CONSTRAINT "password_credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "identity_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_token" (
    "id" TEXT NOT NULL,
    "identity_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "password_reset_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,

    CONSTRAINT "company_pkey" PRIMARY KEY ("organization_id","id")
);

-- CreateTable
CREATE TABLE "business_scope" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,

    CONSTRAINT "business_scope_pkey" PRIMARY KEY ("organization_id","id")
);

-- CreateTable
CREATE TABLE "email_outbox" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "payload" TEXT NOT NULL,

    CONSTRAINT "email_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "identity_email_key" ON "identity"("email");

-- CreateIndex
CREATE UNIQUE INDEX "password_credential_identity_id_key" ON "password_credential"("identity_id");

-- AddForeignKey
ALTER TABLE "password_credential" ADD CONSTRAINT "password_credential_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_token" ADD CONSTRAINT "password_reset_token_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "company_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_scope" ADD CONSTRAINT "business_scope_organization_id_company_id_fkey" FOREIGN KEY ("organization_id", "company_id") REFERENCES "company"("organization_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_scope" ADD CONSTRAINT "business_scope_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS Configuration
ALTER TABLE "organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "organization" FOR ALL USING (id = current_setting('app.current_org_id', true));

ALTER TABLE "company" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "company" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "company" FOR ALL USING (organization_id = current_setting('app.current_org_id', true));

ALTER TABLE "business_scope" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "business_scope" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "business_scope" FOR ALL USING (organization_id = current_setting('app.current_org_id', true));

ALTER TABLE "email_outbox" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_outbox" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "email_outbox" FOR ALL USING (organization_id = current_setting('app.current_org_id', true));

ALTER TABLE "evidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "evidence" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "evidence" FOR ALL USING (organization_id = current_setting('app.current_org_id', true));
