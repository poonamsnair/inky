# blond-fruit-salad-crayon-ink Requirements

This document holds storyboard-specific decisions for the current run. Keep reusable process rules in skills; keep concrete character, prop, style, and frame details here.

## Source

- Storyboard image: `projects/blond-fruit-salad-crayon-ink/image/storyboard_input.jpg`
- Extracted frames: `projects/blond-fruit-salad-crayon-ink/storyboard`
- Grid: 4 columns x 3 rows

## User Request

Create a brand new animated project: a blond woman cuts and prepares a fruit salad in a bright kitchen. Use the storyboard as a lighthouse only; do not paste, trace, sample, or hide the source bitmap in the final canvas. Remove panel numbers, black panel borders, labels, and guide marks. Use waxy crayon fills and black ink outlines with actual procedural brush strokes.

## Required Output

- Final deliverable: browser animation and rendered MP4.
- Animation length / pacing: 12 key scenes, 90 frames at 12 fps, approximately 7.5 seconds.
- Video format: MP4 rendered from canvas frames.
- Browser route for review: local Vite app from this `inky/` folder.

## Visual Style

- Medium: waxy crayon color fills, black ink outlines, small technical-pen details.
- Material kit: `wax-crayon` and `oil-crayon` for broad fruit, table, apron, shirt, hair, and kitchen color; `dip-ink` / `brush-pen` for contours and lively strand/cloth lines; `technical-pen` for eyes, fingers, knife edge, fruit seeds, bowl rim; `graphite-pencil` for soft shadows and cutting-board scratches.
- Line quality: imperfect black ink contours with variable pressure; no clean vector icon style.
- Palette: blond hair, blue shirt, cream apron, warm wooden counter and cutting board, white ceramic bowl, red strawberries/apples, green grapes/kiwi, orange slices, pink watermelon, blue berries, sunny kitchen background.
- Texture density: visible waxy crayon strokes and paper-tooth gaps. Use procedural brush patterns/scumbles from `src/material-tools.js`, not speckle-only texture.
- Reference/lighthouse rule: source panels guide pose, contact, scale, and story timing only. Final canvas contains no source bitmap.
- Storyboard cleanup: remove all black panel borders, panel numbers, crop edges, and guide marks.

## Character And Identity Anchors

- Character identity: one adult blond woman preparing fruit salad in a bright kitchen.
- Head / hair: loose blond bun with a few curls/fringe; head connects through neck to shoulders.
- Face details: simple eyes, nose, cheeks, gentle smile or focused expression; face details stay attached to head.
- Mouth / expression: focused while cutting, pleased when tasting, smiling while presenting the bowl.
- Clothing / body: blue rolled-sleeve shirt, cream apron, torso leaning over counter when cutting and upright when presenting.
- Hands / limbs: arms and wrists attach through sleeves; knife hand grips handle; guide hand holds fruit safely; both hands support bowl in the final shot.
- Safety/readability: knife must read as a kitchen knife, not a stray line; fingers must stay separated from the blade with clear overlap.

## Recurring Props And Environment

- Primary props: cutting board, kitchen knife, large white salad bowl, smaller berry bowl, fruit pieces.
- Fruit anchors: strawberries, grapes, apples, kiwi slices, orange segments, watermelon cubes, blueberries, mixed fruit salad.
- Surface / setting: warm kitchen counter with window, sink/faucet in washing beat, shelf/jars, potted herbs or plant, sunlight.
- Background: stable kitchen set; do not animate shelves/window unless using tiny hand-drawn shimmer.
- Items that must be removed or changed: remove panel numbers, panel borders, source crop seams, and any storyboard-only marks.

## Frame Requirements

| # | Action / pose | Lighthouse evidence | Attachment chains | Semantic risks | Notes |
|---|---|---|---|---|---|
| 1 | Fruit selection | Woman leans over fruit spread; berries, grapes, melon visible | Head -> neck -> torso; arms -> hands -> fruit/counter | Fruit clutter hides hands | Establish kitchen and ingredients |
| 2 | Washing fruit | Woman rinses red fruit in colander at sink | Hands hold fruit/colander; water aligns with faucet | Water/colander unclear | Short local water strokes allowed |
| 3 | Prepping board | Woman sets cutting board and bowl | Hand contacts board; bowl rests on counter | Board floats | Transition to cutting station |
| 4 | Slicing strawberries | Knife hand cuts red fruit on board | Shoulder -> elbow -> wrist -> knife; other hand holds fruit | Knife/fingers merge | First cutting beat |
| 5 | Peeling/slicing orange | Woman cuts orange segments | Knife and orange peel attached; bowl nearby | Orange peel becomes random ribbons | Use clear orange wedges |
| 6 | Slicing apple | Apple wedges on board | Knife contacts apple; hand holds apple | Apple wedges look like loose triangles | Keep red skin edges |
| 7 | Slicing kiwi | Green kiwi rounds on board | Knife contacts kiwi; slices line up | Kiwi seeds overtexture | Technical-pen seed dots |
| 8 | Cubing watermelon | Pink cubes on board; watermelon wedge nearby | Knife cuts cubes; fruit pile grounded | Cubes become bricks | Keep rind/watermelon color context |
| 9 | Pouring grapes | Woman pours grapes into big bowl | Bowl supported; grapes fall into bowl | Falling fruit floats oddly | Use short local falling clusters only |
| 10 | Stirring salad | Woman stirs full bowl with spoon | Hand -> spoon -> bowl; bowl rests on counter | Spoon disappears into fruit | Show rim and handle |
| 11 | Tasting | Woman lifts spoon to mouth | Bowl held/grounded; spoon touches mouth | Spoon/face detach | Pleasant tasting beat |
| 12 | Presenting salad | Woman holds large bowl toward viewer | Both hands support bowl; face visible | Bowl floats, hands hidden | Final smiling hold |

## Validation Gates

- Construction blueprint reviewed before detailed rendering.
- Still frames pass semantic clarity review.
- Adjacent frames pass consistency review.
- Browser check confirms source images are not visible in the final art.
- Final video renders and plays back.
