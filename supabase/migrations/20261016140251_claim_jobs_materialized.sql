-- Job claims must never exceed p_max. The Part 1 version used `WHERE id IN (SELECT … LIMIT … FOR UPDATE SKIP LOCKED)`,
-- and Postgres may run that subquery more than once inside the UPDATE, so one worker could claim more jobs than asked
-- (seen on 16 Oct: one of three workers asking for 3 got all 6). Picking the rows once in a MATERIALIZED CTE and then
-- updating exactly those rows keeps the limit and the SKIP LOCKED behaviour.

CREATE OR REPLACE FUNCTION public.claim_jobs(p_worker text, p_max int DEFAULT 10, p_kinds text[] DEFAULT NULL)
  RETURNS SETOF public.jobs
  LANGUAGE sql SET search_path = '' AS $$
  WITH picked AS MATERIALIZED (
    SELECT id FROM public.jobs
     WHERE status = 'queued' AND run_at <= now() AND (p_kinds IS NULL OR kind = ANY (p_kinds))
     ORDER BY run_at
     LIMIT greatest(1, least(p_max, 100))
     FOR UPDATE SKIP LOCKED
  )
  UPDATE public.jobs j
     SET status = 'running', locked_at = now(), locked_by = p_worker, attempts = j.attempts + 1
    FROM picked
   WHERE j.id = picked.id
  RETURNING j.*
$$;
