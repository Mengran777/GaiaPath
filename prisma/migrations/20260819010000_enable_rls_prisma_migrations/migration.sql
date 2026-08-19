-- Prisma's own migration bookkeeping table also lives in the public schema
-- and gets flagged by Supabase's Security Advisor. It holds only migration
-- names/checksums (no user data); enabling RLS here is safe and does not
-- affect Prisma, which connects via the BYPASSRLS `postgres` role.

ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
