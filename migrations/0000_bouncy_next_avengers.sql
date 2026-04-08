CREATE TABLE "attendance" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" varchar NOT NULL,
	"member_name" text NOT NULL,
	"date" text NOT NULL,
	"check_in_time" text NOT NULL,
	"method" text DEFAULT 'Manual' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bmi_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" varchar NOT NULL,
	"record_date" text NOT NULL,
	"body_weight" real,
	"bmi" real,
	"body_fat_percentage" real,
	"muscle_mass" real,
	"body_water_percentage" real,
	"bone_mass" real,
	"visceral_fat" real,
	"subcutaneous_fat" real,
	"bmr" real,
	"protein_percentage" real,
	"metabolic_age" integer,
	"lean_body_mass" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"phone" text,
	"contact_person" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" text DEFAULT 'Lime Fitness' NOT NULL,
	"address" text,
	"phone" text,
	"email" text,
	"logo" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diet_plan_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"diet_plan_id" varchar NOT NULL,
	"member_id" varchar NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diet_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" varchar,
	"meal" text NOT NULL,
	"foods" jsonb NOT NULL,
	"calories" integer NOT NULL,
	"protein" integer NOT NULL,
	"carbs" integer NOT NULL,
	"fat" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"price" integer NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"purchase_date" text,
	"needs_service" boolean DEFAULT false NOT NULL,
	"next_service_date" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text,
	"email" text,
	"phone" text NOT NULL,
	"address" text,
	"gender" text DEFAULT 'male' NOT NULL,
	"interest_area" text,
	"health_background" text,
	"source" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"assigned_staff" text,
	"follow_up_date" text,
	"dob" text,
	"height" integer,
	"notes" text,
	"follow_up_completed" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"branch" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_measurements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" varchar NOT NULL,
	"date" text NOT NULL,
	"chest" real NOT NULL,
	"waist" real NOT NULL,
	"arms" real NOT NULL,
	"thighs" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_otps" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"otp" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text,
	"email" text,
	"phone" text NOT NULL,
	"address" text,
	"gender" text DEFAULT 'male' NOT NULL,
	"dob" text,
	"height" integer,
	"source" text NOT NULL,
	"interest_area" text,
	"health_background" text,
	"plan" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"discount" integer DEFAULT 0,
	"total_due" integer DEFAULT 0,
	"amount_paid" integer DEFAULT 0,
	"payment_method" text,
	"assigned_staff" text,
	"status" text DEFAULT 'Active' NOT NULL,
	"avatar" text,
	"branch" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"duration" text NOT NULL,
	"duration_months" integer NOT NULL,
	"price" integer NOT NULL,
	"features" text[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" varchar,
	"user_id" varchar,
	"member_id" varchar,
	"fcm_token" text,
	"status" text DEFAULT 'sent' NOT NULL,
	"delivered_at" timestamp,
	"clicked_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"member_id" varchar,
	"category_workouts" boolean DEFAULT true NOT NULL,
	"category_diet" boolean DEFAULT true NOT NULL,
	"category_otp" boolean DEFAULT true NOT NULL,
	"category_announcements" boolean DEFAULT true NOT NULL,
	"category_promotions" boolean DEFAULT false NOT NULL,
	"quiet_hours_start" text DEFAULT '21:00',
	"quiet_hours_end" text DEFAULT '07:00',
	"frequency_digest" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"title_template" text NOT NULL,
	"body_template" text NOT NULL,
	"icon" text DEFAULT '/icon-192.svg',
	"badge" text DEFAULT '/icon-192.svg',
	"require_interaction" boolean DEFAULT false NOT NULL,
	"silent" boolean DEFAULT false NOT NULL,
	"url" text,
	"variables" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message" text NOT NULL,
	"date" text NOT NULL,
	"sent_to" text NOT NULL,
	"sent_to_type" text NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"delivery_status" text DEFAULT 'delivered' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"member_id" varchar,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar,
	"user_id" varchar,
	"member_id" varchar,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"icon" text,
	"badge" text,
	"url" text,
	"data" jsonb,
	"scheduled_for" timestamp NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_retry_at" timestamp,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trainer_availability" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" varchar NOT NULL,
	"slot_date" text NOT NULL,
	"period" text NOT NULL,
	"slot_capacity" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trainer_bookings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" varchar NOT NULL,
	"member_id" varchar NOT NULL,
	"booking_date" text NOT NULL,
	"period" text DEFAULT 'morning' NOT NULL,
	"slot_number" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trainer_feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" varchar NOT NULL,
	"member_id" varchar NOT NULL,
	"booking_id" varchar,
	"rating" integer NOT NULL,
	"comments" text,
	"submitted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trainer_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" varchar NOT NULL,
	"specializations" text[] NOT NULL,
	"weekly_slot_capacity" integer DEFAULT 20 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trainer_profiles_trainer_id_unique" UNIQUE("trainer_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text,
	"phone" text,
	"role" text DEFAULT 'member' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workout_program_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" varchar NOT NULL,
	"member_id" varchar NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_programs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" varchar,
	"day" text NOT NULL,
	"name" text NOT NULL,
	"difficulty" text DEFAULT 'Intermediate' NOT NULL,
	"exercises" jsonb NOT NULL,
	"duration" integer NOT NULL,
	"equipment" jsonb NOT NULL,
	"intensity" integer DEFAULT 5 NOT NULL,
	"goal" text DEFAULT 'Hypertrophy',
	"created_at" timestamp DEFAULT now() NOT NULL
);
