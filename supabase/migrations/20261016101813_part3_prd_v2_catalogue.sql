-- Item catalogue and plans for the ChaanBean High Level PRD v2.0 (15 Oct 2026, sections 2, 4 and 10).
--
-- Credit Worthiness keeps six checks: GST search, GST turnover (current year or last 4 years), CIBIL (company or
-- personal), Company check, Director details and Credit rating. Removed items are made inactive, not deleted, so
-- ledger rows and invoices that name them still read correctly; place_hold refuses inactive items.
--
-- Placeholders until Mohan answers: GST turnover current year has no price, so it cannot be charged yet (NO_PRICE);
-- the 12 / 30 CIBIL units are given to company and personal CIBIL each (v2.0 "company or personal, each");
-- "Add New Unregistered Customer" (₹10, deck row 55) is not in the v2.0 price list, so adding a buyer is free.

-- ---------------------------------------------------------------- items

UPDATE public.billing_items SET active = false
 WHERE code IN ('CW_PAN', 'CW_COMPANY_MASTER', 'CW_MSME', 'CW_FINANCIALS', 'CW_IEC_TURNOVER', 'CW_IEC_PROFILE',
                'CW_COMPANY_COMPREHENSIVE', 'CW_MOBILE_PAN', 'CW_MOBILE_ADDRESS', 'CW_PAN_CONTACT', 'CW_BUREAU',
                'CP_UNREGISTERED');

UPDATE public.billing_items b SET name = n.name, sort = n.sort
  FROM (VALUES
    ('CW_GST_SEARCH',    'GST search',                     10),
    ('CW_GST_TURNOVER',  'GST turnover, last 4 years',     30),
    ('CW_COMPANY',       'Company check',                  60),
    ('CW_DIRECTOR',      'Director details',               70),
    ('CW_CREDIT_RATING', 'Credit rating',                  80),
    ('CC_COURT',         'Court case history',            100),
    ('CC_FIR',           'FIR check',                     110),
    ('CC_AML',           'Money laundering check',        120),
    ('BS_SELLER_TX',     'Seller-initiated agreement',    200),
    ('BS_BUYER_TX',      'Buyer-initiated agreement',     210),
    ('BS_LENDER_TX',     'Lender agreement',              220),
    ('BS_SETTLEMENT',    'E-Settlement agreement',        230),
    ('USR_SEAT',         'Extra team user',               300)
  ) AS n (code, name, sort)
 WHERE b.code = n.code;

INSERT INTO public.billing_items (code, name, deck_row, sort) VALUES
  ('CW_GST_TURNOVER_CY', 'GST turnover, current year', NULL, 20),
  ('CW_CIBIL_COMPANY',   'CIBIL report, company',      25,   40),
  ('CW_CIBIL_PERSONAL',  'CIBIL report, personal',     25,   50);

-- Prices exclude GST. GST turnover current year gets its price once Mohan sets it (v2.0 open point 1).
INSERT INTO public.item_prices (item_code, price_paise, effective_from) VALUES
  ('CW_CIBIL_COMPANY',  38900, now()),
  ('CW_CIBIL_PERSONAL', 38900, now());

-- ---------------------------------------------------------------- plans (version 2, same prices, period and seats)

INSERT INTO public.plan_versions (plan_code, version, price_paise, period_months, seats, effective_from) VALUES
  ('plan_a', 2, 1159900, 12, 3, now()),
  ('plan_b', 2, 1759900, 12, 5, now());

INSERT INTO public.plan_version_items (plan_version_id, item_code, quantity)
SELECT v.id, q.code, CASE v.plan_code WHEN 'plan_a' THEN q.a ELSE q.b END
FROM public.plan_versions v
CROSS JOIN (VALUES
  ('CW_GST_SEARCH', 30, 101), ('CW_GST_TURNOVER', 15, 42), ('CW_CIBIL_COMPANY', 12, 30),
  ('CW_CIBIL_PERSONAL', 12, 30), ('CW_COMPANY', 0, 40), ('CW_DIRECTOR', 15, 15), ('CC_COURT', 11, 21),
  ('BS_SETTLEMENT', 5, 5)
) AS q (code, a, b)
WHERE v.version = 2 AND CASE v.plan_code WHEN 'plan_a' THEN q.a ELSE q.b END > 0;
