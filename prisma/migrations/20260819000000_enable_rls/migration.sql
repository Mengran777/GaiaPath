-- Enable Row Level Security on all public tables.
-- The app connects via the Supabase `postgres` role (BYPASSRLS), so this
-- does not affect Prisma queries; it only blocks the public PostgREST API
-- (anon/authenticated roles), which this app does not use.

ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."trips" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."favorite_routes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."points_of_interest" ENABLE ROW LEVEL SECURITY;
