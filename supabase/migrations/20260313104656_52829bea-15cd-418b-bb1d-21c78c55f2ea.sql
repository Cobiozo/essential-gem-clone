
CREATE OR REPLACE FUNCTION public.get_my_mfa_config()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_role text;
  v_enforcement boolean;
  v_method text;
  v_required_roles jsonb;
  v_roles_array text[];
  v_required boolean := false;
BEGIN
  -- Get current user's role
  SELECT role::text INTO v_user_role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_user_role IS NULL THEN
    RETURN json_build_object('required', false, 'method', 'totp', 'role', null);
  END IF;

  -- Get MFA enforcement setting
  SELECT 
    CASE 
      WHEN setting_value::text = 'true' THEN true
      WHEN setting_value::text = '"true"' THEN true
      ELSE false
    END
  INTO v_enforcement
  FROM public.security_settings
  WHERE setting_key = 'mfa_enforcement';

  IF NOT COALESCE(v_enforcement, false) THEN
    RETURN json_build_object('required', false, 'method', 'totp', 'role', v_user_role);
  END IF;

  -- Get MFA method
  SELECT 
    CASE 
      WHEN jsonb_typeof(setting_value) = 'string' THEN setting_value::text
      ELSE 'totp'
    END
  INTO v_method
  FROM public.security_settings
  WHERE setting_key = 'mfa_method';

  -- Remove quotes from JSON string
  v_method := COALESCE(TRIM(BOTH '"' FROM v_method), 'totp');

  -- Get required roles
  SELECT setting_value INTO v_required_roles
  FROM public.security_settings
  WHERE setting_key = 'mfa_required_roles';

  IF v_required_roles IS NOT NULL AND jsonb_typeof(v_required_roles) = 'array' THEN
    SELECT array_agg(elem::text) INTO v_roles_array
    FROM jsonb_array_elements_text(v_required_roles) AS elem;
    
    IF v_roles_array IS NOT NULL AND v_user_role = ANY(v_roles_array) THEN
      v_required := true;
    END IF;
  END IF;

  RETURN json_build_object(
    'required', v_required,
    'method', v_method,
    'role', v_user_role
  );
END;
$$;
