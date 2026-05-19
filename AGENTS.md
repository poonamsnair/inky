# Inky Agent Guide

Inky is the source of truth for the hand-drawn storyboard animation app.

Always start here:

1. Read this file.
2. Read `DESIGN.md`.
3. Read the relevant skill files in `skills/`, especially:
   - `storyboard-animation-pipeline`
   - `reference-lighthouse`
   - `frame-construction-planner`
   - `inbetween-frame-planner`
   - `semantic-clarity-auditor`
   - `frame-consistency-auditor`
   - `animation-polish-pass`
   - `annotation-fix-pipeline` when browser/video/canvas annotations, selected-frame comments, or annotation screenshots are pasted for repair
   - `caption-subtitle-tooling` when captions, subtitles, scripts, or timed text are requested
   - `comic-speech-bubble-tooling` when comic speech bubbles, thought bubbles, or character dialogue are requested
4. If the user has created or selected a project, read `projects/<project-name>/project.json` and its brief at `projects/<project-name>/storyboard/requirements.md`.
5. Run the app from this `inky/` folder, not the older parent experiment folder.

Use plain-language progress updates. Explain what you are trying to do in nontechnical terms each step of the way.

## Material Tools

Canvas drawing code can use `src/material-tools.js` for reusable brush and texture helpers. Pick a small material kit per project instead of inventing one-off strokes:

- `technical-pen` for crisp outlines, tiny face/hand details, prop edges, seams, and buttons.
- `dip-ink`, `fountain-pen`, or `brush-pen` for expressive silhouettes, hair, folds, handwriting, and local motion ticks.
- `ballpoint-pen` for scratchy office doodles, fine crosshatching, tiny notes, and subtle pen shading.
- `marker` for broad translucent cartoon color and poster-like hand-filled areas.
- `graphite-pencil` for soft construction, shadows, and subtle fabric folds.
- `colored-pencil`, `wax-crayon`, `oil-crayon`, or `pastel` for dry textured color and broad hand-stroked fills.
- `charcoal` for smoky shadows and dramatic lighting.
- `watercolor`, `ink-wash`, `salt-watercolor`, `gouache`, `acrylic`, or `oil-paint` only when the project style calls for those paint effects.
- `airbrush`, `sponge`, or `screen-tone` for specific effects such as soft glow, mottled wall/foliage texture, or comic halftone shadows.

Brush texture should be made from actual JS stroke passes where possible: scumbled strokes, dabbed bristles, pressure ink lines, scratchy pencil marks, charcoal smears, and crayon/oil-crayon wax gaps. Speckle-only texture is not enough for a brush-material project.

These are agent-side drawing choices, not required UI controls. Only add a visible material selector when the user explicitly asks for one.

Use `ensureReadableColor()` for captions, speech bubbles, labels, and other text-bearing shapes when the background can vary. Use `drawCoherentPaperGrain()` for stable paper tooth instead of random per-frame speckle.

Use `src/rough-accent-tools.js` only for safe non-semantic accents such as background texture, paper edges, wall art, dust, or sparkle marks. Do not use RoughJS for speech bubbles, readable text, labels, borders, desks, frames, hands, faces, body silhouettes, or story-critical contact points.

Do not draw storyboard-only marks as final artwork. Panel numbers, borders, labels, long arrows, long jump/throw arcs, and construction lines should be removed or translated into actual animation timing.

Every story-critical object should be drawn from its identifying parts before texture. If the user or source says "shorts", draw waistband, two leg panels/openings, a center seam/crotch split, and legs exiting underneath; a single rounded blue shape is a clarity failure.

Every body and costume should follow a parent-child chain. Clothing is not a floating decoration: torso owns shirt hem, shirt hem overlaps waistband, waistband owns leg openings, and leg openings own the legs. If a pose shifts, bends, or rotates, the clothing anchor moves with the body.

Speech bubbles should have a clean white fill unless the project brief explicitly says otherwise. The bubble body and tail must be constructed as one continuous closed path, then filled and stroked once; background-colored wedges, eraser seams, or tail patches are rendering bugs.
Do not patch speech-bubble tails with visible circles, ovals, socket rings, or dot trails. Those marks are only for thought bubbles.

## Root-Cause Redraw Rule

When a rendered frame has an obvious bug, fix the cause and redraw or rebuild the affected shape/layer from its construction anchors. Do not retrofit the bug with cover-up shapes, eraser strokes, white patches, opacity tricks, or decorative texture. Use the source lighthouse, requirements, and neighboring frames to reconstruct the form correctly, then rerender and inspect the result.

## Polish Pass

Treat the first drawn frame or first full animation render as a draft. After each risky frame, and always before final video export, use `animation-polish-pass` to compare the output back to the source lighthouse, close body/prop gaps, remove accidental guide marks, fix speech/caption ownership, and add richer texture only after the drawing reads clearly.

Useful helper:

```bash
npm run storyboard:materials
npm run storyboard:polish -- projects/<project-name>
npm run storyboard:visual-diff -- projects/<project-name>/outputs/frames projects/<project-name>/outputs/review-visual-diff
```

Use `npm run storyboard:materials` when changing brush recipes or choosing a material kit. The contact sheet should show visibly different ink, dry media, wax, wash, paint, and effect marks before those materials are used in a finished animation.

Use external animation/drawing libraries only when they fit the missing gap: Anime.js for object timelines, Motion for app UI gestures/transitions, Fabric.js for an editable canvas object layer, and Atrament for live pressure/smoothing stroke capture. The default Inky video renderer should stay deterministic and use `src/material-tools.js`.

Do not build new export work on `mp4-muxer`; it is kept only until the export path is replaced. Use Mediabunny for the future in-browser MP4 encoder when that work begins.

## Project Structure

Each render project must live under:

```text
projects/<project-name>/
├── image/       # original user-provided source image
├── prompt/      # user directions and corrections
├── storyboard/  # extracted frames, requirements, ledgers, blueprints, in-between plans
└── outputs/     # rendered PNG frames, MP4 files, contact sheets, exports
```

Do not copy old experiments, browser scratch files, research notes, or unrelated outputs into a new project folder.

## Quality Gates

Before rendering final video:

- Use the source as a lighthouse for anchors, contact points, silhouettes, and pen-stroke direction.
- Confirm every important body chain is connected.
- Confirm clothing and limbs form plausible parent-child chains.
- Confirm recurring props are visible when the scene implies they should be.
- Confirm chosen brush/material tools support the requested look and do not hide unclear construction.
- Confirm storyboard-only guide marks are absent from the final canvas unless deliberately redrawn as short local action accents.
- Run a polish pass after the first render; fix gaps, stray curves, unclear hair/hands/clothing, and wrong text ownership before final export.
- Redraw/recreate obvious bugs at the source rather than covering them with patches or texture.
- Check in-between frames, not just key frames.
- Run a visual-diff review on rendered frames when there is any risk of flicker, drifting locked backgrounds, vanishing props, or speech-bubble jumps.
- Verify browser controls work: Play, Pause, playback speed, timeline scrub, PNG export, and MP4 export matching the selected speed.
- When captions are part of the project, verify CC toggle, caption placement, and VTT/SRT export.
- When speech bubbles are part of the project, verify text wrapping, bubble tails, speaker ownership, and that bubbles do not hide the important joke/action.
