-- Add 'header_image_dark' to the allowed types in system_texts check constraint
ALTER TABLE system_texts DROP CONSTRAINT system_texts_type_check;

ALTER TABLE system_texts ADD CONSTRAINT system_texts_type_check 
CHECK (type = ANY (ARRAY['header_text'::text, 'author'::text, 'site_logo'::text, 'header_image'::text, 'header_image_size'::text, 'header_image_dark'::text]));

-- Insert the new header_image_dark entry
INSERT INTO system_texts (type, content, is_active) 
VALUES ('header_image_dark', '', true);