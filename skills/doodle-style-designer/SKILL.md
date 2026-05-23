---
name: doodle-style-designer
description: Choose and apply doodle-specific drawing tools, helpers, and optional libraries for black-ink, portrait, fashion, studio-wall, and reference-matched doodle animation styles.
---

# Doodle Style Designer

Use this when the user asks for doodle-like, sketchy, black-ink, handdrawn, marker, comic doodle, portrait doodle, or loose illustrated styles.

## Required Order

1. Read the active project requirements and source/reference images.
2. Choose a profile from `src/doodle-style-tools.js` before renderer work begins.
3. If the source has complex line art, consider `src/reference-vector-tools.js` for OpenCV/Potrace contour hints.
4. Write the chosen profile and material kit into the project requirements.
5. Build semantic objects from continuous silhouettes first: head, hair, hands, sleeves, clothing, shoes, props, wall sheets.
6. Add doodle ink contours with `doodle-ink`, not soft paint or vector-clean outlines.
7. Add clothing patterns with clipped strokes so stripes/checks belong to the garment.
8. Use `drawInkDoodleHand()` for loose cartoon hands instead of separate capsule fingers.
9. Run `npm run storyboard:doodle-style -- projects/<project-name>` after frames exist.
10. Run a final visual check against the references before exporting video.

## Tool Choice

- `doodle-ink`: primary black contour tool for hands, faces, hair, clothes, shoes, and props.
- `technical-pen`: tiny dots, freckles, eyes, buttons, tool details, and readable marks.
- `ballpoint-pen`: checkered shirts, hatching, wall doodles, and dry interior marks.
- `charcoal` or `ink-wash`: dry black filled shirts, sleeves, hair masses, and shadows.
- `marker` or `colored-pencil`: small color accents such as pink overalls or yellow tools.
- `RoughJS`: safe only for non-semantic wall notes, background posters, dust, paper scraps, and harmless texture.
- `OpenCV/OpenCV.js`: useful before drawing to find structural contours, connected components, bounding boxes, and repeated line groups.
- `Potrace`: useful before drawing to turn selected black-and-white masks into path hints. Re-ink those hints with Inky tools; do not paste raw traced paths as final art.
- `Paper.js`: useful for planning and smoothing paths, then converting to deterministic canvas paths.
- `ZIMjs`: future/live pen capture option for custom nibs, brush dampening, ink spread, and automated pen-drag replay. Do not depend on it for final MP4 export until a deterministic bridge exists.

## Doodle Verification

Before handoff, check:

- Hands read as organic drawn hands, not assembled capsule fingers.
- Ink contours are bold, imperfect, and black enough.
- Faces stay simple: dots, small noses, simple mouths, light freckles or brows.
- Hair uses repeated doodle strokes or cloud/strand silhouettes, not a smooth helmet.
- Clothing patterns are clipped to the clothing and move with it.
- Background doodles stay lighter than the character and do not turn into story-critical props.
- The final frame still looks like the references at thumbnail size.
- `outputs/review-doodle-style/doodle-style-report.md` is Pass, or every Review note has been fixed or deliberately explained.
