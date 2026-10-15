-- The onboarding lookup table also keeps PAN verifications (S02 PAN path), so it is renamed and gets a kind.
ALTER TABLE app_private.gst_lookups RENAME TO identity_lookups;
ALTER TABLE app_private.identity_lookups RENAME COLUMN gstin TO identifier;
ALTER TABLE app_private.identity_lookups ADD COLUMN kind text NOT NULL DEFAULT 'gstin' CHECK (kind IN ('gstin', 'pan'));
ALTER INDEX app_private.gst_lookups_requested_by_idx RENAME TO identity_lookups_requested_by_idx;
