---
name: inbetween-frame-planner
description: Plan and generate smooth in-between frames for hand-drawn storyboard animations. Use when an animation feels like scene-to-scene fades or a slideshow and needs handmade bridge frames, motion arcs, holds, timing, and video-ready frame schedules.
---

# In-Between Frame Planner

## Purpose

Turn finished storyboard stills into smoother animation by adding drawn bridge frames between key panels.

Use this after the key frames are readable and before rendering video. The output should feel like an animated drawing, not like crossfading still images.

## Inputs

Read the current project requirements document first. Use:

- Key storyboard frames.
- Current still-frame drawings.
- Requirements for timing, style, and important anchors.
- Any user notes about what feels stiff, detached, or slideshow-like.

## Tool

Create an in-between plan:

```bash
npm run storyboard:inbetween -- storyboard-frames/<name> output/inbetweens/<name> --scene-count 12 --inbetweens 5 --hold 2 --fps 12
```

Use more in-betweens for larger pose changes:

```bash
npm run storyboard:inbetween -- storyboard-frames/<name> output/inbetweens/<name> --scene-count 12 --inbetweens 7 --hold 2 --fps 12
```

The tool writes:

- `inbetweens.json`: machine-readable frame schedule.
- `inbetween-plan.md`: human-readable movement brief.

Each generated in-between should include both straight and eased timing:

- `t` / `linearT`: even spacing from source scene to target scene.
- `motionT`: numeric eased spacing from `d3-ease`; use this for animated body/prop anchors when drawing the bridge frame.
- `easedT`: named timing accent value; use this for local settle, bounce, or impact effects when it differs from `motionT`.
- `easing`: the named timing feel, such as `ease-in-out`, `ease-out`, `settle`, `anticipate-settle`, or `bounce`.

## Planning Rules

For each pair of key frames:

1. Name what changes.
2. Look back at both neighboring lighthouse frames and mark what stays anchored or fully locked.
3. Add 3-8 in-between frames depending on how large the pose change is.
4. Move the big masses first along a believable path from the source-guided anchors: head, neck, shoulders, torso/body mass, limbs, primary props.
5. Keep face details attached to the head.
6. Keep hands attached through wrist and sleeve.
7. Keep props attached to the desk or hand.
8. Add motion marks only after the body attachment is clear.

The in-between does not need to perfectly match either source frame, but it must preserve the core physical ideas shown by the lighthouse frames: connected body chains, grounded props, readable overlap, and pen-stroke flow that follows the form.
If an in-between reveals a detached limb, popping prop, broken bubble, or unclear garment, redraw that bridge frame from corrected anchors. Do not hide the defect with a crossfade, patch, blur, or texture.

## Locked Set Layers

Treat the scene like a movie set. Most of the set should not animate just because the character moves.

Use three categories:

- `locked`: paper grain, panel border, wall notes/posters, table/desk, shelves, window, static background lighting.
- `anchored`: laptop, mug, notebook, phone, lamp, plant, desk props. These may redraw with tiny hand jitter but should not translate unless the story says they move.
- `animated`: head, torso, shoulders, arms, wrists, hands, facial expression, hair droop, dream/sleep/motion marks, story-critical prop movement.

For normal bridge frames, redraw `locked` layers from the same cached set layer. Redraw `anchored` props in the same position. Only interpolate `animated` anchors.

If the camera/framing changes, such as a close-up or a wide shot, create a new set layer for that shot and transition deliberately rather than letting every poster/table mark drift.

When a camera/framing change makes a new shot active, the required anchored props for that shot must already be readable. Do not let the label or shot composition advance while important objects are still missing.

## In-Between Drawing Order

For every generated bridge frame:

1. Draw or reuse the locked set layer.
2. Draw anchored props in stable positions.
3. Interpolate animated anchors: head, torso, shoulders, elbows, wrists, hands, expression.
4. Draw the body in its in-between position, keeping connection bridges visible before texture.
5. Redraw moving ink and watercolor marks fresh for that bridge frame.
6. Add a small amount of pen jitter only to moving or locally animated marks.
7. Avoid fading detached facial features, hands, or props from one frame to another.
8. Avoid patching bridge-frame bugs after the draw. Fix the interpolated anchor, object path, or layer order and redraw the bridge frame.

## Timing Guidance

- Use short holds on key frames so the story beat is readable.
- Use 4-6 in-betweens for normal pose changes.
- Use 6-8 in-betweens for large pose changes, close-ups, or head-down movement.
- Use eased timing for motion anchors. Keep `linearT` only for measuring or debugging, use `motionT` for spatial interpolation, and reserve `easedT` for local effects when the easing is intentionally bouncy or anticipatory.
- Use 12 fps or 15 fps for handmade animation; higher frame rates can feel too mechanically smooth unless the marks are redrawn.

## Output Gate

Before rendering final video:

- Play the in-between sequence in browser.
- Check that body parts travel as connected chains.
- Check that locked set pieces do not swim, drift, or redraw in different locations.
- Check that required anchored props are present in every key frame and in-between frame where the shot implies they should be visible.
- Check that the animation does not rely on crossfading alone.
- Check that any visible defects were corrected by redrawing/recreating the affected in-between frame, not by covering them.
- Capture at least start, middle, and end screenshots.
- Render video only after the bridge frames read as one continuous handmade motion.
