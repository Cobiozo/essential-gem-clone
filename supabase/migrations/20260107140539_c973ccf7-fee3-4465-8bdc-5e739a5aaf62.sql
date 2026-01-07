-- Dodaj rekord partnera do user_roles (główna tabela ról)
INSERT INTO public.user_roles (user_id, role)
VALUES ('b2bc4ad4-553a-4530-b342-f438891f1818', 'partner'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;