-- Company CIBIL needs the company PAN and date of incorporation; personal CIBIL needs the owner's PAN and date of
-- birth. Both are kept together as one encrypted JSON value instead of a single PAN and date.
ALTER TABLE app_private.consent_private DROP COLUMN pan_ciphertext, DROP COLUMN dob_ciphertext,
  ADD COLUMN bureau_ciphertext text;  -- {companyPan, incorporatedOn, personalPan, birthDate}
