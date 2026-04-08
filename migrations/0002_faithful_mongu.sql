ALTER TABLE "leads" RENAME COLUMN "interest_area" TO "interest_areas";--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "trainer_id" varchar;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "interest_areas" text[] DEFAULT ARRAY[]::TEXT[] NOT NULL;--> statement-breakpoint
ALTER TABLE "trainer_profiles" ADD COLUMN "interest_areas" text[] DEFAULT ARRAY[]::TEXT[] NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "interest_area";