-- Development object store for src/server/storage, reached only through the server's database connection
-- (app_private is not exposed by the API and has no grants for signed-in users). Production evidence moves to S3 with
-- Object Lock (PRD FR-TX-06); raw provider responses are kept encrypted (FR-CW-07) and deleted after retention (10.4).

CREATE TABLE app_private.stored_objects (
  bucket       text NOT NULL CHECK (bucket IN ('evidence', 'raw-responses')),
  path         text NOT NULL CHECK (char_length(path) BETWEEN 1 AND 512),
  content_type text NOT NULL,
  bytes        bytea NOT NULL,
  sha256       text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket, path)
);

ALTER TABLE app_private.stored_objects ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.stored_objects FROM PUBLIC, anon, authenticated;

-- Stored objects never change. Evidence can only be deleted by retention clean-up, which must say so explicitly in its
-- transaction: SELECT set_config('app.retention_delete', 'on', true).
CREATE FUNCTION app_private.stored_objects_guard() RETURNS trigger
  LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'stored objects are write-once' USING ERRCODE = 'P0001';
  END IF;
  IF OLD.bucket = 'evidence' AND coalesce(current_setting('app.retention_delete', true), '') <> 'on' THEN
    RAISE EXCEPTION 'evidence can only be deleted by retention clean-up' USING ERRCODE = 'P0001';
  END IF;
  RETURN OLD;
END $$;

CREATE TRIGGER stored_objects_guard BEFORE UPDATE OR DELETE ON app_private.stored_objects
  FOR EACH ROW EXECUTE FUNCTION app_private.stored_objects_guard();
