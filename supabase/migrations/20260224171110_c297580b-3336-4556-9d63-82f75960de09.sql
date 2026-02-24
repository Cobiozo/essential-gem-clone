
-- =============================================
-- Fix: ON DELETE SET NULL for "creator/audit" columns
-- =============================================

-- events.created_by
ALTER TABLE events ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_created_by_fkey;
ALTER TABLE events ADD CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- events.host_user_id
ALTER TABLE events ALTER COLUMN host_user_id DROP NOT NULL;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_host_user_id_fkey;
ALTER TABLE events ADD CONSTRAINT events_host_user_id_fkey FOREIGN KEY (host_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- certificates.issued_by
ALTER TABLE certificates ALTER COLUMN issued_by DROP NOT NULL;
ALTER TABLE certificates DROP CONSTRAINT IF EXISTS certificates_issued_by_fkey;
ALTER TABLE certificates ADD CONSTRAINT certificates_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- admin_alerts.resolved_by
ALTER TABLE admin_alerts ALTER COLUMN resolved_by DROP NOT NULL;
ALTER TABLE admin_alerts DROP CONSTRAINT IF EXISTS admin_alerts_resolved_by_fkey;
ALTER TABLE admin_alerts ADD CONSTRAINT admin_alerts_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- calculator_user_access.granted_by
ALTER TABLE calculator_user_access ALTER COLUMN granted_by DROP NOT NULL;
ALTER TABLE calculator_user_access DROP CONSTRAINT IF EXISTS calculator_user_access_granted_by_fkey;
ALTER TABLE calculator_user_access ADD CONSTRAINT calculator_user_access_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- healthy_knowledge.created_by
ALTER TABLE healthy_knowledge ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE healthy_knowledge DROP CONSTRAINT IF EXISTS healthy_knowledge_created_by_fkey;
ALTER TABLE healthy_knowledge ADD CONSTRAINT healthy_knowledge_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- html_pages.created_by
ALTER TABLE html_pages ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE html_pages DROP CONSTRAINT IF EXISTS html_pages_created_by_fkey;
ALTER TABLE html_pages ADD CONSTRAINT html_pages_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- leader_permissions.activated_by
ALTER TABLE leader_permissions ALTER COLUMN activated_by DROP NOT NULL;
ALTER TABLE leader_permissions DROP CONSTRAINT IF EXISTS leader_permissions_activated_by_fkey;
ALTER TABLE leader_permissions ADD CONSTRAINT leader_permissions_activated_by_fkey FOREIGN KEY (activated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- news_ticker_items.created_by
ALTER TABLE news_ticker_items ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE news_ticker_items DROP CONSTRAINT IF EXISTS news_ticker_items_created_by_fkey;
ALTER TABLE news_ticker_items ADD CONSTRAINT news_ticker_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- paid_events.created_by
ALTER TABLE paid_events ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE paid_events DROP CONSTRAINT IF EXISTS paid_events_created_by_fkey;
ALTER TABLE paid_events ADD CONSTRAINT paid_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- partner_page_user_access.granted_by
ALTER TABLE partner_page_user_access ALTER COLUMN granted_by DROP NOT NULL;
ALTER TABLE partner_page_user_access DROP CONSTRAINT IF EXISTS partner_page_user_access_granted_by_fkey;
ALTER TABLE partner_page_user_access ADD CONSTRAINT partner_page_user_access_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- specialist_calculator_user_access.granted_by
ALTER TABLE specialist_calculator_user_access ALTER COLUMN granted_by DROP NOT NULL;
ALTER TABLE specialist_calculator_user_access DROP CONSTRAINT IF EXISTS specialist_calculator_user_access_granted_by_fkey;
ALTER TABLE specialist_calculator_user_access ADD CONSTRAINT specialist_calculator_user_access_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- translation_jobs.created_by
ALTER TABLE translation_jobs ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE translation_jobs DROP CONSTRAINT IF EXISTS translation_jobs_created_by_fkey;
ALTER TABLE translation_jobs ADD CONSTRAINT translation_jobs_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- =============================================
-- Fix: ON DELETE CASCADE for user-owned data
-- =============================================

-- paid_event_orders.user_id
ALTER TABLE paid_event_orders DROP CONSTRAINT IF EXISTS paid_event_orders_user_id_fkey;
ALTER TABLE paid_event_orders ADD CONSTRAINT paid_event_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- hk_otp_codes.partner_id
ALTER TABLE hk_otp_codes DROP CONSTRAINT IF EXISTS hk_otp_codes_partner_id_fkey;
ALTER TABLE hk_otp_codes ADD CONSTRAINT hk_otp_codes_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
