# Security checkpoint - 2026-11-03

Code: ProtectedRoute validates Supabase Auth and loads the linked employee profile.
Code: Sidebar signs out the current Supabase session.
Build passed; login and logout tested.

Applied manually in Supabase:
- Revoked TRUNCATE, TRIGGER, REFERENCES on users and user_branches from anon, authenticated and PUBLIC.
- Revoked all table privileges on user_branches from anon and PUBLIC.
- Removed four unrestricted user_branches policies.
- Restricted users INSERT and UPDATE policies to authenticated admins.
- Removed technical_manager from clients, samples and tests UPDATE policies.
- Removed four unrestricted test_results policies.

Pending: sample_tests policy removal is NOT confirmed.
Next: remaining broad policies, deny tests, branch/task isolation, secure login lookup and public approval flows.
Also pending: central report storage and exact SQL migrations.
Security review is incomplete. This file is a record, not a migration.
