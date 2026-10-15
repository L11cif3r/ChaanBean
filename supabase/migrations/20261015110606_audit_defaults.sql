-- seq, prev_hash and row_hash are always set by the audit_log_chain trigger. Defaults make them optional for callers
-- (and in the generated types); whatever a caller passes is overwritten.
ALTER TABLE public.audit_log
  ALTER COLUMN seq SET DEFAULT 0,
  ALTER COLUMN prev_hash SET DEFAULT '',
  ALTER COLUMN row_hash SET DEFAULT '';
