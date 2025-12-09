-- Add visibility columns to cms_items table
ALTER TABLE cms_items
ADD COLUMN visible_to_everyone BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN visible_to_clients BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN visible_to_partners BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN visible_to_specjalista BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN visible_to_anonymous BOOLEAN NOT NULL DEFAULT false;