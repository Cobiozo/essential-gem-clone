

# Fix: `columns.map is not a function` in ProductsGridEditor

## Root Cause

In `ProductsGridEditor.tsx` line 15, the fallback `config.columns || []` doesn't handle the case where `config.columns` exists but is not an array (e.g., it's an object or string from the database). This crashes the `.map()` call on line 30.

## Fix

**File: `src/components/admin/template-sections/ProductsGridEditor.tsx`**

Change line 15 from:
```typescript
const columns: any[] = config.columns || [];
```
to:
```typescript
const columns: any[] = Array.isArray(config.columns) ? config.columns : [];
```

This ensures `columns` is always a valid array regardless of what the database returns.

Single-line fix, one file.

