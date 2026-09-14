CREATE TYPE "public"."notification_status" AS ENUM('unread', 'read');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"warning_id" integer NOT NULL,
	"threshold_key" text NOT NULL,
	"points_at_trigger" integer NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"severity" "alert_severity" NOT NULL,
	"status" "notification_status" DEFAULT 'unread' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_warning_id_warnings_id_fk" FOREIGN KEY ("warning_id") REFERENCES "public"."warnings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_threshold_key_policy_thresholds_key_fk" FOREIGN KEY ("threshold_key") REFERENCES "public"."policy_thresholds"("key") ON DELETE no action ON UPDATE no action;