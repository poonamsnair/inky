---
name: animation-polish-pass
description: Run a cleanup and enhancement pass on Inky storyboard animations after each first-drawn frame or after a first full render. Use to re-check frames against the lighthouse reference, close body/prop gaps, fix visual bugs, improve speech bubbles or captions, enhance texture/detail, and polish in-between motion before final video export.
---

# Animation Polish Pass

## Purpose

Treat the first drawn frame sequence as a draft. This pass catches what the first build missed, then adds detail only after the pose, body chains, props, text, and motion read clearly.

Polish is not cover-up work. When a defect is structural or visible, fix the root cause and redraw/recreate the affected shape, path, layer, or timing. Do not hide bugs with white patches, eraser strokes, masks, opacity tricks, extra texture, or decorative marks.

Use after:
- A first still frame is drawn.
- A set of key frames is drawn.
- A first browser render or MP4 export exists.
- The user reports visual bugs, missing detail, weak texture, wrong text ownership, or motion that feels shortcut.

## Inputs

Read the active project `storyboard/requirements.md`, the source frame images, construction blueprints, rendered frame PNGs, in-between plan, and any user correction screenshots.

Create a checklist:

```bash
npm run storyboard:polish -- projects/<project-name>
npm run storyboard:visual-diff -- projects/<project-name>/outputs/frames projects/<project-name>/outputs/review-visual-diff
```

If needed, override paths:

```bash
npm run storyboard:polish -- projects/<project-name> projects/<project-name>/storyboard/polish-pass.md -- --frames projects/<project-name>/outputs/png
```

## Pass Order

1. **Lighthouse replay**: compare each rendered frame with its source frame for pose, silhouette, contact points, scale, and speaker/text ownership.
2. **Gap closure**: fix disconnected heads, wrists, sleeves, hands, limbs, hair, props, labels, shadows, and contact points before adding decoration.
3. **Artifact removal**: remove accidental panel borders, frame numbers, long guide arcs, construction lines, and brush curves on rigid borders.
4. **Semantic audit**: crop risky zones and confirm they read without the source image.
5. **Consistency audit**: compare adjacent frames for character identity, hair shape, face placement, clothing, props, and background stability.
6. **Motion audit**: review in-betweens for popping, floating features, vanishing props, or tails/captions drifting from the speaker.
7. **Visual diff audit**: use pixel-diff sheets to find unwanted shimmer in locked backgrounds, sudden speech-bubble jumps, disappearing props, or frame changes that are larger than the intended action.
8. **Material enhancement**: add richer pen, pencil, crayon, charcoal, or paint texture after the form is clear.
9. **Browser/export check**: re-render and verify playback, scrubbing, PNG export, and MP4 export.

## Texture Rules

- Structure comes before texture. Do not hide unclear construction with crayon, charcoal, hatching, or ink noise.
- If a correction leaves a visible seam, plug, ring, or mismatched material, undo that patched correction and redraw from the source anchors or path geometry.
- Use the lighthouse for stroke direction and density, not as a pasted layer.
- Add texture as many small directional strokes, wax gaps, pressure variation, dry-brush marks, or smudges; speckles alone do not count.
- Use the Canvas brush contact sheet after preset brush changes: `npm run canvas:brushes`.
- Ink, pencil, charcoal, crayon, marker, watercolor, gouache, acrylic, oil paint, airbrush, sponge, and screen-tone should look materially distinct before they are used to polish a video.
- Keep important text readable after texture is added.
- If frame-to-frame texture shimmer appears, confirm brush and material calls use stable seeds. Prefer `createBrush()` presets for new work; use shared helpers in `src/illustration-tools.js` or `src/material-tools.js` only where the renderer already depends on them.

## Tool Choice

- Use the existing canvas renderer, `src/inky-canvas.js`, and extracted path geometry for deterministic video frames. Keep `src/material-tools.js` only for specialist/legacy material renderers that already need it.
- Use `storyboard:visual-diff` after rendered PNGs exist; it helps detect flicker and drift but does not replace lighthouse review.
- Consider **Anime.js** when a project needs reusable timelines, object-property keyframes, easing, staggering, or seekable choreography outside the frame renderer.
- Consider **Motion** for app UI transitions, gestures, springs, or layout animation controls; it is not the default choice for exported canvas frame cleanup.
- Consider **Fabric.js** when building an interactive editor with selectable objects, grouped layers, controls, rich text, or SVG import/export.
- Consider **Atrament** when capturing live human drawing strokes, pressure, smoothing, or stroke replay for a brush editor. Borrow its pressure/smoothing ideas for procedural brushes before adding it as a dependency.

## Required Fix Checks

Before approving the polish pass, explicitly check:

- Speech/thought bubble tail points to the intended speaker.
- Speech bubbles are constructed as one continuous body+tail path, not repaired with post-draw patches.
- Speech/thought bubble body and tail read as one clean solid fill, with no background-colored wedge, eraser seam, or patch at the tail join.
- Speech bubbles contain no visible tail socket circles, ovals, or thought-dot marks. Visible dots are only for thought bubbles.
- Hair has a part, hairline, strand groups, or side locks; it is not a single blob.
- Rigid borders, labels, panels, desks, frames, and nameplates are drawn with closed paths or straight segments, not wandering brush arcs.
- Hands/arms/legs attach through visible joints or overlap cues.
- Clothing follows the body chain: shirt hem overlaps waistband, waistband travels with the torso, and limbs exit from sleeves or leg openings instead of appearing beside the garment.
- Baggy clothing has seams, cuffs, openings, folds, and limb exits.
- Shorts read as shorts: waistband, two leg openings, center seam/crotch split, and legs exiting underneath are all visible.
- Recurring props do not vanish during key frames or in-betweens.
- Storyboard-only marks have been removed or translated into actual timing.
- Pixel-diff review does not show unexplained movement in locked backgrounds, labels, captions, or bubbles.
- The final fix is a redraw/rebuild of the broken source geometry or layer order, not a visible cover-up.

## Output

Return:
- `Pass`: what reads clearly.
- `Fix before final`: frame/object defects with concrete redraw instructions.
- `Enhancement notes`: texture, detail, timing, or tooling improvements to apply.
- `Verification`: which browser/export checks passed.
