

# Update Eqology Timeline Section — exact match to screenshot

## What needs to change

The timeline section in the Eqology template (`id: 892223f1-cccf-4922-bab3-5781f7629a8a`) has outdated content (4 milestones, wrong heading/subtitle, no colors). Must be updated to match the screenshot exactly.

## Screenshot content (verbatim)

- **Heading**: "Proces wymaga czasu"
- **Subtitle**: "System trwa 6 miesięcy. To biologia i zaplanowana, komórkowa odbudowa Twojego organizmu."
- **Background**: dark green (#0a1628)
- **Text color**: white (#ffffff)
- **Line color**: green (#10b981)
- **Highlight text color**: yellow/gold (#facc15)
- **5 milestones**:
  1. Icon: "1", green highlight → "Miesiąc 1" / "Start. Wykonujesz 1. test i zaczynasz dawkę nasycającą."
  2. Icon: "2–3", no highlight → "Miesiąc 2–3" / "Kontynuacja. Komórki przyswajają EPA i DHA."
  3. Icon: "🎁", highlight, yellow month text → "Miesiąc 4" / "Gratis: Otrzymujesz bonus Eqology Essential."
  4. Icon: "5", green highlight → "Miesiąc 5" / "2. test kontrolny. Porównanie wyników."
  5. Icon: "6", no highlight → "Miesiąc 6" / "Zakończenie cyklu i trwała kontynuacja nawyku."

## Changes

### 1. Database migration
Update the `timeline_plan` element in the Eqology template with exact content, colors, and 5 milestones matching the screenshot.

### 2. No component changes needed
`TimelineSection.tsx` already supports all required features (subtitle, bg_color, text_color, line_color, highlight_text_color, dynamic columns).

| File | Change |
|------|--------|
| New migration SQL | Update Eqology template timeline config with exact screenshot content |

