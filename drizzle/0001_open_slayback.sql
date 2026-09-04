CREATE TYPE "public"."warning_status" AS ENUM('open', 'acknowledged', 'resolved');--> statement-breakpoint
CREATE TABLE "policy_thresholds" (
	"key" text PRIMARY KEY NOT NULL,
	"point_value" integer NOT NULL,
	"label" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warnings" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"threshold_key" text NOT NULL,
	"points_at_trigger" integer NOT NULL,
	"status" "warning_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "policy_cap" SET DEFAULT 16;--> statement-breakpoint
ALTER TABLE "point_events" ADD COLUMN "rule_code" text;--> statement-breakpoint
ALTER TABLE "point_rules" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "point_rules" ADD COLUMN "points" integer;--> statement-breakpoint
ALTER TABLE "point_rules" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "warnings" ADD CONSTRAINT "warnings_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warnings" ADD CONSTRAINT "warnings_threshold_key_policy_thresholds_key_fk" FOREIGN KEY ("threshold_key") REFERENCES "public"."policy_thresholds"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_rules" ADD CONSTRAINT "point_rules_code_unique" UNIQUE("code");