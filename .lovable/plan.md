
# Eliminacja efektu odswiezania stron przy powrocie do aplikacji

## Diagnoza

Kazda strona z `useEffect([user])` re-renderuje sie po powrocie do karty, poniewaz:

1. Supabase emituje `TOKEN_REFRESHED` event po powrocie
2. AuthContext wola `setUser(newSession?.user)` — tworzy NOWA referencje obiektu `user`
3. React widzi nowy obiekt i odpala wszystkie `useEffect` ktore zaleza od `user`
4. Strony jak Training ustawiaja `setLoading(true)` i ponownie pobieraja dane z bazy

Ochrona w linii 161 (`isPageHiddenRef`) czesto nie dziala, bo 100ms debounce powoduje ze ref wraca do `false` zanim Supabase zdazy odpalic event.

## Rozwiazanie

### 1. AuthContext — nie aktualizuj `user` jesli ID sie nie zmienilo

W `onAuthStateChange` callback, zamiast zawsze `setUser(newSession?.user)`, porownac ID:

```text
// PRZED (linia 163-164, i 168-169):
setSession(newSession);
setUser(newSession?.user ?? null);

// PO:
setSession(newSession);
// Nie twórz nowej referencji user jeśli to ten sam użytkownik
setUser(prev => {
  const newUser = newSession?.user ?? null;
  if (prev?.id === newUser?.id) return prev;
  return newUser;
});
```

Ta zmiana musi byc zastosowana w DWOCH miejscach w `onAuthStateChange`:
- Linia 163-164 (ciche odswiezenie przy ukrytej karcie)
- Linia 168-169 (normalne przetwarzanie eventu)

### 2. Dodatkowe zabezpieczenie — TOKEN_REFRESHED z profilem

Upewnic sie ze linia 190 prawidlowo robi early return dla `TOKEN_REFRESHED`:

```text
if (event === 'TOKEN_REFRESHED') {
  // Token odswiezony - NIGDY nie resetuj UI
  return;
}
if (profileAlreadyLoaded) {
  return;
}
```

Rozdzielenie tych warunkow eliminuje ryzyko ze `profileAlreadyLoaded` jest `false` podczas TOKEN_REFRESHED (np. gdy profil jeszcze sie nie zaladowal).

## Wplyw

- Strony z `useEffect([user])` (Training, Dashboard, KnowledgeCenter, itp.) przestana sie odswiezac przy powrocie do karty
- Prawdziwe logowanie/zmiana uzytkownika nadal bedzie dzialac poprawnie (inne ID)
- Zero ryzyka regresji — ref do `user` zmienia sie tylko gdy zmieni sie uzytkownik

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/contexts/AuthContext.tsx` | Stabilna referencja `user` (porownanie ID), rozdzielenie TOKEN_REFRESHED guard |
