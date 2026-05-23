# Style Proof Illustration Requirements

## Lighthouse

- User references: `image/reference-1.png`, `image/reference-2.png`, `image/reference-3.png`, and `image/reference-4.png`.
- Use them only as lighthouses for style: bold black hand-drawn contours, white negative space, dry black fills, simple dot/oval faces, bob/curly hair made from repeated ink strokes, striped/checkered clothing, doodled posters, and tiny pink/yellow accents.
- Do not draw the reference bitmaps into the canvas.

## Animation

- 960 x 620 canvas, 72 frames, 12 fps.
- The video should feel like the illustration draws itself in stages: blank paper, wall doodles, character outline, black fills, pink striped overalls, tools/pockets, then final texture and shadow.
- The final frame should read as a finished black-ink doodle illustration: a playful studio character in pink striped overalls, black sleeves, simple face, loose hair, hand gesture, and doodled wall sheets.

## Material Kit

- Paper: clean white/off-white `drawPaperScene()` from `src/illustration-tools.js`.
- Ink: `doodle-ink`, `brush-pen`, `technical-pen`, `ballpoint-pen`, and dry `charcoal`/`ink-wash` fills.
- Color: nearly monochrome, with pale pink overalls and small yellow tool accents only.
- Use stable seeds for all locked texture.

## Construction Rules

- Use `src/illustration-tools.js` helpers for progressive contours, constructed fills, paper setup, deterministic timing, readable labels if any text is added, and body-chain anchors.
- Body chain: head -> neck -> torso -> shoulders -> sleeves -> forearms -> wrists -> hands.
- Clothing chain: torso owns shirt, black sleeves connect to wrists, overalls attach with straps and bib, trouser openings own legs.
- Props must be drawn from recognizable parts: scissors have two loops and blades, pencil has body and tip, wall sheets have paper edges plus interior doodle marks.
- Early guide marks may appear only as intentional draw-on animation; the final frame must not leave construction marks or storyboard-only arrows.

## Polish Gate

- Final frame must show connected hands, wrists, sleeves, head, neck, and torso.
- Overalls, tools, wall sheets, and shadow should not vanish during in-betweens.
- Locked background and paper grain should not shimmer.
- Texture should be visible as dry black fill, directional line stripes, hatching, and imperfect brush contours, not speckles alone.
