# storyboard In-Between Plan

This plan turns key storyboard panels into a smoother handmade animation. Use the source frames as lighthouses and redraw bridge frames; do not rely on crossfades alone.

## Timing

- FPS: 12
- Key-frame hold: 2 frame(s)
- Base in-betweens per transition: 5
 - Total video frames: 79
- Estimated duration: 6.58 seconds
- Loop final scene to first scene: no
- Machine timing: each in-between keeps legacy `t`/`linearT`, adds `motionT` for spatial anchor interpolation, and keeps `easedT` for effect accents such as settle or bounce.

## Layer Locking

- Locked set layers: paper grain, panel border, wall notes/posters, table/desk, static background lighting
- Anchored props/layers: laptop, mug, notebooks, papers, phone, lamp, plant, recurring desk props
- Animated layers: head, torso, shoulders, arms, wrists, hands, facial expression, hair droop, dream/sleep/motion marks

## Transition Schedule

| Transition | In-betweens | Easing | Timing Feel | Action Change | Clarity Risks |
|---|---:|---|---|---|---|
| 1 -> 2 | 5 | ease-in-out | slow start, quicker middle, slow settle | Fruit selection -> Washing fruit | Fruit clutter hides hands; Water/colander unclear |
| 2 -> 3 | 5 | ease-out | fast pickup, gentle arrival | Washing fruit -> Prepping board | Water/colander unclear; Board floats |
| 3 -> 4 | 5 | ease-in-out | slow start, quicker middle, slow settle | Prepping board -> Slicing strawberries | Board floats; Knife/fingers merge |
| 4 -> 5 | 5 | ease-out | fast pickup, gentle arrival | Slicing strawberries -> Peeling/slicing orange | Knife/fingers merge; Orange peel becomes random ribbons |
| 5 -> 6 | 5 | ease-in-out | slow start, quicker middle, slow settle | Peeling/slicing orange -> Slicing apple | Orange peel becomes random ribbons; Apple wedges look like loose triangles |
| 6 -> 7 | 5 | ease-out | fast pickup, gentle arrival | Slicing apple -> Slicing kiwi | Apple wedges look like loose triangles; Kiwi seeds overtexture |
| 7 -> 8 | 5 | ease-in-out | slow start, quicker middle, slow settle | Slicing kiwi -> Cubing watermelon | Kiwi seeds overtexture; Cubes become bricks |
| 8 -> 9 | 5 | bounce | impact or bounce effect timing; use motionT for spatial anchors and easedT for local bounce accents | Cubing watermelon -> Pouring grapes | Cubes become bricks; Falling fruit floats oddly |
| 9 -> 10 | 5 | bounce | impact or bounce effect timing; use motionT for spatial anchors and easedT for local bounce accents | Pouring grapes -> Stirring salad | Falling fruit floats oddly; Spoon disappears into fruit |
| 10 -> 11 | 5 | ease-out | fast pickup, gentle arrival | Stirring salad -> Tasting | Spoon disappears into fruit; Spoon/face detach |
| 11 -> 12 | 5 | ease-in-out | slow start, quicker middle, slow settle | Tasting -> Presenting salad | Spoon/face detach; Bowl floats, hands hidden |

## Drawing Notes

- Reuse locked set layers during bridge frames so posters, walls, table, and static lighting do not swim.
- Keep anchored props in stable positions unless the story says they move.
- Interpolate animated anchors first: head, torso, shoulders, forearms, wrists, hands, expression, and story-critical marks.
- Keep face details attached to the head.
- Keep hands attached through wrist, forearm, and sleeve.
- Keep props attached to the desk or hand.
- Redraw ink and watercolor texture mainly on moving forms so the result feels handmade without making the whole set jitter.
- Use motion marks only after body attachment is clear.
