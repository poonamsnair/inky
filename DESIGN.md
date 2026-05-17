# Inky Design Notes

Inky creates clean HTML/CSS/JS animated drawings from storyboard references.

The final artwork must be drawn in code. The reference image can guide decisions, but must not be pasted, hidden, traced as final art, or used as a visible layer.

## App Behavior

- Inky starts with no active animation.
- A project becomes active only when the user creates or selects one.
- The first screen is the new storyboard animation setup, not an example project.
- After a project is selected or built, the animation canvas becomes the preview surface.
- No project query param means Create Project mode.
- `?project=<project-slug>` means Preview Project mode and must load that project's manifest and renderer.
- The timeline controls sit below the canvas when an animation is loaded.
- Controls must be real HTML buttons and inputs:
  - Play
  - Pause
  - Timeline slider
  - Playback speed setting
  - Export current frame as PNG
  - Export project MP4 matching the selected playback speed
- When a project has captions, controls may also include:
  - CC toggle
  - Export WebVTT captions
  - Export SRT captions
- Panel numbers and storyboard captions stay out of the animated frame.
- Export mode uses the canvas only, with no browser controls.

## Drawing Method

Use the storyboard as a lighthouse:

- It guides pose anchors, contact points, silhouettes, scale, and action beats.
- It guides contour emphasis, hatching direction, texture density, and material choice.
- It does not require a perfect match.
- It must prevent obvious bugs such as disconnected heads, floating limbs, missing props, or implausible overlaps.
- It must not contribute panel numbers, borders, labels, long arrows, or long jump/throw guide arcs to the finished animated frame.

Draw in this order:

1. Paper and chosen material background.
2. Simple construction anchors.
3. Body chains and prop contact points.
4. Main silhouette.
5. Remove or translate storyboard-only guide marks.
6. Ink contours.
7. Dry color, watercolor, gouache, pencil, crayon, charcoal, or other chosen material texture.
8. Dense hatching and texture.
9. Final clarity pass.

## Project Manifest

Each project has one source of truth at `projects/<project-name>/project.json`. The app and tools should read that manifest instead of guessing frame counts, dimensions, renderer filenames, export paths, or an active project name.

The manifest includes:

```json
{
  "slug": "cat-yarn-watercolor",
  "title": "Cat Yarn Watercolor",
  "status": "draft",
  "width": 960,
  "height": 620,
  "fps": 12,
  "totalFrames": 96,
  "grid": {
    "columns": 3,
    "rows": 4
  },
  "storyboard": {
    "sourceImage": "image/storyboard.png",
    "framesDir": "storyboard"
  },
  "prompt": {
    "requirements": "storyboard/requirements.md",
    "agentPrompt": "prompt/agent-prompt.md"
  },
  "tracks": {
    "speechBubbles": null,
    "captions": null
  },
  "renderer": "renderer.js",
  "outputs": {
    "frames": "outputs/frames",
    "video": null
  }
}
```

`src/main.js` must stay generic. It should not import project-specific JSON, project-specific renderers, or hard-code export paths. Project renderers live at `projects/<project-name>/renderer.js` and export `project` metadata plus `drawFrame(ctx, frame, helpers)`.

## Polish Pass

The first draw or first full render is a draft. Use `animation-polish-pass` after risky frames and before final export.

When a bug is obvious, rebuild the shape at its source. Do not hide drawing errors with cover-up geometry, eraser seams, color patches, opacity tricks, or late texture. Return to the lighthouse, construction anchors, and intended object parts, then redraw the broken body chain, prop, bubble, label, or material layer correctly.

Polish means:

- Compare the rendered frame back to the source lighthouse for pose, contact, silhouette, scale, and text ownership.
- Close visual gaps first: necks, wrists, sleeves, hands, tails, props, labels, shadows, and contact points.
- Remove accidental storyboard artifacts such as panel borders, frame numbers, construction lines, long motion arcs, or guide marks.
- Fix common drawing bugs before adding detail: speech tails on the wrong character, decorative borders turning into loose curves, hair becoming a blob, baggy clothing reading as a ball, and props disappearing between frames.
- Use object-part clarity checks for risky items before texture. For example, shorts require waistband, two leg openings, center seam/crotch split, and visible leg exits; a single rounded shape does not pass.
- Use parent-child attachment checks for bodies and clothing. Garments must be anchored to body parts before texture: shirt hem overlaps waistband, waistband moves with torso, and limbs exit from openings or sleeves.
- Use clean text-shape checks for speech bubbles. Bubble bodies and tails should be constructed as one continuous closed path and filled/stroked once; colored leaks, eraser seams, or patches at tail joins fail polish.
- Speech bubbles should not show socket rings, ovals, or dot trails. Those marks are reserved for thought bubbles.
- If a fix creates visible seams, plugs, rings, or mismatched texture, discard that patched attempt and redraw the underlying path or layer.
- Review in-betweens for popping, floating features, drifting captions/bubbles, and missing recurring props.
- Use numeric eased timing from the in-between plan. `linearT`/`t` are the old even spacing; `motionT` should drive animated anchors, while `easedT` is available for local anticipation, settle, bounce, or impact accents.
- Add richer texture only after the structure reads clearly.

