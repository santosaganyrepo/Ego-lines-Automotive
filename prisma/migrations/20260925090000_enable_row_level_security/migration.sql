-- Row Level Security on every application table (SECURITY.MD §8.3, §2.2).
--
-- Why: Supabase publishes the `public` schema through its REST API, reachable
-- with the publishable key that every browser receives. Today that path is
-- already closed — the `anon` and `authenticated` roles hold no privileges on
-- this schema — but that rests on a single control: one GRANT (for instance a
-- table created from the Supabase dashboard, which grants by default) would
-- expose customers, orders and payments to anyone. With RLS on and no policy,
-- those roles are refused every row even if a privilege reappears.
--
-- Why this cannot affect the application: every query runs through Prisma as
-- the table owner (`postgres`), which holds BYPASSRLS, and RLS is not FORCEd,
-- so the owner is exempt either way. No policies are created on purpose: the
-- browser never talks to these tables, so the correct policy for its roles is
-- "nothing".
--
-- Additive and data-neutral: no row, column or constraint changes. Reversible
-- with `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` should that ever be needed.
-- A table added later must enable RLS in its own migration — `npm run db:check`
-- fails until it does.
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

-- Re-asserted rather than assumed: the browser-facing roles get nothing on
-- this schema. Revoking a privilege that is not held is a no-op.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
REVOKE USAGE ON SCHEMA public FROM anon, authenticated;
