ALTER TABLE "user" ALTER COLUMN "kyc_verified" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "kyc_verified" DROP NOT NULL;