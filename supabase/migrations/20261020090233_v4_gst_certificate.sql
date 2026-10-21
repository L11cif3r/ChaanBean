-- GSTN Registration Certificate (API Setu): the organisation's own GST certificate, fetched with an OTP to its primary
-- authorised signatory and kept as a write-once stored file.
ALTER TABLE public.organisations
  ADD COLUMN gst_certificate_ref text,
  ADD COLUMN gst_certificate_at timestamptz;
