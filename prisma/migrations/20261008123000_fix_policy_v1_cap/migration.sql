-- Policy v1 cap is ₹5 crore (PRD §9.2): 5,000,000,000 paise. The seed in the previous migration had ₹50 crore.
UPDATE credit_policies
SET params = jsonb_set(params, '{max_limit_paise}', '5000000000'::jsonb)
WHERE version = 1;
