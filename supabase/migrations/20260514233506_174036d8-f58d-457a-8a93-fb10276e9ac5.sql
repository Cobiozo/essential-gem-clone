DO $$
DECLARE
  v_order_id uuid := '44a9a841-e74d-4bbb-a5aa-2f65f2ce4525';
  v_event_id uuid := '11664836-9bfe-4760-a453-4506ac5788f4';
  v_submission_id uuid := 'a9345847-8b79-489b-81a9-7fed17324000';
  v_code1 text;
  v_code2 text;
BEGIN
  UPDATE public.paid_event_orders
  SET quantity = 2,
      total_amount = 7000,
      updated_at = now()
  WHERE id = v_order_id;

  DELETE FROM public.paid_event_order_attendees
  WHERE order_id = v_order_id;

  v_code1 := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  v_code2 := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  INSERT INTO public.paid_event_order_attendees (
    order_id, event_id, seat_index, first_name, last_name, email, ticket_code
  ) VALUES
    (v_order_id, v_event_id, 1, 'Gość', '#1', NULL, v_code1),
    (v_order_id, v_event_id, 2, 'Gość', '#2', NULL, v_code2);

  UPDATE public.event_form_submissions
  SET submitted_data = COALESCE(submitted_data, '{}'::jsonb)
    || jsonb_build_object(
      'last_order_id', v_order_id,
      'last_ticket_id', '0db6bae0-a291-488f-897d-a0614c103703',
      'last_total_amount', 7000,
      'quantity', 2,
      'total_seats', 2,
      'total_amount', 7000,
      'total_amount_pln', 70,
      'order_ids', jsonb_build_array('2848e86d-66dc-4a67-b357-edfeec3fa926', v_order_id)
    ),
      updated_at = now()
  WHERE id = v_submission_id;
END $$;