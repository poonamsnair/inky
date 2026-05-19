# cutting-fruit Requirements

This document holds storyboard-specific decisions for this run. Keep reusable process rules in skills; keep concrete character, prop, style, and frame details here.

## Source

- Storyboard image: `projects/cutting-fruit/image/storyboard.jpg`
- Extracted frames: `projects/cutting-fruit/storyboard`
- Grid: 4 columns x 3 rows. The user-facing prompt said `3 x 4`; the available source image is a 4-column by 3-row storyboard.

## User Request

Animate a cartoon woman cutting fruit in a bright kitchen and add clean comic speech bubbles. Use the storyboard as a lighthouse only; do not paste, trace, sample, or hide the source bitmap in the final canvas. Remove panel numbers, panel borders, and guide marks. Use waxy crayon color fills with black ink outlines and procedural material strokes.

## Required Output

- Final deliverable: browser animation at `/?project=cutting-fruit` plus rendered PNG frames in `projects/cutting-fruit/outputs/frames`.
- Animation length / pacing: 90 frames at 12 fps, about 7.5 seconds, with 12 source-story beats.
- Video format: no MP4 is registered yet; frame render is required for this pass.
- Browser route for review: local Vite app from this `inky/` folder.

## Visual Style

- Medium: wax-crayon and oil-crayon color with black ink outlines, small technical-pen detail, and graphite pencil shadows.
- Material kit: `wax-crayon` / `oil-crayon` for fruit, shirt, apron, counter, and bowl color; `dip-ink` / `brush-pen` for contours, hair curls, cloth folds, and local motion ticks; `technical-pen` for eyes, knife edge, fruit seeds, fingers, and bowl rim; `graphite-pencil` for cutting-board scratches and contact shadows.
- Line quality: imperfect, lively black ink; no clean vector icon style.
- Palette: warm cream paper, blue rolled-sleeve shirt, cream apron, brown hair in a loose bun, warm wooden counter and cutting board, white ceramic bowl, red strawberries/apples, green grapes/kiwi, orange segments, pink watermelon, blue berries, and a sunny kitchen background.
- Texture density: visible wax and pencil strokes with paper-tooth gaps. Speckle-only texture is not enough.
- Reference/lighthouse rule: source panels guide pose, contact, scale, and story timing only. Final canvas contains no source bitmap.
- Storyboard cleanup: remove all black panel borders, panel numbers, crop edges, and guide marks.

## Character And Identity Anchors

- Character identity: one adult cartoon woman preparing fruit salad in a bright kitchen.
- Head / hair: warm brown loose bun with a few curls/fringe; head visibly connects through neck to shoulders.
- Face details: simple attached eyes, nose, cheeks, and mouth; features move with the head.
- Mouth / expression: focused while cutting, pleased when tasting, smiling while presenting.
- Clothing / body: blue rolled-sleeve shirt with a cream apron; torso leans over the counter for cutting and stands upright for presenting.
- Hands / limbs: arms and wrists attach through sleeves; knife hand grips handle; guide hand holds fruit safely; both hands support the bowl in the final shot.
- Safety/readability: knife must read as a kitchen knife, not a stray line; fingers stay separated from the blade through overlap and small knuckle marks.

## Recurring Props And Environment

- Primary props: cutting board, kitchen knife, large white salad bowl, smaller berry bowl, colander, spoon, fruit pieces.
- Fruit anchors: strawberries, grapes, apples, kiwi slices, orange segments, watermelon cubes, blueberries, and mixed fruit salad.
- Surface / setting: warm kitchen counter with window, sink/faucet in the washing beat, shelf/jars, potted herbs, and sunlight.
- Background: stable kitchen set; only tiny hand-drawn shimmer is allowed.
- Items that must be removed or changed: remove panel numbers, panel borders, source crop seams, and any storyboard-only marks.

## Speech Bubbles

- Speech bubbles are part of the artwork, not captions.
- Bubble fill: solid white with black outline.
- Tail ownership: every tail points at the woman’s mouth/head and never at fruit, knife, or bowl.
- Bubble placement: top corners or upper band only; keep hands, knife, fruit, and final bowl visible.
- Dialogue tone: short comic cooking comments tied to each action.

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
| 9 | Pouring grapes | Woman pours grapes into big bowl | Bowl supported; grapes fall into bowl | Falling fruit floats oddly | Use short falling clusters only |
| 10 | Stirring salad | Woman stirs full bowl with spoon | Hand -> spoon -> bowl; bowl rests on counter | Spoon disappears into fruit | Show rim and handle |
| 11 | Tasting | Woman lifts spoon to mouth | Bowl grounded; spoon touches mouth | Spoon/face detach | Pleasant tasting beat |
| 12 | Presenting salad | Woman holds large bowl toward viewer | Both hands support bowl; face visible | Bowl floats, hands hidden | Final smiling hold |

## Validation Gates

- Construction blueprint reviewed before detailed rendering.
- Still frames pass semantic clarity review.
- Adjacent frames pass consistency review.
- Browser check confirms source images are not visible in the final art.
- Speech bubbles wrap cleanly and tails point to the woman.
- Final frames render and play back.
