-- Naprawa najnowszego wideo - URL z Supabase Storage
UPDATE cms_items 
SET media_url = 'https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/cms-videos/training-media/1767781433209-Messenger_creation_C540795E-E17C-45DA-9134-A7A2B1EA9EE0.mp4',
    media_type = 'video'
WHERE id = 'f31dc043-5e29-4521-910e-19ffa51c4ff6';

-- Naprawa starszego wideo z relatywnym URL - zamień na pełny URL VPS
UPDATE cms_items 
SET media_url = 'https://purelife.info.pl/uploads/training-media/1767783951146-4yl9td-Messenger_creation_C540795E-E17C-45DA-9134-A7A2B1E.mp4'
WHERE id = '0fcc75a2-0e46-4928-9921-c2d8a8000dd8';