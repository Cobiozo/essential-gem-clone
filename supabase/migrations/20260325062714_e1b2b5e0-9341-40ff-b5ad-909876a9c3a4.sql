INSERT INTO purebox_settings (element_key, element_name, is_active, visible_to_admin, visible_to_partner, visible_to_client, visible_to_specjalista)
VALUES ('purebox-master', 'Moduł PureBox', true, true, true, true, true)
ON CONFLICT DO NOTHING;