-- v4 FR-BK-04: a multiple search is "confirmed" once its rows became buyers, before the quick screen is paid for.
ALTER TABLE public.bulk_searches DROP CONSTRAINT IF EXISTS bulk_searches_status_check;
ALTER TABLE public.bulk_searches ADD CONSTRAINT bulk_searches_status_check
  CHECK (status IN ('ready', 'confirmed', 'screening', 'screened', 'deep_running', 'done'));
ALTER TABLE public.bulk_searches ADD COLUMN IF NOT EXISTS screen_codes text[] NOT NULL DEFAULT '{}';
