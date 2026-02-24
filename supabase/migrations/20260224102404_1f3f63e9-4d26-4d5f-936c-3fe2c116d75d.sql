
-- Add logo header to 18 email templates that don't have it

-- 1. Nowa rezerwacja spotkania indywidualnego
UPDATE email_templates SET body_html = '<div style="background-color: #ffc105; padding: 20px; text-align: center;"><img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/training-media/1766508615455-8wv0cee7jwr.png" alt="Pure Life Center" style="max-height: 50px; margin-bottom: 10px;" /><h1 style="color: #ffffff; margin: 0; font-size: 24px;">Nowa rezerwacja spotkania</h1></div>' || body_html WHERE id = '36366b9b-f695-4a7b-a5f7-768549c853e3';

-- 2. Nowe materiały szkoleniowe
UPDATE email_templates SET body_html = '<div style="background-color: #ffc105; padding: 20px; text-align: center;"><img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/training-media/1766508615455-8wv0cee7jwr.png" alt="Pure Life Center" style="max-height: 50px; margin-bottom: 10px;" /><h1 style="color: #ffffff; margin: 0; font-size: 24px;">Nowe materiały szkoleniowe</h1></div>' || body_html WHERE id = '75d613bd-5978-4c83-9e83-006c317c1f7c';

-- 3. Pełne zatwierdzenie konta
UPDATE email_templates SET body_html = '<div style="background-color: #ffc105; padding: 20px; text-align: center;"><img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/training-media/1766508615455-8wv0cee7jwr.png" alt="Pure Life Center" style="max-height: 50px; margin-bottom: 10px;" /><h1 style="color: #ffffff; margin: 0; font-size: 24px;">Konto zatwierdzone</h1></div>' || body_html WHERE id = '111b24db-5ab2-457b-89ae-01d7e237a55d';

-- 4. Potwierdzenie rejestracji na webinar
UPDATE email_templates SET body_html = '<div style="background-color: #ffc105; padding: 20px; text-align: center;"><img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/training-media/1766508615455-8wv0cee7jwr.png" alt="Pure Life Center" style="max-height: 50px; margin-bottom: 10px;" /><h1 style="color: #ffffff; margin: 0; font-size: 24px;">Potwierdzenie rejestracji na webinar</h1></div>' || body_html WHERE id = '707b3b94-f7da-4b88-9318-cb2d46641338';

-- 5. Potwierdzenie rezerwacji spotkania
UPDATE email_templates SET body_html = '<div style="background-color: #ffc105; padding: 20px; text-align: center;"><img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/training-media/1766508615455-8wv0cee7jwr.png" alt="Pure Life Center" style="max-height: 50px; margin-bottom: 10px;" /><h1 style="color: #ffffff; margin: 0; font-size: 24px;">Potwierdzenie rezerwacji</h1></div>' || body_html WHERE id = '856c8781-a918-4431-aa6c-91f55e293106';

-- 6. Powiadomienie o przypisanym szkoleniu
UPDATE email_templates SET body_html = '<div style="background-color: #ffc105; padding: 20px; text-align: center;"><img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/training-media/1766508615455-8wv0cee7jwr.png" alt="Pure Life Center" style="max-height: 50px; margin-bottom: 10px;" /><h1 style="color: #ffffff; margin: 0; font-size: 24px;">Nowe szkolenie</h1></div>' || body_html WHERE id = '51167948-f218-48d0-a7ae-ca8a82468a41';

-- 7. Przypomnienie o spotkaniu (15 min)
UPDATE email_templates SET body_html = '<div style="background-color: #ffc105; padding: 20px; text-align: center;"><img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/training-media/1766508615455-8wv0cee7jwr.png" alt="Pure Life Center" style="max-height: 50px; margin-bottom: 10px;" /><h1 style="color: #ffffff; margin: 0; font-size: 24px;">Przypomnienie o spotkaniu</h1></div>' || body_html WHERE id = '954a01f2-86d2-43b8-a64e-d1f9ab6c8d78';

-- 8. Przypomnienie o spotkaniu (1h)
UPDATE email_templates SET body_html = '<div style="background-color: #ffc105; padding: 20px; text-align: center;"><img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/training-media/1766508615455-8wv0cee7jwr.png" alt="Pure Life Center" style="max-height: 50px; margin-bottom: 10px;" /><h1 style="color: #ffffff; margin: 0; font-size: 24px;">Przypomnienie o spotkaniu</h1></div>' || body_html WHERE id = '6b2024c6-66a4-42d9-84ad-4d54b1a7f449';

