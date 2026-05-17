-- Normalize legacy mobile bottom navigation targets
UPDATE public.mobile_bottom_nav_items
SET target_path = '/events/webinars', updated_at = now()
WHERE target_path = '/webinars';

UPDATE public.mobile_bottom_nav_items
SET target_path = '/zdrowa-wiedza', updated_at = now()
WHERE target_path = '/healthy-knowledge'
  AND lower(label) <> 'akademia';

UPDATE public.mobile_bottom_nav_items
SET target_path = '/my-account?tab=profile', updated_at = now()
WHERE target_path = '/profile';

-- Ensure the Academy item points to the real Training route
UPDATE public.mobile_bottom_nav_items
SET target_path = '/training', icon_name = 'GraduationCap', label = 'Akademia', is_active = true, updated_at = now()
WHERE lower(label) = 'akademia'
   OR target_path = '/academy';

-- Keep only the preferred Academy entry active if duplicated
WITH ranked_training AS (
  SELECT
    id,
    row_number() OVER (
      ORDER BY
        CASE WHEN lower(label) = 'akademia' THEN 0 ELSE 1 END,
        position ASC,
        created_at ASC
    ) AS rn
  FROM public.mobile_bottom_nav_items
  WHERE target_path = '/training'
)
UPDATE public.mobile_bottom_nav_items AS item
SET
  is_active = ranked_training.rn = 1,
  label = CASE WHEN ranked_training.rn = 1 THEN 'Akademia' ELSE item.label END,
  icon_name = CASE WHEN ranked_training.rn = 1 THEN 'GraduationCap' ELSE item.icon_name END,
  updated_at = now()
FROM ranked_training
WHERE item.id = ranked_training.id;

-- Disable default unfinished items so they do not appear in the live mobile bar
UPDATE public.mobile_bottom_nav_items
SET is_active = false, updated_at = now()
WHERE lower(label) = 'nowa pozycja'
  AND target_path = '/dashboard';