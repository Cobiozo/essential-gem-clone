

# Fix: Initialize Survey with Default Config

## Problem
`SurveyManager.tsx` line 41: `setSurveyConfig(surveyElement?.config || {})` — when no survey element exists in the template data, it falls back to an empty object `{}`. The editor and renderer both work correctly, but they have no data to show.

## Solution
One-line fix: import `DEFAULT_SECTION_CONFIGS` and use `DEFAULT_SECTION_CONFIGS.survey` as the fallback instead of `{}`.

## File Change

**`src/components/admin/SurveyManager.tsx`**
- Import `DEFAULT_SECTION_CONFIGS` from `./template-preview/defaultSectionConfigs`
- Change line 41 from:
  ```ts
  setSurveyConfig(surveyElement?.config || {});
  ```
  to:
  ```ts
  setSurveyConfig(surveyElement?.config || DEFAULT_SECTION_CONFIGS.survey);
  ```

This immediately populates the survey with the 10 pre-built health questions (gender, age, height, weight, activity, ailments, supplements, diet, stress, health goals) and 4 product recommendations — all fully editable. The anchor `#ankieta` is included in the default config.

## Files
| File | Change |
|------|--------|
| `src/components/admin/SurveyManager.tsx` | Import default config, use as fallback |

