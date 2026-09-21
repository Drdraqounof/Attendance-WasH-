WashCycle Attendance SMS Integration
Client Overview

Status (2026-09-20): Waiting on WashCycle to provide Zoom account/API access. See section 7 for the specific items needed. No integration work (webhook endpoint, phone-number matching, etc.) has started — the "SMS" source value already in the app's data model is a placeholder for this work, not a sign it's built.

This proposal is one piece of the broader plan in [docs/planning/2026-09-20-attendance-data-integration-management-plan.md](../planning/2026-09-20-attendance-data-integration-management-plan.md), which also covers historical Excel import, Zoho Shifts, and role-based access.

1. Current Process
WashCycle currently uses an SMS phone number through Zoom for attendance notifications.
When a worker is going to be late, they send a text message to the designated number explaining the reason for their lateness.
For example:
“I’m going to be 15 minutes late because of traffic.”
Currently, this information is handled through the existing SMS process.
2. Proposed Application Integration
The goal is to connect the existing SMS attendance process with the WashCycle attendance application.
Workers would continue using the same SMS process they already know. The difference is that incoming messages could be automatically received and recorded by the attendance application.
Proposed Flow
Worker → Existing Zoom SMS Number → Application → Attendance System → Manager Dashboard
The application could:
Identify the worker based on their phone number
Record the date and time the message was received
Save the worker's attendance notification
Record the worker's stated reason for being late
Associate the message with the worker's scheduled shift
Mark the attendance record as late
Apply the appropriate attendance points based on WashCycle's attendance policy
Display the information to managers through the attendance dashboard
3. Example
A worker is scheduled for a 9:00 AM shift.
At 8:55 AM, they text the existing Zoom SMS number:
“I will be about 15 minutes late because of traffic.”
The application could automatically create an attendance record:
Field
Example
Worker
John Smith
Scheduled Start
9:00 AM
Notification Time
8:55 AM
Status
Late
Expected Delay
15 minutes
Reason
Traffic
Attendance Points
Based on policy

A manager could then see this information in the attendance application.
4. Automated Response
The system could optionally send an automatic confirmation to the worker after their message is received.
Example:
“Your attendance notification has been received and recorded for today's shift.”
This would allow workers to know that their notification was successfully received without requiring a manager to respond manually.
5. Attendance Point System
The SMS information could also be connected to WashCycle's attendance point system.
For example, the application could use information such as:
Scheduled shift time
Actual/expected arrival time
Number of minutes late
Whether the worker notified the organization
Reason provided
Previous attendance records
WashCycle's attendance policy
The application would then record the appropriate attendance event and allow the manager to review it.
Important: The exact point values and rules would be determined by WashCycle's approved attendance policy.
6. Zoom Integration
The recommended approach is to investigate connecting directly to the existing Zoom Phone/SMS account rather than immediately embedding a Zoom phone interface into the application.
The integration would allow the application to communicate with the existing SMS system through Zoom's available APIs and webhooks, if the current Zoom account and phone number support the required functionality.
Smart Embed
Zoom Phone Smart Embed is another option. It can allow Zoom Phone functionality to appear inside a web application.
However, Smart Embed is primarily useful if WashCycle wants managers to interact with Zoom Phone/SMS directly from inside the attendance application.
For the initial attendance automation, the primary requirement is:
Access to the existing Zoom Phone SMS number + appropriate API/webhook functionality.
Smart Embed could potentially be considered as a later feature.
7. What We Need From WashCycle
Before development begins, we would need to confirm the following:
The Zoom account currently associated with the attendance SMS number
The phone number being used for worker attendance notifications
Whether Zoom Phone SMS is enabled for that number
Appropriate Zoom administrator/developer access
Whether the account permits the required API and webhook functionality
The current attendance policy and point rules
The information managers need to see on the attendance dashboard
8. Proposed System
The overall system could eventually look like:
Worker
↓
Existing Zoom SMS Number
↓
Zoom Phone / SMS Integration
↓
WashCycle Application Backend
↓
Worker Identification + Message Processing
↓
Attendance Database
↓
Attendance & Point System
↓
Manager Dashboard
9. Goal
The purpose of this integration is not to change the way workers report lateness.
Instead, the goal is to connect WashCycle's existing SMS attendance process to the application so that information can be captured, organized, and made available to managers automatically.
This can reduce manual data entry while providing a centralized attendance history for review.

