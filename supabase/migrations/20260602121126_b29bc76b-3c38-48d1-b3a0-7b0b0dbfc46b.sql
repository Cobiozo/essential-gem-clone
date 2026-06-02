UPDATE paid_event_orders SET ticket_sent_at = NULL, ticket_generated_at = NULL WHERE id = '15d3f6cc-c4e4-4e62-ab38-e50a06a589f1' AND status = 'awaiting_transfer';

UPDATE event_form_submissions SET payment_status = 'pending', email_status = 'confirmed' WHERE submitted_data->>'order_id' = '15d3f6cc-c4e4-4e62-ab38-e50a06a589f1' OR submitted_data->'order_ids' ? '15d3f6cc-c4e4-4e62-ab38-e50a06a589f1';