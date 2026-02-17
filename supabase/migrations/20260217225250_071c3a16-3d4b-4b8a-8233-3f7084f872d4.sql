-- Usunięcie pustych rekordów tłumaczeń (title IS NULL), aby Tłumacz AI mógł je ponownie przetworzyć
DELETE FROM training_lesson_translations WHERE title IS NULL;
DELETE FROM training_module_translations WHERE title IS NULL;
DELETE FROM knowledge_resource_translations WHERE title IS NULL;
DELETE FROM healthy_knowledge_translations WHERE title IS NULL;