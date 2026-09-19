-- Web Push for the admin dashboard: one row per device an administrator has
-- switched notifications on for, and a site-wide switch for the push channel.
-- Additive: one new table and one column with a default. No existing row changes.
-- AlterTable
ALTER TABLE "BusinessSettings" ADD COLUMN     "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "AdminPushSubscription" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "adminSessionId" TEXT,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "deviceLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSuccessAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AdminPushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminPushSubscription_endpoint_key" ON "AdminPushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "AdminPushSubscription_adminId_idx" ON "AdminPushSubscription"("adminId");

-- CreateIndex
CREATE INDEX "AdminPushSubscription_adminSessionId_idx" ON "AdminPushSubscription"("adminSessionId");

-- AddForeignKey
ALTER TABLE "AdminPushSubscription" ADD CONSTRAINT "AdminPushSubscription_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminPushSubscription" ADD CONSTRAINT "AdminPushSubscription_adminSessionId_fkey" FOREIGN KEY ("adminSessionId") REFERENCES "AdminSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Bounds matching the Zod schema in push.schema.ts. A real endpoint is a few
-- hundred characters; the keys are fixed-length base64url.
ALTER TABLE "AdminPushSubscription" ADD CONSTRAINT "AdminPushSubscription_shape_check"
  CHECK (
    char_length("endpoint") BETWEEN 1 AND 1024
    AND "endpoint" LIKE 'https://%'
    AND char_length("p256dh") BETWEEN 80 AND 100
    AND char_length("auth") BETWEEN 16 AND 32
    AND "failureCount" >= 0
  );

-- The subscription keys are delivery credentials: locked away from Supabase's
-- REST API like every other table (migration 20260925090000).
ALTER TABLE "AdminPushSubscription" ENABLE ROW LEVEL SECURITY;
