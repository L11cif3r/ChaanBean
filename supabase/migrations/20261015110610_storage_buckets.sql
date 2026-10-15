-- Private buckets for development storage (src/server/storage). No storage policies are created, so only the server
-- (secret key) can read or write them. Production evidence moves to S3 Object Lock.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('evidence', 'evidence', false, 26214400, ARRAY['application/pdf', 'application/zip', 'image/png', 'image/jpeg']),
  ('raw-responses', 'raw-responses', false, 5242880, ARRAY['text/plain'])
ON CONFLICT (id) DO NOTHING;
