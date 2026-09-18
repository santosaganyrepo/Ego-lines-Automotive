-- The business was renamed to EGO-Lines Automotive. This only changes the
-- default a brand-new settings row is created with; the live name is whatever
-- an administrator has saved in Settings, and no existing row is touched.
ALTER TABLE "BusinessSettings" ALTER COLUMN "businessName" SET DEFAULT 'EGO-Lines Automotive';