-- 9. Przypomnienie o spotkaniu (24h)
UPDATE email_templates SET body_html = '<div style="background-color: #ffc105; padding: 20px; text-align: center;"><img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/training-media/1766508615455-8wv0cee7jwr.png" alt="Pure Life Center" style="max-height: 50px; margin-bottom: 10px;" /><h1 style="color: #ffffff; margin: 0; font-size: 24px;">Przypomnienie o spotkaniu</h1></div>' || body_html WHERE id = 'b49bd270-3de1-4678-b7a2-fe146e91041b';

-- 10. Przypomnienie o szkoleniu
UPDATE email_templates SET body_html = '<div style="background-color: #ffc105; padding: 20px; text-align: center;"><img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/training-media/1766508615455-8wv0cee7jwr.png" alt="Pure Life Center" style="max-height: 50px; margin-bottom: 10px;" /><h1 style="color: #ffffff; margin: 0; font-size: 24px;">Przypomnienie o szkoleniu</h1></div>' || body_html WHERE id = 'e35399dd-ff12-459e-8cc3-e025901169ba';

-- 11. Przypomnienie o webinarze (1h przed)
UPDATE email_templates SET body_html = '<div style="background-color: #ffc105; padding: 20px; text-align: center;"><img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/training-media/1766508615455-8wv0cee7jwr.png" alt="Pure Life Center" style="max-height: 50px; margin-bottom: 10px;" /><h1 style="color: #ffffff; margin: 0; font-size: 24px;">Przypomnienie o webinarze</h1></div>' || body_html WHERE id = 'fd189665-230c-472f-aa64-56bdd4d1ffc5';

-- 12. Przypomnienie o webinarze (24h przed)
UPDATE email_templates SET body_html = '<div style="background-color: #ffc105; padding: 20px; text-align: center;"><img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/training-media/1766508615455-8wv0cee7jwr.png" alt="Pure Life Center" style="max-height: 50px; margin-bottom: 10px;" /><h1 style="color: #ffffff; margin: 0; font-size: 24px;">Przypomnienie o webinarze</h1></div>' || body_html WHERE id = 'ebd53de7-7fed-4774-b4ff-b8ca0113cc59';

-- 13. Przypomnienie systemowe
UPDATE email_templates SET body_html = '<div style="background-color: #ffc105; padding: 20px; text-align: center;"><img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/training-media/1766508615455-8wv0cee7jwr.png" alt="Pure Life Center" style="max-height: 50px; margin-bottom: 10px;" /><h1 style="color: #ffffff; margin: 0; font-size: 24px;">Przypomnienie</h1></div>' || body_html WHERE id = 'f89de964-e4f7-452d-adb8-ede438b33136';

-- 14. Reset hasła przez administratora
UPDATE email_templates SET body_html = '<div style="background-color: #ffc105; padding: 20px; text-align: center;"><img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/training-media/1766508615455-8wv0cee7jwr.png" alt="Pure Life Center" style="max-height: 50px; margin-bottom: 10px;" /><h1 style="color: #ffffff; margin: 0; font-size: 24px;">Reset hasła</h1></div>' || body_html WHERE id = 'c34efa34-0068-4d9c-bb97-88a53f2b5162';

-- 15. Spotkanie indywidualne odwołane
UPDATE email_templates SET body_html = '<div style="background-color: #ffc105; padding: 20px; text-align: center;"><img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/training-media/1766508615455-8wv0cee7jwr.png" alt="Pure Life Center" style="max-height: 50px; margin-bottom: 10px;" /><h1 style="color: #ffffff; margin: 0; font-size: 24px;">Spotkanie odwołane</h1></div>' || body_html WHERE id = '14ed1bd1-3559-4755-aa62-a76fc858cc8d';

-- 16. Wiadomość do specjalisty
UPDATE email_templates SET body_html = '<div style="background-color: #ffc105; padding: 20px; text-align: center;"><img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/training-media/1766508615455-8wv0cee7jwr.png" alt="Pure Life Center" style="max-height: 50px; margin-bottom: 10px;" /><h1 style="color: #ffffff; margin: 0; font-size: 24px;">Wiadomość od specjalisty</h1></div>' || body_html WHERE id = '8c19491f-3771-4b41-bbc9-dfd8a15748b3';

-- 17. Zatwierdzenie przez opiekuna
UPDATE email_templates SET body_html = '<div style="background-color: #ffc105; padding: 20px; text-align: center;"><img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/training-media/1766508615455-8wv0cee7jwr.png" alt="Pure Life Center" style="max-height: 50px; margin-bottom: 10px;" /><h1 style="color: #ffffff; margin: 0; font-size: 24px;">Zatwierdzenie rejestracji</h1></div>' || body_html WHERE id = '0e379c4c-8056-4f4b-91d0-44062a385654';
