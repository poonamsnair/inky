# storyboard In-Between Plan

This plan turns key storyboard panels into a smoother handmade animation. Use the source frames as lighthouses and redraw bridge frames; do not rely on crossfades alone.

## Timing

- FPS: 12
- Key-frame hold: 2 frame(s)
- Base in-betweens per transition: 5
 - Total video frames: 80
- Estimated duration: 6.67 seconds
- Loop final scene to first scene: no
- Machine timing: each in-between keeps legacy `t`/`linearT`, adds `motionT` for spatial anchor interpolation, and keeps `easedT` for effect accents such as settle or bounce.

## Layer Locking

- Locked set layers: paper grain, panel border, wall notes/posters, table/desk, static background lighting
- Anchored props/layers: laptop, mug, notebooks, papers, phone, lamp, plant, recurring desk props
- Animated layers: head, torso, shoulders, arms, wrists, hands, facial expression, hair droop, dream/sleep/motion marks

## Transition Schedule

| Transition | In-betweens | Easing | Timing Feel | Action Change | Clarity Risks |
|---|---:|---|---|---|---|
| 1 -> 2 | 5 | ease-in-out | slow start, quicker middle, slow settle | Client enters holding a box of papers at Tax Solutions door -> Accountant at desk responds warmly | Papers hide hands; Bubble tail points to wrong speaker |
| 2 -> 3 | 6 | settle | overshoot-and-settle; clamp before using as a spatial interpolation | Accountant at desk responds warmly -> Client explains friend advice | Bubble tail points to wrong speaker; Text too large |
| 3 -> 4 | 5 | ease-in-out | slow start, quicker middle, slow settle | Client explains friend advice -> Accountant thinks | Text too large; Thought bubble mistaken for speech |
| 4 -> 5 | 5 | ease-out | fast pickup, gentle arrival | Accountant thinks -> Client insists | Thought bubble mistaken for speech; Finger floats |
| 5 -> 6 | 5 | ease-in-out | slow start, quicker middle, slow settle | Client insists -> Accountant writes OFF on a document | Finger floats; Scribble marks clutter |
| 6 -> 7 | 5 | ease-out | fast pickup, gentle arrival | Accountant writes OFF on a document -> Accountant labels calculator/mug context | Scribble marks clutter; OFF label unclear |
| 7 -> 8 | 5 | ease-in-out | slow start, quicker middle, slow settle | Accountant labels calculator/mug context -> Accountant labels framed picture and stack | OFF label unclear; Notes float without contact |
| 8 -> 9 | 5 | ease-out | fast pickup, gentle arrival | Accountant labels framed picture and stack -> Office covered in OFF notes; client confused | Notes float without contact; Too many notes hide faces |
| 9 -> 10 | 5 | ease-in-out | slow start, quicker middle, slow settle | Office covered in OFF notes; client confused -> Client objects at messy desk | Too many notes hide faces; Bubble covers accountant |
| 10 -> 11 | 5 | ease-out | fast pickup, gentle arrival | Client objects at messy desk -> Accountant answers with marker raised | Bubble covers accountant; Marker looks like knife |
| 11 -> 12 | 5 | bounce | impact or bounce effect timing; use motionT for spatial anchors and easedT for local bounce accents | Accountant answers with marker raised -> Auditor appears; client panic line lands | Marker looks like knife; Punchline bubble hides auditor |

## Drawing Notes

- Reuse locked set layers during bridge frames so posters, walls, table, and static lighting do not swim.
- Keep anchored props in stable positions unless the story says they move.
- Interpolate animated anchors first: head, torso, shoulders, forearms, wrists, hands, expression, and story-critical marks.
- Keep face details attached to the head.
- Keep hands attached through wrist, forearm, and sleeve.
- Keep props attached to the desk or hand.
- Redraw ink and watercolor texture mainly on moving forms so the result feels handmade without making the whole set jitter.
- Use motion marks only after body attachment is clear.
