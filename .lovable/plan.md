

## Ukrycie oczekujących opinii z podglądu publicznego

### Problem
Obecnie autor widzi swoją niezatwierdzoną opinię w podglądzie testymonialu (z badge "Oczekuje na zatwierdzenie"). Użytkownik chce, żeby opinii w ogóle nie było widać, dopóki admin jej nie zatwierdzi.

### Zmiany

**1. `src/components/testimonials/TestimonialPreviewDialog.tsx`**
- Zmienić filtrowanie komentarzy — wyświetlać TYLKO komentarze ze statusem `approved`
- Po wysłaniu opinii pokazać komunikat "Twoja opinia została wysłana i oczekuje na zatwierdzenie przez administratora" zamiast wyświetlania pending komentarza
- Ukryć formularz dodawania opinii jeśli użytkownik już ma jakikolwiek komentarz (pending/approved) — sprawdzać `existingComment` niezależnie od statusu
- Usunąć badge "Oczekuje na zatwierdzenie" i logikę `isPending`

**2. SQL RPC `get_testimonial_comments`** — ograniczyć do `approved` only
- Usunąć warunek `tc.user_id = auth.uid()` — nie zwracać pending nawet autorowi
- Zostawić warunek admin (potrzebny w panelu admina przez osobną funkcję `get_pending_testimonial_comments`)
- Nowa wersja: `WHERE tc.knowledge_id = p_knowledge_id AND tc.status = 'approved'`

Zmiana dotyczy 1 pliku + 1 migracja SQL.