Checklist generator:

```bash
npm run storyboard:polish -- projects/<project-name>
```

## Material Tools

Use `src/material-tools.js` when drawing canvas frames. It provides reusable brush presets such as `technical-pen`, `dip-ink`, `brush-pen`, `fountain-pen`, `ballpoint-pen`, `marker`, `graphite-pencil`, `colored-pencil`, `wax-crayon`, `oil-crayon`, `pastel`, `charcoal`, `watercolor`, `ink-wash`, `salt-watercolor`, `gouache`, `acrylic`, `oil-paint`, `airbrush`, `sponge`, and `screen-tone`.

Pick a small material kit for the selected project. For example, `blond-fruit-salad-crayon-ink` uses dip-ink / brush-pen outlines with wax-crayon and oil-crayon pattern strokes plus light graphite shadow, not watercolor washes.

Material fills should use actual procedural stroke systems, not only flat color plus speckles. Use `drawMaterialScumble`, `drawMaterialBrushStroke`, `drawBristleStroke`, `drawDryMediaFill`, `drawMaterialWash`, `fillClippedMaterial`, and `fillMaterialGradient` for visible brush direction, wax gaps, bristle dabs, graphite scratches, charcoal dust, watercolor blooms, wet-edge pooling, gradient glazes, or oil-paint streaks.

Use `drawCoherentPaperGrain` for stable paper texture, pressure profiles inside `drawMaterialStroke` for tapered ink/pencil/crayon marks, and `ensureReadableColor` before drawing text over bubbles, captions, labels, or colored props.

Material selection is a drawing-system capability. The default app UI should stay focused on playback, timeline scrubbing, and export unless a project specifically asks users to switch brushes themselves.

Use `npm run storyboard:materials` after changing material recipes. The generated contact sheet is the quick visual check that ink, dry media, wax, wash, paint, and effect tools look materially different and do not shimmer from frame to frame.

Do not make core material quality depend on `CanvasRenderingContext2D.filter`; it is not baseline across browsers. Prefer offscreen patterns, gradients, blend modes, seeded noise, clipped layers, and repeated low-opacity strokes.

## Library Selection

Prefer the existing canvas frame renderer for final video output. Add outside libraries only for a clear missing capability:

- Anime.js: object-property timelines, keyframes, easing, staggering, and seekable choreography for JS objects, SVG, or DOM elements.
- Motion: app UI transitions, gestures, springs, and layout animation around the canvas.
- Fabric.js: an interactive editor layer with selectable canvas objects, grouped layers, controls, rich text, and SVG import/export.
- Atrament: live drawing input with pressure, smoothing, adaptive stroke width, and stroke replay for a future brush editor.

For current frame-by-frame renders, borrow the ideas from those tools when useful, but keep the exported artwork deterministic and built from Inky drawing functions.

RoughJS is available only as a guarded accent helper in `src/rough-accent-tools.js`. Use it for non-semantic background texture or loose accents. Do not use it for speech bubbles, readable text, rigid borders, body silhouettes, faces, hands, labels, or story-critical contact points.

## Visual Diff QA

After rendering a first pass of PNG frames, create a pixel-diff review:

```bash
npm run storyboard:visual-diff -- projects/<project>/outputs/frames projects/<project>/outputs/review-visual-diff
```

Use the diff report to find unwanted shimmer in locked backgrounds, popping props, drifting speech bubbles/captions, and frame-to-frame changes that are larger than the intended action. This is a detector; final approval still comes from the lighthouse and polish pass.

## Export Library Note

`mp4-muxer` remains in the dependency list for now, but it is deprecated upstream and is not the active final-video quality path. Do not expand new export work around it. When implementing real in-browser MP4 writing from canvas frames, migrate that export path to Mediabunny instead of adding another muxer.

## Caption Tools

Use `src/caption-tools.js` for timed text. Caption tracks live at `projects/<project>/storyboard/captions.json` and can be generated from `captions.txt` with `npm run storyboard:captions`.

Captions are optional by default. Use `?captions=1` to preview or bake captions into exported frames. Prefer VTT/SRT sidecars when the user wants subtitles that can be toggled by the video player.

## Speech Bubble Tools

Use `src/speech-bubble-tools.js` for comic dialogue balloons, thought bubbles, and speaker tails. Bubble tracks live at `projects/<project>/storyboard/speech-bubbles.json` and can be generated from `speech-bubbles.txt` with `npm run storyboard:speech-bubbles`.

Speech bubbles are artwork, not subtitle controls. Draw them in the frame when they are part of the comic story, keep their tails attached to the correct speaker, and keep them clear of faces, hands, and punchline props.

## New Project State

Inky starts with no active animation.
A project becomes active only when the user creates or selects one.

Example projects can live in docs, samples, or `projects/`, but the app must not automatically load an example project, import project-specific JSON, or hard-code project export paths at startup.
