# stickman-tax-writeoffs-comic Requirements

This document holds storyboard-specific decisions for the current run. Keep reusable process rules in skills; keep concrete character, prop, style, and frame details here.

## Source

- Storyboard image: `projects/stickman-tax-writeoffs-comic/image/storyboard_input.png`
- Extracted frames: `projects/stickman-tax-writeoffs-comic/storyboard`
- Grid: 4 columns x 3 rows

## User Request

Create a new stick man animation with comic speech bubbles. The story is a tax-office joke: a worried client asks for help with taxes and wants more write-offs, the accountant takes the phrase too literally and labels everything `OFF`, then an auditor arrives while the client says, "I'M WRITING THIS OFFICE OFF."

Before building the animation, add reusable skill and tool support for speech bubbles with text.

## Required Output

- Final deliverable: browser animation and rendered MP4 after the bubble tooling is ready.
- Animation length / pacing: 12 key comic beats; exact frame count to be decided during animation planning.
- Video format: MP4 rendered from canvas frames.
- Browser route for review: local Vite app from this `inky/` folder.

## Visual Style

- Medium: simple stick-man / cartoon tax-office comic with clean ink outlines, flat color, and light paper texture.
- Line quality: chunky black comic outlines, readable character silhouettes, simple round faces, stick limbs where appropriate.
- Palette: office beige walls, brown desk, blue client shirt, gray accountant suit, green mugs/plants, yellow `OFF` notes.
- Speech bubbles: part of the artwork. Use `src/speech-bubble-tools.js`; do not hand-place ad hoc text without the reusable bubble layer.
- Reference/lighthouse rule: source panels guide story, dialogue, pose, contact, scale, and office layout only. Final canvas contains no source bitmap.
- Storyboard cleanup: remove black panel borders, crop seams, and any source-only marks. Keep dialogue text as intentional speech bubbles.

## Character And Identity Anchors

- Client: worried stick-man tax client with round head, sparse hair, blue shirt, black tie, anxious-to-confused expressions.
- Accountant: seated woman with dark bob hair, gray blazer, purple shirt, friendly and literal-minded expression.
- Tax auditor: stern figure entering at the end with glasses, dark suit, and `TAX AUDITOR` briefcase.
- Face details: simple black-dot eyes and clear mouth shapes; expressions must match the joke beat.
- Hands / limbs: stick arms attach to shoulders; hands point, write, hold papers, or react clearly.
- Speech ownership: every bubble tail points at the correct speaker or thought owner.

## Recurring Props And Environment

- Primary props: tax-solution door, client papers/box, accountant desk, monitor, calculator, receipts box, green mug, files, piles of papers, many yellow `OFF` notes, tax auditor briefcase.
- Surface / setting: accountant office with desk, chair, wall frames/certificates, plant, and shelves.
- Text props: `OFF`, `ACCOUNTANT`, `TAX SOLUTIONS`, and `TAX AUDITOR` are allowed as intentional joke props. Avoid tiny unreadable clutter text elsewhere.
- Items that must be removed or changed: panel borders and panel numbers must not appear in the animated frame.

## Frame Requirements

| # | Action / pose | Dialogue / text | Attachment chains | Semantic risks | Notes |
|---|---|---|---|---|---|
| 1 | Client enters holding a box of papers at Tax Solutions door | "I NEED HELP WITH MY TAXES." | Head -> torso -> stick legs; arms hold paper box | Papers hide hands | Establish client worry |
| 2 | Accountant at desk responds warmly | "NO PROBLEM. WHAT'S THE GOAL?" | Accountant seated; hand near keyboard/mouse | Bubble tail points to wrong speaker | Nameplate reads ACCOUNTANT |
| 3 | Client explains friend advice | "MY FRIEND SAID I NEED MORE WRITE-OFFS." | Client fists/arms attached; chair/background stable | Text too large | Keep client hopeful |
| 4 | Accountant thinks | "MORE... WRITE-OFFS?" | Hand to chin; thought bubble dots near head | Thought bubble mistaken for speech | Use thought bubble type |
| 5 | Client insists | "YES. AS MANY AS POSSIBLE." | Pointing finger attaches to arm | Finger floats | Clear eager pose |
| 6 | Accountant writes OFF on a document | `SCRIBBLE SCRIBBLE`, `OFF` on paper | Hand -> marker -> paper | Scribble marks clutter | Local sound text allowed |
| 7 | Accountant labels calculator/mug context | `OFF` on mug/calculator area | Marker hand contacts desk area | OFF label unclear | Build the literal gag |
| 8 | Accountant labels framed picture and stack | `OFF` labels visible | Marker hand near frame; papers grounded | Notes float without contact | More OFF notes appear |
| 9 | Office covered in OFF notes; client confused | "UH..." plus many `OFF` notes | Client hand near face; accountant seated | Too many notes hide faces | Keep faces readable |
| 10 | Client objects at messy desk | "I DON'T THINK THAT'S WHAT A WRITE-OFF IS." | Client gesture attaches to shoulder | Bubble covers accountant | Let desk clutter carry joke |
| 11 | Accountant answers with marker raised | "THEN WHY IS IT CALLED A WRITE-OFF?" | Marker hand -> arm -> shoulder | Marker looks like knife | Keep friendly expression |
| 12 | Auditor appears; client panic line lands | "I'M WRITING THIS OFFICE OFF." | Auditor stands in doorway; client sweats; accountant calm | Punchline bubble hides auditor | Final joke hold |

## Validation Gates

- `comic-speech-bubble-tooling` used for dialogue bubbles.
- Speech bubble JSON generated before animation build.
- Bubble tails point to the intended speaker in every beat.
- Text wraps without clipping; all punchline text is readable.
- Construction blueprint reviewed before detailed rendering.
- Still frames pass semantic clarity review.
- Adjacent frames pass consistency review.
- First-pass render gets an `animation-polish-pass` review before final MP4 export.
- Polish pass checks the current known risks: wrong bubble owner, curved decorative/nameplate borders, blob hair, disconnected stick limbs, and clutter hiding the joke.
- Browser check confirms source images are not visible in the final art.
- Final video renders and plays back.
