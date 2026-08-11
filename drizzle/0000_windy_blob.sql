CREATE TYPE "public"."alert_severity" AS ENUM('critical', 'warning');--> statement-breakpoint
CREATE TYPE "public"."point_rule_category" AS ENUM('positive', 'deduction');--> statement-breakpoint
CREATE TYPE "public"."point_source" AS ENUM('SMS', 'Policy', 'Supervisor');--> statement-breakpoint
CREATE TYPE "public"."schedule_status" AS ENUM('scheduled', 'worked', 'late', 'absent', 'early_out', 'off');--> statement-breakpoint
CREATE TABLE "attendance_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"issue" text NOT NULL,
	"detail" text NOT NULL,
	"attendance_score" double precision NOT NULL,
	"recommended_action" text NOT NULL,
	"severity" "alert_severity" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_toggles" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"default_on" boolean DEFAULT false NOT NULL,
	"locked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_code" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"team" text NOT NULL,
	"hire_date" date NOT NULL,
	"phone_masked" text NOT NULL,
	"policy_cap" integer DEFAULT 12 NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"last_signal" text NOT NULL,
	"last_signal_ago" text NOT NULL,
	"suggested_action" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_employee_code_unique" UNIQUE("employee_code")
);
--> statement-breakpoint
CREATE TABLE "managers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"email" text NOT NULL,
	"phone_masked" text NOT NULL,
	"floor" text NOT NULL,
	"joined" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "managers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "point_events" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"date" date NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"source" "point_source" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "point_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" "point_rule_category" NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_days" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"date" date NOT NULL,
	"weekday" text NOT NULL,
	"shift" text NOT NULL,
	"status" "schedule_status" NOT NULL,
	"note" text
);
--> statement-breakpoint
ALTER TABLE "attendance_alerts" ADD CONSTRAINT "attendance_alerts_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_events" ADD CONSTRAINT "point_events_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_days" ADD CONSTRAINT "schedule_days_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;