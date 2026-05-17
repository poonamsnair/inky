# woman-cat-reading-crayon-ink Requirements

This document holds storyboard-specific decisions for the current run. Keep reusable process rules in skills; keep concrete character, prop, style, and frame details here.

## Source

- Storyboard image: `projects/woman-cat-reading-crayon-ink/image/storyboard_input.png`
- Extracted frames: `projects/woman-cat-reading-crayon-ink/storyboard`
- Grid: 3 columns x 4 rows

## User Request

Create a new version of the woman-reading-with-cat animation using a crayon and ink effect. Use the storyboard as a lighthouse only; do not paste, trace, sample, or hide the source bitmap in the final canvas. Remove panel numbers, borders, long jump arcs, labels, and guide marks. Show the user what this version looks like with a browser preview frame before doing a full video render.

## Required Output

- Final deliverable: a separate browser animation project preview, with optional MP4 render after visual approval.
- Animation length / pacing: same 12-scene story structure as the woman-cat-reading project; 90 frames at 12 fps.
- Video format: MP4 can be rendered to `projects/woman-cat-reading-crayon-ink/outputs/woman-cat-reading-crayon-ink.mp4`.
- Browser route for review: local Vite app from this `inky/` folder.

## Visual Style

- Medium: chunky wax-crayon color fills plus black ink outlines.
- Material kit: `dip-ink` and `brush-pen` for expressive outlines; `oil-crayon` and `wax-crayon` for broad hand-stroked color; `colored-pencil` for smaller accents; `charcoal` and `graphite-pencil` only for soft shadows.
- Line quality: darker, more playful, slightly uneven ink contours with hand pressure; small face/book/cat details remain readable with `technical-pen`.
- Palette: warmer and a bit more saturated than the first version: cream sofa, black sweater, white trousers, mustard shoes, green book, terracotta pot, green plant, orange-and-white cat.
- Texture density: visibly crayon-like, with real procedural stroke passes, broken wax grain, scribbly hatching, larger rough color clumps, and visible direction changes. Avoid smooth flat sticker fills or speckle-only texture.
- Reference/lighthouse rule: use the extracted storyboard frames for pose/action guidance only; no source bitmap is shown, pasted, hidden, traced, or sampled in the final canvas.
- Storyboard guide marks: remove panel numbers, borders, long jump arcs, emphasis marks, and construction marks unless they become very short local motion ticks.

## Character And Identity Anchors

- Woman identity: adult woman reading on a puffy cream sofa, relaxed crossed-leg posture, black sweater, white wide-leg trousers, mustard flats, dark hair in a top bun.
- Head / hair: rounded face, dark side-parted hair, large bun; head visibly connected to neck and sweater.
- Face details: simple ink eyes, nose, cheeks, and smile; early frames can be partly hidden by the book; later frames show a pleased expression.
- Mouth / expression: neutral reading focus early, soft smile when she notices the cat and when the cat curls on her lap.
- Clothing / body: sweater is a dark ink mass with crayon scumble; trousers are two clearly separate wide legs with cuffs, seam marks, and ankle exits.
- Hands / limbs: hands attach through sleeves and visibly hold the green book; crossed legs attach through hips/knees/ankles.
- Cat identity: one orange-and-white cat with pointed ears, orange patches, long orange tail, readable head/body/tail chain, and paws that contact floor, sofa, or lap.

## Recurring Props And Environment

- Primary props: green open book, puffy cream sofa, orange-and-white cat.
- Surface / setting: cozy living room with left potted plant, right wall art, and warm floor shadow.
- Background: stable wall and floor; no comic panel layout in the animated canvas.
- Items that must be removed or changed: remove panel numbers, black panel borders, long jump guide arcs, labels, and guide marks from final art.

## Frame Requirements

| # | Action / pose | Lighthouse evidence | Attachment chains | Semantic risks | Notes |
|---|---|---|---|---|---|
| 1 | Woman reads alone on sofa | Woman centered-left, book held in front of face | Head -> neck -> sweater; shoulders -> sleeves -> hands -> book; hips -> crossed legs -> shoes | Hands hidden by book; trousers merging into one shape | Quiet crayon texture opening |
| 2 | Cat appears at right edge | Cat near sofa right, woman still reading | Cat head -> body -> tail; paws grounded | Cat too small or cut off | Establish cat |
| 3 | Cat walks left | Cat side profile below sofa edge | Spine chain and legs attached | Walking paws float | Tail up |
| 4 | Cat stops and looks up | Cat near sofa front, gaze toward woman | Cat face turned up; paws grounded | Cat gaze unclear | Anticipation |
| 5 | Cat crosses front | Cat passes near woman’s feet | Cat body/tail connected; legs remain clear behind | Cat merges with shoe/sofa | Keep cat patch readable |
| 6 | Cat crouches | Cat compresses before jump | Body lowered; paws touch floor; tail curves | Crouch reads as lying down | No source alert marks except tiny local ticks |
| 7 | Cat jumps | Cat airborne toward sofa | Body elongated, legs attached, tail follows | Do not draw long jump guide arcs | Use motion through pose |
| 8 | Cat sits beside woman | Cat upright on sofa cushion | Paws rest on cushion; tail connected | Cat floats | First sofa contact |
| 9 | Woman notices cat | Woman smiles, book lowers slightly | Face/neck visible; book still held | Face hidden or book floats | Short surprise ticks allowed near head only |
| 10 | Cat steps toward lap | Cat moves over sofa near knees | Paws contact cushion/knee area | Cat merges with trousers | Use ink separation line |
| 11 | Cat curls on lap | Cat rests across woman’s lap | Cat supported by lap; woman still holds book | Cat becomes blob | Keep head/tail/patch visible |
| 12 | Calm cuddle | Cat sleeps on lap while woman reads | Same as frame 11 | Missing cat face/tail | End hold |

## Validation Gates

- Construction blueprint reviewed before detailed rendering.
- Still frames pass semantic clarity review.
- Adjacent frames pass consistency review.
- Browser check confirms source images are not visible in the final art.
- Final video renders and plays back.
