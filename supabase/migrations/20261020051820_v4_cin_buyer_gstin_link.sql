-- v4 FR-SR-06: a company picked from MCA records (business_cin) gets its GSTIN linked when one is found later.
ALTER TABLE public.counterparties DROP CONSTRAINT IF EXISTS counterparties_check;
ALTER TABLE public.counterparties ADD CONSTRAINT counterparties_gstin_type_check
  CHECK (CASE type WHEN 'business_gstin' THEN gstin IS NOT NULL WHEN 'business_cin' THEN true ELSE gstin IS NULL END);
