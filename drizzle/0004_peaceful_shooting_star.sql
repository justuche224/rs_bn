ALTER TABLE "user" DROP CONSTRAINT "user_normalized_email_unique";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "normalized_email";