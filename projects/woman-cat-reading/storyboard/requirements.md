# woman-cat-reading Requirements

This document holds storyboard-specific decisions for the current run. Keep reusable process rules in skills; keep concrete character, prop, style, and frame details here.

## Source

- Storyboard image: `projects/woman-cat-reading/image/storyboard_input.png`
- Extracted frames: `projects/woman-cat-reading/storyboard`
- Grid: 3 columns x 4 rows

## User Request

Create a clean animated video from the storyboard: a woman relaxes on a cream sofa reading a green book, notices her orange-and-white cat entering, the cat walks closer, crouches, jumps onto the sofa, sits beside her, then curls on her lap while she keeps reading. Use the storyboard as a lighthouse only; do not show, paste, trace, sample, or hide the source bitmap in the final canvas. Remove panel numbers, comic borders, labels, and storyboard-only motion marks from the animated frame. Use ink-style outlines with dry textured color, not watercolor washes.

## Required Output

- Final deliverable: a clean browser animation and rendered MP4 video.
- Animation length / pacing: 12 key scenes, handmade bridge frames, approximately 7.5 seconds at 12 fps.
- Video format: MP4 rendered from the canvas-sized artwork.
- Browser route for review: local Vite app from this `inky/` folder.

## Visual Style

- Medium: ink-style outlines with dry textured color, closer to colored pencil / soft crayon / technical pen than watercolor.
- Material kit: `technical-pen` for clean contours and small face/hand/book/cat details; `colored-pencil` for sofa, clothing, cat patches, plant, and wall art texture; light `graphite-pencil` for soft shadows and sofa seams.
- Line quality: clean but handmade black outlines with slight wobble; no visible comic panel borders or numbers.
- Color palette: warm cream sofa, off-white trousers, black sweater and hair, muted green book, mustard yellow shoes, terracotta plant pot, green leaves, orange-and-white cat, beige wall art.
- Texture density: dry crosshatch and stippled texture in sofa cushions, cat patches, book cover, plant leaves, shoes, and quiet floor shadows.
- Reference/lighthouse rule: use extracted storyboard frames for pose/action guidance only; no source bitmap is shown, pasted, hidden, traced, or sampled in the final canvas.
- Storyboard guide marks: remove panel numbers, borders, jump arcs, emphasis ticks, and any construction marks unless redrawn as short local accents that clarify action.

## Character And Identity Anchors

- Woman identity: one adult woman reading on a puffy cream sofa, relaxed posture with crossed legs, black sweater, white wide-leg trousers, mustard flats, dark hair in a top bun.
- Head / hair: small calm face with side-parted dark hair and rounded bun; head remains attached to neck/shoulder line.
- Face details: simple eyes/nose/mouth; hidden or partly visible behind book in early frames; soft smile when she notices the cat.
- Mouth / expression: neutral reading focus early, small pleased smile as cat climbs onto sofa and lap.
- Clothing / body: black long-sleeve sweater, white trousers with clear leg overlap and ankle exits, mustard shoes.
- Hands / limbs: hands hold the green book and must attach through wrists/sleeves; crossed legs must remain connected through hips/knees/ankles.
- Cat identity: one orange-and-white cat with orange head patch, orange back patch, orange tail, white chest/legs, pointed ears, long tail, small readable eyes and nose.

## Recurring Props And Environment

- Primary props: muted green open book, cream puffy sofa, orange-and-white cat.
- Surface / setting: calm living room with sofa, left potted plant, simple wall art, warm floor shadow.
- Background: stable light wall, plant on left, framed art on right; no panel layout in animated canvas.
- Items that must be removed or changed: remove all panel numbers, black storyboard panel borders, long jump guide arcs, and storyboard-only emphasis marks.

## Frame Requirements

| # | Action / pose | Lighthouse evidence | Attachment chains | Semantic risks | Notes |
|---|---|---|---|---|---|
| 1 | Woman reads alone on sofa | Woman centered-left, book held in front of face, crossed legs | Head -> neck -> torso; shoulders -> sleeves -> hands -> book; hips -> crossed legs -> shoes | Hands hidden by book; crossed legs disconnect | Quiet opening |
| 2 | Cat appears at right edge | Cat sits/stands near sofa right, woman still reading | Cat head -> neck -> body -> tail; paws grounded | Cat too small or cut off | Establish cat |
| 3 | Cat walks left toward sofa | Cat side profile walking under sofa edge | Cat spine chain and four legs attached | Walking paws float | Tail up |
| 4 | Cat stops and looks up | Cat near sofa front, woman hidden behind book | Cat face turned up, paws grounded | Cat gaze unclear | Anticipation |
| 5 | Cat passes in front of sofa | Cat crosses nearer woman’s feet | Cat body and tail connected; woman legs remain clear behind | Cat overlaps shoe/sofa confusingly | Smooth approach |
| 6 | Cat crouches to jump | Cat lowered with small alert marks in source | Body compresses, paws touch floor, tail curves | Crouch reads as lying down | Remove source alert ticks unless redrawn locally |
| 7 | Cat jumps onto sofa | Cat airborne with jump direction from right to sofa | Body elongated, legs attach, tail follows | Do not draw long jump guide arcs as final lines | Use body motion only |
| 8 | Cat sits beside woman | Cat upright on right sofa cushion | Paws rest on cushion; tail wraps | Cat floats on cushion | First sofa contact |
| 9 | Woman notices cat | Woman smiles, book lowers slightly, cat sits close | Head/neck visible; hand/book still attached | Face hidden or book floats | Short surprise ticks allowed near head only |
| 10 | Cat steps across sofa toward lap | Cat walks over cushion near woman’s knees | Cat paws contact cushion/knee area | Cat merges with trousers | Keep orange patch clear |
| 11 | Cat curls on lap | Cat rests across woman’s lap while she reads | Cat body supported by lap; woman hands/book attached | Cat body becomes blob; lap contact unclear | Cozy beat |
| 12 | Final calm reading cuddle | Cat curled asleep on lap, woman smiling and reading | Same as frame 11, stable relaxed pose | Missing cat face/tail | End hold |

## Validation Gates

- Construction blueprint reviewed before detailed rendering.
- Still frames pass semantic clarity review.
- Adjacent frames pass consistency review.
- Browser check confirms source images are not visible in the final art.
- Final video renders and plays back.
