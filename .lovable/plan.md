Problem nie jest po stronie publikacji na produkcję. Sprawdziłem Supabase: tabela `intro_video_settings` ma już kolumny dla wielu momentów, ale w Storage nie istnieje bucket `intro-videos`, dlatego upload kończy się błędem z widocznym toastem.

Plan naprawy:

1. Naprawić Storage Supabase
   - Utworzyć bucket `intro-videos` jako publiczny.
   - Ustawić limit pliku zgodny z panelem: 50 MB.
   - Dopuścić formaty: MP4, WebM, QuickTime/MOV.
   - Zachować istniejące polityki: publiczny odczyt, upload/edycja/usuwanie tylko dla admina.

2. Uporządkować panel admina
   - Dopilnować, żeby komunikat błędu nie sugerował już ręcznego działania, gdy bucket zostanie utworzony.
   - Po udanym uploadzie automatycznie wpisać publiczny URL do pola wideo i pozwolić zapisać ustawienia.
   - Zachować wybór wielu momentów wyświetlania intro.

3. Zweryfikować dane i działanie
   - Sprawdzić, że `intro_video_settings` nadal ma `trigger_moments` oraz wszystkie częstotliwości.
   - Sprawdzić, że bucket `intro-videos` istnieje w Supabase.
   - Sprawdzić, że upload nie zwraca już błędu „bucket not found”.

Technicznie:
- Potrzebna jest zmiana konfiguracji Supabase Storage, nie deploy frontendu.
- W następnym kroku użyję migracji/konfiguracji Supabase do utworzenia brakującego magazynu i dopiero potem poprawię ewentualne drobne komunikaty w kodzie.