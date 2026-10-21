-- v4 FR-CC-04: Case Check can run for many buyers from a multiple search (deep check step). It is its own request
-- (tab case_check), next to the Credit Worthiness deep check of the same row.
ALTER TABLE public.bulk_rows ADD COLUMN case_request_id uuid REFERENCES public.check_requests (id) ON DELETE SET NULL;
CREATE INDEX bulk_rows_case_idx ON public.bulk_rows (case_request_id);
GRANT SELECT (case_request_id) ON public.bulk_rows TO authenticated;
