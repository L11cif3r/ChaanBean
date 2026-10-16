-- check_items.raw_ref holds the RawResponseStore reference ("raw-responses/<path>"), which is text, not a uuid.
ALTER TABLE public.check_items ALTER COLUMN raw_ref TYPE text USING raw_ref::text;
