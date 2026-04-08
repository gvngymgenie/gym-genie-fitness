CREATE TABLE "revenue_summary" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" text NOT NULL,
	"total_revenue" integer DEFAULT 0 NOT NULL,
	"membership_revenue" integer DEFAULT 0 NOT NULL,
	"renewal_revenue" integer DEFAULT 0 NOT NULL,
	"merchandise_revenue" integer DEFAULT 0 NOT NULL,
	"service_revenue" integer DEFAULT 0 NOT NULL,
	"other_revenue" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "revenue_summary_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "revenue_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" text NOT NULL,
	"amount" integer NOT NULL,
	"source_type" text NOT NULL,
	"source_id" varchar,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "avatar_static_url" text;