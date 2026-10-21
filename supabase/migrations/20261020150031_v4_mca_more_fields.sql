-- MCA master data fields shown in the Company section of the report: sub-category, listed or not, Indian or foreign
-- company, and the NIC industry code (often blank in the dataset).
ALTER TABLE public.mca_companies
  ADD COLUMN sub_category text,
  ADD COLUMN listing_status text,
  ADD COLUMN origin text,
  ADD COLUMN nic_code text;
