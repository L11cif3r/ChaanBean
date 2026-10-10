-- DEV ONLY (local throwaway Postgres): seeds the organisation/user that COLLECT_DEV_* point at, so the dev-auth
-- bypass has real rows to satisfy foreign keys. Never run against a shared or production database.
INSERT INTO auth.users (id) VALUES ('00000000-0000-4000-8000-0000000000a1') ON CONFLICT DO NOTHING;
INSERT INTO organisations (id, legal_name, kyc_status)
VALUES ('00000000-0000-4000-8000-0000000c0111', 'ChaanBean Demo Traders (local dev)', 'VERIFIED') ON CONFLICT DO NOTHING;
-- A second organisation, used to demonstrate cross-tenant isolation.
INSERT INTO organisations (id, legal_name, kyc_status)
VALUES ('00000000-0000-4000-8000-0000000c0222', 'Other Org (local dev)', 'VERIFIED') ON CONFLICT DO NOTHING;
