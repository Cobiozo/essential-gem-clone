

# Post-submit actions for partner forms + email with PDF attachment

## Overview
Add a configurable "post-submit action" system to partner forms. For the "darmowy poradnik" form, configure it to: show confirmation, save lead, and send an email with the PDF from BP files as attachment.

## Changes

### 1. Database: Add `post_submit_actions` column to `partner_page_forms`
Migration adding a JSONB column `post_submit_actions` storing an array of actions to execute after form submission.

Structure:
```text
post_submit_actions: [
  { type: "show_confirmation" },                    // already handled by success_message
  { type: "save_lead" },                            // already done
  { type: "send_email_with_file", bp_file_id: "uuid" }  // NEW: send email with BP file as attachment
]
```

Update the "darmowy-poradnik" form record with:
- `success_message`: "Dziękujemy za wypełnienie formularza! Na podany adres email została przesłana wiadomość z poradnikiem/e-bookiem. Sprawdź również inne foldery takie jak spam."
- `post_submit_actions`: `[{"type": "send_email_with_file", "bp_file_id": null}]` (file ID to be set via admin UI)

### 2. Admin UI: Add post-submit action config in `PartnerFormsManager.tsx`
- New section "Akcja po wysłaniu" in form editor
- Dropdown: "Brak" | "Wyślij email z plikiem BP"
- When "Wyślij email z plikiem BP" selected → show a dropdown listing PDF files from `bp_page_files` to select which file to attach
- Store selection in `post_submit_actions` JSONB

### 3. Edge Function: Extend `save-partner-lead` to send email with attachment
After saving the lead, if `post_submit_actions` contains `send_email_with_file`:
- Fetch the BP file record from `bp_page_files` by ID
- Download the file from `file_url` (VPS storage)
- Base64-encode the file content
- Call `send-single-email` (existing function supporting attachments) with:
  - `skip_template: true`
  - `recipient_email`: the lead's email
  - HTML body: branded confirmation message
  - Attachment: the PDF file
- Pass `form_cta_key` to look up actions from `partner_page_forms`

### 4. Frontend: Pass `form_cta_key` in `PartnerFormModal.tsx`
Already passing `form_cta_key` — no change needed. The edge function will use it to look up actions.

### 5. Update Supabase types
Add `post_submit_actions` to `partner_page_forms` type in `types.ts`.

## Files to modify
- New migration SQL (ALTER TABLE + UPDATE data)
- `src/components/admin/PartnerFormsManager.tsx` — add action config UI
- `supabase/functions/save-partner-lead/index.ts` — add email sending logic
- `src/integrations/supabase/types.ts` — add new column type

## Technical details
- The `send-single-email` function already supports attachments (base64-encoded) and `skip_template` mode
- `save-partner-lead` runs with service role key so it can read `bp_page_files` (admin-only RLS) and invoke `send-single-email`
- Email HTML will be a simple branded message: "Cześć [imię], dziękujemy za wypełnienie formularza. W załączniku znajdziesz poradnik/e-book. Zespół PureLife"
- BP file `file_url` points to VPS storage — the edge function will fetch and convert to base64 for the SMTP attachment

