

# Fix: Partner Page mobile compatibility

## Problem

The partner page is completely broken on mobile (iOS). The screenshot shows:
1. **Header navigation** has no mobile collapse — all nav buttons (Produkty, O mnie, Kontakt, Odbierz darmowy poradnik) are forced into a single horizontal row alongside the logo and partner badge, crushing text into vertical single-character columns
2. **No overflow protection** on the main page container, allowing horizontal overflow to break the entire layout
3. **Testimonials carousel** nav buttons positioned at `-left-3`/`-right-3` can overflow off-screen on narrow devices

## Solution

### 1. HeaderSection — Mobile hamburger menu
**File: `src/components/partner-page/sections/HeaderSection.tsx`**

- Add `useState` for mobile menu open/close
- Hide nav buttons on mobile (`hidden md:flex`), show hamburger icon (`md:hidden`)
- When hamburger clicked, show a full-width dropdown panel below the header with nav items stacked vertically
- Close menu on item click
- Partner badge: hide on mobile in header (it's also shown in Hero)

### 2. PartnerPage — overflow protection
**File: `src/pages/PartnerPage.tsx`**

- Add `overflow-x-hidden` to the main `min-h-screen` container (line 284)

### 3. TestimonialsSection — mobile button fix
**File: `src/components/partner-page/sections/TestimonialsSection.tsx`**

- Change carousel arrow positioning from `-left-3`/`-right-3` to `left-1`/`right-1` on mobile using responsive classes
- Reduce button size on mobile

### 4. HeroSection — partner badge mobile sizing
**File: `src/components/partner-page/sections/HeroSection.tsx`**

- Reduce partner badge padding and font size on very small screens

### Files to change

| File | Change |
|------|--------|
| `src/components/partner-page/sections/HeaderSection.tsx` | Add hamburger menu for mobile, hide nav items on small screens |
| `src/pages/PartnerPage.tsx` | Add `overflow-x-hidden` to main container |
| `src/components/partner-page/sections/TestimonialsSection.tsx` | Fix carousel button overflow on mobile |
| `src/components/partner-page/sections/HeroSection.tsx` | Minor mobile sizing adjustments for partner badge |

