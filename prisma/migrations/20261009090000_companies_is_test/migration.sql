-- Rows created from MOCK providers are flagged so live searches never return them and
-- they can be cleaned up safely (PRD §18 "Data truth").
ALTER TABLE companies ADD COLUMN is_test boolean NOT NULL DEFAULT false;
CREATE INDEX companies_is_test_idx ON companies(is_test) WHERE is_test;
