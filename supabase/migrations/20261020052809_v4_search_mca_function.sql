-- v4 FR-SR-04: MCA name search in one round trip. word_similarity >= 0.3 through the trigram index (the threshold is
-- set for the current transaction only), best match first, then Active first. Called by the server only.
CREATE OR REPLACE FUNCTION app_private.search_mca(q text, p_state text, p_active_only boolean, p_city text, p_limit int DEFAULT 50)
RETURNS TABLE (cin text, name text, status text, class text, category text, state text, city text, registration_date date,
               dataset_date date, score real)
LANGUAGE plpgsql VOLATILE
SET search_path = ''
AS $$
BEGIN
  PERFORM set_config('pg_trgm.word_similarity_threshold', '0.3', true);
  RETURN QUERY
  SELECT m.cin, m.name, m.status, m.class, m.category, m.state, m.city, m.registration_date, m.dataset_date,
         extensions.word_similarity(q, m.name_norm) AS score
    FROM public.mca_companies m
   WHERE q OPERATOR(extensions.<%) m.name_norm
     AND (p_state IS NULL OR m.state = p_state)
     AND (NOT p_active_only OR m.status = 'Active')
     AND (p_city IS NULL OR lower(coalesce(m.city, '') || ' ' || coalesce(m.address, '')) LIKE '%' || p_city || '%')
   ORDER BY 10 DESC, (m.status = 'Active') DESC, extensions.similarity(q, m.name_norm) DESC, m.name
   LIMIT least(greatest(p_limit, 1), 50);
END;
$$;
REVOKE ALL ON FUNCTION app_private.search_mca(text, text, boolean, text, int) FROM PUBLIC, anon, authenticated;
