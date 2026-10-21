-- PRD v4.0: values used by the next migration (enum values must be committed before they are used).
ALTER TYPE public.check_request_status ADD VALUE IF NOT EXISTS 'pending_start';   -- inside the cancel window (v4 section 8)
ALTER TYPE public.check_request_status ADD VALUE IF NOT EXISTS 'cancelled';       -- cancelled in the window, nothing charged
ALTER TYPE public.counterparty_type ADD VALUE IF NOT EXISTS 'business_cin';       -- a company or LLP picked from MCA records, no GSTIN yet
