ALTER TABLE public.mfa_enforced_users ADD COLUMN enforced_method text DEFAULT NULL;

CREATE OR REPLACE FUNCTION public.get_my_mfa_config()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_role text;
  v_enforcement boolean;
  v_method text;
  v_required_roles jsonb;
  v_roles_array text[];
  v_required boolean := false;
  v_enforced_method text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.mfa_exempt_users WHERE user_id = auth.uid()) THEN
    SELECT role::text INTO v_user_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
    RETURN json_build_object('required', false, 'method', 'totp', 'role', v_user_role, 'exempt', true);
  END IF;

  SELECT role::text INTO v_user_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;

  IF v_user_role IS NULL THEN
    RETURN json_build_object('required', false, 'method', 'totp', 'role', null);
  END IF;

  SELECT enforced_method INTO v_enforced_method FROM public.mfa_enforced_users WHERE user_id = auth.uid();

  IF FOUND THEN
    IF v_enforced_method IS NOT NULL THEN
      v_method := v_enforced_method;
    ELSE
      SELECT CASE WHEN jsonb_typeof(setting_value) = 'string' THEN TRIM(BOTH '"' FROM setting_value::text) ELSE 'totp' END
      INTO v_method FROM public.security_settings WHERE setting_key = 'mfa_method';
      v_method := COALESCE(v_method, 'totp');
    END IF;
    RETURN json_build_object('required', true, 'method', v_method, 'role', v_user_role, 'enforced', true);
  END IF;

  SELECT CASE WHEN setting_value::text = 'true' THEN true WHEN setting_value::text = '"true"' THEN true ELSE false END
  INTO v_enforcement FROM public.security_settings WHERE setting_key = 'mfa_enforcement';

  IF NOT COALESCE(v_enforcement, false) THEN
    RETURN json_build_object('required', false, 'method', 'totp', 'role', v_user_role);
  END IF;

  SELECT CASE WHEN jsonb_typeof(setting_value) = 'string' THEN setting_value::text ELSE 'totp' END
  INTO v_method FROM public.security_settings WHERE setting_key = 'mfa_method';
  v_method := COALESCE(TRIM(BOTH '"' FROM v_method), 'totp');

  SELECT setting_value INTO v_required_roles FROM public.security_settings WHERE setting_key = 'mfa_required_roles';

  IF v_required_roles IS NOT NULL AND jsonb_typeof(v_required_roles) = 'array' THEN
    SELECT array_agg(elem::text) INTO v_roles_array FROM jsonb_array_elements_text(v_required_roles) AS elem;
    IF v_roles_array IS NOT NULL AND v_user_role = ANY(v_roles_array) THEN
      v_required := true;
    END IF;
  END IF;

  RETURN json_build_object('required', v_required, 'method', v_method, 'role', v_user_role);
END;
$function$;