

# Real-time mask + zero jagged pixels — pipeline tuning

## Root Cause (from screenshots)

Screenshot 1 (blue geometric bg): Visible pixelated step-pattern along hair, glasses, and shoulder edges — the smoothstep transition band is too wide and the spatial blur isn't smoothing the staircase artifacts from the low-res mask.

Screenshot 2 (bookshelf bg): Ghosting/halo above head and around shoulders — temporal smoothing carries stale mask data too long, and the wide transition band (0.20-0.65) bleeds background into the person zone.

## Changes (all in `VideoBackgroundProcessor.ts`)

### 1. Remove segmentation throttling for image mode
Current: mask updates every 40ms (skips frames between).
Fix: For image mode, run segmentation on EVERY frame (`segmentationIntervalMs = 0`). The selfie_segmenter model is lightweight enough (~3-5ms on GPU). This eliminates the stale-mask lag that causes the contour to "trail" behind movement.

```
IMAGE_MODE_OVERRIDES.segmentationIntervalMs = 0  // every frame
```

### 2. Tighten smoothstep thresholds
Current: `smoothstep(0.20, 0.65)` — very wide 0.45 transition band creates ghosting.
Fix: Narrow to `smoothstep(0.35, 0.55)` — only 0.20 range. This makes edges crisp while still anti-aliased (not hard-clipped).

### 3. Increase initial contrast
Current: `contrastMask(mask, 5)` — too gentle, leaves too many mid-values.
Fix: Increase to `contrastMask(mask, 8)` — pushes mask values toward 0/1 more aggressively before spatial processing, reducing the number of ambiguous edge pixels.

### 4. Reduce spatial blur radius  
Current: 3px canvas blur spreads mask edges too wide.
Fix: Reduce to 2px — still removes staircase artifacts from the upscaled mask but creates a narrower feathered edge.

### 5. Reduce temporal smoothing weights
Current: 0.08 (high motion), 0.15 (medium), 0.25 (low motion) — too much previous-frame blending.
Fix: 0.03 (high motion), 0.08 (medium), 0.15 (low motion). This makes the mask follow the person almost instantly while still smoothing micro-jitter in stillness.

### 6. Tighten alpha blending thresholds in applyImageBackground
Current: `personThresholdHigh: 0.70, personThresholdLow: 0.30` from BLUR_PROFILES — creates a wide blend zone.
Fix: Use dedicated image-mode thresholds: `thHigh: 0.60, thLow: 0.40` — narrower transition band means less ghosting at edges while smoothstep still prevents hard pixel steps.

## Summary of parameter changes

| Parameter | Before | After |
|-----------|--------|-------|
| segmentationIntervalMs (image) | 40 | 0 (every frame) |
| contrastMask strength | 5 | 8 |
| spatial blur radius | 3px | 2px |
| smoothstep range | 0.20-0.65 | 0.35-0.55 |
| temporal weight (high motion) | 0.08 | 0.03 |
| temporal weight (medium) | 0.15 | 0.08 |
| temporal weight (low) | 0.25 | 0.15 |
| blend thHigh/thLow | 0.70/0.30 | 0.60/0.40 |

## File to modify
- `src/components/meeting/VideoBackgroundProcessor.ts` only

## What stays unchanged
- Blur modes (blur-light, blur-heavy) — completely untouched
- Multiclass fallback pipeline — untouched
- Background image flipping, upload logic, PeerJS, screen share — untouched
- All other meeting components — untouched
