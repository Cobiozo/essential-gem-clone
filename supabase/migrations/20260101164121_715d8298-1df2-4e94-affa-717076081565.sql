-- Usunięcie nieużywanych indeksów (łącznie ~416 KB)

-- Największy nieużywany indeks (272 KB) - JSONB na cms_items.cells
DROP INDEX IF EXISTS idx_cms_items_cells;

-- Indeksy na kolumnach typu ARRAY (nigdy nie używane)
DROP INDEX IF EXISTS idx_certificate_templates_module_ids;
DROP INDEX IF EXISTS idx_certificate_templates_roles;
DROP INDEX IF EXISTS idx_knowledge_resources_tags;
DROP INDEX IF EXISTS idx_knowledge_resources_category;

-- Indeksy na tabeli analitycznej (INSERT-only, niepotrzebne)
DROP INDEX IF EXISTS idx_banner_interactions_banner_type;
DROP INDEX IF EXISTS idx_banner_interactions_user_id;
DROP INDEX IF EXISTS idx_banner_interactions_created_at;

-- Indeks na translation_jobs (rzadko używana tabela)
DROP INDEX IF EXISTS idx_translation_jobs_job_type;